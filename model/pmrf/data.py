"""Standard per-person data model and dataset adapters.

Every dataset is converted to the same `Person` record so features, models and the API never see
dataset-specific columns. CGMacros is supported now; `load_challenge` documents the layout expected
for the hackathon's synthetic data.
"""
from dataclasses import dataclass, field
import os
import glob
import numpy as np
import pandas as pd

MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"]
MED_COLUMNS = ["time", "med_class", "dose"]


@dataclass
class Person:
    pid: str
    cgm: pd.Series          # mg/dL on a 1-min grid, linear between native sensor readings, NaN where no reading
    hr: pd.Series           # bpm on the same 1-min grid
    meals: pd.DataFrame     # time, meal_type, carbs, protein, fat, fiber, kcal, photo (absolute path or None)
    meds: pd.DataFrame      # time, med_class, dose (empty when the person takes no glucose-lowering drug)
    t0: pd.Timestamp        # record start; day 1 = [t0, t0 + 24 h)
    meta: dict = field(default_factory=dict)   # analysis-only labels, never model inputs

    def day(self, t):
        """1-based study day of timestamp(s) t"""
        return (pd.to_timedelta(pd.Series(t) - self.t0).dt.total_seconds() // 86400).astype(int).to_numpy() + 1


def _norm_meal(x):
    s = str(x).strip().lower()
    return "snack" if s.startswith("snack") else s


def load_cgmacros(root):
    """CGMacros (PhysioNet v1.0.0). Uses Dexcom (5-min native) as the glucose stream to match the challenge."""
    bio = pd.read_csv(os.path.join(root, "bio.csv"))
    bio.columns = [c.strip() for c in bio.columns]
    a1c = {f"{int(r.subject):03d}": r["A1c PDL (Lab)"] for _, r in bio.iterrows()}
    persons = {}
    for f in sorted(glob.glob(os.path.join(root, "CGMacros-*", "CGMacros-*.csv"))):
        pid = os.path.basename(f)[9:12]
        d = pd.read_csv(f)
        d.columns = [c.strip() for c in d.columns]
        d["Timestamp"] = pd.to_datetime(d["Timestamp"])
        d = d.drop_duplicates("Timestamp").sort_values("Timestamp")
        grid = pd.date_range(d.Timestamp.iloc[0].floor("min"), d.Timestamp.iloc[-1].ceil("min"), freq="min")
        cgm = d.set_index("Timestamp")["Dexcom GL"].reindex(grid)
        hr = d.set_index("Timestamp")["HR"].reindex(grid)
        m = d[d["Meal Type"].notna()]
        carbs, prot, fat = m.Carbs.to_numpy(float), m.Protein.to_numpy(float), m.Fat.to_numpy(float)
        fiber = m.Fiber.to_numpy(float)
        fiber = np.where((fiber > 50) | (fiber > np.maximum(carbs, 1)), np.nan, fiber)   # known entry errors (#016, #019)
        photos = [os.path.join(root, f"CGMacros-{pid}", p) if isinstance(p, str) and os.path.exists(os.path.join(root, f"CGMacros-{pid}", p)) else None
                  for p in m["Image path"]]
        meals = pd.DataFrame(dict(time=m.Timestamp.to_numpy(), meal_type=m["Meal Type"].map(_norm_meal).to_numpy(),
                                  carbs=carbs, protein=prot, fat=fat, fiber=fiber, kcal=4 * carbs + 4 * prot + 9 * fat, photo=photos))
        a = a1c.get(pid, np.nan)
        group = "Healthy" if a < 5.65 else ("Prediabetes" if a <= 6.45 else "T2D")
        persons[pid] = Person(pid=pid, cgm=cgm, hr=hr, meals=meals.reset_index(drop=True),
                              meds=pd.DataFrame(columns=MED_COLUMNS), t0=d.Timestamp.iloc[0], meta=dict(a1c=a, group=group))
    return persons


def _meal_type_from_time(t, kcal):
    h = t.hour + t.minute / 60
    if kcal < 150:
        return "snack"
    if 5 <= h < 10.5:
        return "breakfast"
    if 10.5 <= h < 15:
        return "lunch"
    if 17 <= h < 22:
        return "dinner"
    return "snack"


def load_bigideas(root, prefix="B"):
    """BIG IDEAs Lab Glycemic Variability and Wearable Device Data (PhysioNet 1.1.3): Dexcom G6 (5-min), Empatica HR,
    food log with macros. No photos. Participant 003 is skipped: its food log has no header and only 11 of 14 columns,
    so the nutrient columns cannot be identified reliably."""
    demo = pd.read_csv(os.path.join(root, "Demographics.csv"))
    demo.columns = [c.strip().lstrip("﻿") for c in demo.columns]
    a1c = {f"{int(r.ID):03d}": float(r.HbA1c) for _, r in demo.iterrows()}
    persons = {}
    for d in sorted(glob.glob(os.path.join(root, "[0-9][0-9][0-9]"))):
        sid = os.path.basename(d)
        if sid == "003":
            continue
        dx = pd.read_csv(os.path.join(d, f"Dexcom_{sid}.csv"))
        dx = dx[dx["Event Type"] == "EGV"]
        tcol = [c for c in dx.columns if c.startswith("Timestamp")][0]
        ts = pd.to_datetime(dx[tcol])
        g = pd.to_numeric(dx["Glucose Value (mg/dL)"], errors="coerce")
        s = pd.Series(g.to_numpy(), index=ts.dt.floor("min")).groupby(level=0).mean().sort_index()
        grid = pd.date_range(s.index[0], s.index[-1], freq="min")
        cgm = s.reindex(grid).interpolate(limit=6, limit_area="inside")          # linear between 5-min readings, gaps stay NaN
        hp = os.path.join(d, f"HR_{sid}.csv")
        if os.path.exists(hp):
            h = pd.read_csv(hp)
            h.columns = [c.strip().lstrip("﻿") for c in h.columns]
            ht = pd.to_datetime(h["datetime"], format="%m/%d/%y %H:%M", errors="coerce")
            hr = pd.Series(pd.to_numeric(h["hr"], errors="coerce").to_numpy(), index=ht).groupby(level=0).mean().reindex(grid)
        else:
            hr = pd.Series(np.nan, index=grid)
        f = pd.read_csv(os.path.join(d, f"Food_Log_{sid}.csv"))
        f["t"] = pd.to_datetime(f["time_begin"], errors="coerce")
        f = f.dropna(subset=["t"])
        num = lambda c: pd.to_numeric(f[c], errors="coerce").fillna(0)
        f = f.assign(carbs=num("total_carb"), protein=num("protein"), fat=num("total_fat"), fiber=num("dietary_fiber"))
        m = f.groupby("t")[["carbs", "protein", "fat", "fiber"]].sum().reset_index()
        m["kcal"] = 4 * m.carbs + 4 * m.protein + 9 * m.fat
        m = m[(m.t >= grid[0]) & (m.t <= grid[-1])]
        meals = pd.DataFrame(dict(time=m.t.to_numpy(), meal_type=[_meal_type_from_time(t, k) for t, k in zip(m.t, m.kcal)],
                                  carbs=m.carbs.to_numpy(), protein=m.protein.to_numpy(), fat=m.fat.to_numpy(),
                                  fiber=m.fiber.to_numpy(), kcal=m.kcal.to_numpy(), photo=None))
        a = a1c.get(sid, np.nan)
        persons[prefix + sid] = Person(pid=prefix + sid, cgm=cgm, hr=hr, meals=meals.reset_index(drop=True),
                                       meds=pd.DataFrame(columns=MED_COLUMNS), t0=grid[0],
                                       meta=dict(a1c=a, group="Healthy" if a < 5.65 else "Prediabetes", source="bigideas"))
    return persons


def load_challenge(root):
    """Adapter for the hackathon's synthetic data (format not released yet).

    Expected per participant folder `<root>/<pid>/`:
      cgm.csv    timestamp, glucose_mgdl              (every 5 min)
      hr.csv     timestamp, hr_bpm[, resting_hr_bpm]
      meals.csv  timestamp, meal_type, photo_file[, carbs_g, protein_g, fat_g, fiber_g, kcal]   (nutrition blank on day 8)
      meds.csv   timestamp, med_class, dose
      photos/    meal images referenced by meals.csv
    Mapping the real files onto this layout is the only change needed to run the pipeline on them.
    """
    persons = {}
    for pdir in sorted(glob.glob(os.path.join(root, "*"))):
        if not os.path.isdir(pdir):
            continue
        pid = os.path.basename(pdir)
        c = pd.read_csv(os.path.join(pdir, "cgm.csv"), parse_dates=["timestamp"]).sort_values("timestamp")
        grid = pd.date_range(c.timestamp.iloc[0].floor("min"), c.timestamp.iloc[-1].ceil("min"), freq="min")
        cgm = c.set_index("timestamp").glucose_mgdl.reindex(c.timestamp.dt.floor("min")).groupby(level=0).mean().reindex(grid).interpolate(limit=6, limit_area="inside")
        h = pd.read_csv(os.path.join(pdir, "hr.csv"), parse_dates=["timestamp"])
        hr = h.set_index(h.timestamp.dt.floor("min")).hr_bpm.groupby(level=0).mean().reindex(grid)
        m = pd.read_csv(os.path.join(pdir, "meals.csv"), parse_dates=["timestamp"])
        meals = pd.DataFrame(dict(time=m.timestamp, meal_type=m.meal_type.map(_norm_meal),
                                  carbs=m.get("carbs_g"), protein=m.get("protein_g"), fat=m.get("fat_g"), fiber=m.get("fiber_g"),
                                  kcal=m.get("kcal"), photo=[os.path.join(pdir, "photos", p) for p in m.photo_file]))
        mp = os.path.join(pdir, "meds.csv")
        meds = pd.read_csv(mp, parse_dates=["timestamp"]).rename(columns={"timestamp": "time"}) if os.path.exists(mp) else pd.DataFrame(columns=MED_COLUMNS)
        persons[pid] = Person(pid, cgm, hr, meals, meds, c.timestamp.iloc[0])
    return persons
