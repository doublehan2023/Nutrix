"""Onboard CGMacros participants into the deployed service as patients `cgmacros-<id>`.

For each participant: upload the week-1 meal photos, POST /history (week 1), then POST /signals with all later CGM and
heart rate, so a prediction can be made at any later time in the record (a prediction only sees data up to its meal
time). Re-running replaces the patient's history. Optionally predicts one photo for every patient at the same moment
of their study (day/time) to compare responses.

usage: PMRF_API_KEY=... python -I ops/data/onboard_patients.py <url> <CGMacros dir> <id> [<id> ...]
       [--compare-photo tests/integration/hospital_meals/korea_snuh_evening_meal.jpg --day 8 --time 12:30]
"""
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "model"))
import httpx
import numpy as np
import pandas as pd
from pmrf.data import load_cgmacros

ap = argparse.ArgumentParser()
ap.add_argument("url"); ap.add_argument("data"); ap.add_argument("ids", nargs="+")
ap.add_argument("--compare-photo"); ap.add_argument("--day", type=int, default=8); ap.add_argument("--time", default="12:30")
a = ap.parse_args()

c = httpx.Client(base_url=a.url.rstrip("/"), timeout=300, headers={"x-api-key": os.environ["PMRF_API_KEY"]})
ts = lambda t: pd.Timestamp(t).strftime("%Y-%m-%dT%H:%M:%S")
num = lambda v: None if v is None or not np.isfinite(v) else float(v)


def call(method, path, **kw):
    r = c.request(method, path, **kw)
    if r.status_code != 200:
        raise RuntimeError(f"{method} {path}: {r.status_code} {r.text[:300]}")
    return r.json()


def upload(pid, path):
    with open(path, "rb") as fh:
        return call("POST", f"/v1/people/{pid}/photos", files={"file": (Path(path).name, fh.read(), "image/jpeg")})["photo_key"]


people = load_cgmacros(a.data)
rows = []
for sid in a.ids:
    p, pid = people[sid], f"cgmacros-{sid}"
    end7 = p.t0 + pd.Timedelta(days=7, hours=3)
    cg, hr = p.cgm.dropna(), p.hr.dropna()
    m7 = p.meals[p.day(p.meals.time) <= 7]
    keys = {ph: upload(pid, ph) for ph in m7.photo.dropna()}
    h = call("POST", f"/v1/people/{pid}/history", json=dict(
        start_time=ts(p.t0),
        cgm=[dict(timestamp=ts(t), glucose_mgdl=float(v)) for t, v in cg[cg.index < end7].items()],
        hr=[dict(timestamp=ts(t), hr_bpm=float(v)) for t, v in hr[hr.index < end7].items()],
        meals=[dict(timestamp=ts(r.time), meal_type=r.meal_type, photo_key=keys.get(r.photo), carbs_g=num(r.carbs),
                    protein_g=num(r.protein), fat_g=num(r.fat), fiber_g=num(r.fiber)) for r in m7.itertuples()]))
    s = call("POST", f"/v1/people/{pid}/signals", json=dict(
        cgm=[dict(timestamp=ts(t), glucose_mgdl=float(v)) for t, v in cg[cg.index >= end7].items()],
        hr=[dict(timestamp=ts(t), hr_bpm=float(v)) for t, v in hr[hr.index >= end7].items()]))
    row = dict(patient=pid, group=p.meta.get("group"), usable_meals=h["usable_meals"], photos=len(keys),
               cgm_until=ts(cg.index.max()), warnings="; ".join(h.get("warnings") or []))
    if a.compare_photo:
        mt = p.t0.normalize() + pd.Timedelta(days=a.day - 1) + pd.Timedelta(a.time + ":00")
        r = call("POST", f"/v1/people/{pid}/predict",
                 json=dict(photo_key=upload(pid, a.compare_photo), meal_time=ts(mt), log_meal=False))
        pr = r["prediction"]
        row.update(meal_time=ts(mt), pre_meal=r["pre_meal_state"]["glucose_mgdl"], peak=pr["peak_glucose_mgdl"],
                   rise=pr["peak_rise_mgdl"], p_gt140=pr["prob_peak_above_mgdl"]["140"], confidence=r["confidence"]["level"])
    rows.append(row)
    print(f"{pid}: {h['usable_meals']} usable meals, {len(keys)} photos, signals {s.get('stored')}", flush=True)

pd.set_option("display.width", 250, "display.max_colwidth", 50)
print(pd.DataFrame(rows).to_string(index=False))
