"""M2 — medication inference (MODULE_medication_inference.md). Public API:

    mm = MedicationModule(expected_model=pmrf_or_None)     # None -> BaselineExpected on drug-free reference
    mm.fit_reference(ref_meals, ref_increments)            # only needed without a PMRF expected model
    out = mm.analyze(meals, increments, meds)              # offline, on days 1-7
    out["blocks"][meal_id]                                  # "medication" block for predictions.json
    out["persons"]                                          # per-person effect / signature / ICR (clinician view)
    mm.run(cfg)                                             # offline on cfg.source -> processed/m2_medication/
    mm.benchmark(cfg, n_rep=10)                             # semi-synthetic validation (spec section 7)

`meals`: one row per meal with pid, meal_id, ts, day, hour, pre_glucose, pre_slope, carb_g, protein_g, fat_g,
fiber_g, min_since_prev_meal (+ optional carb_err_sd, hr_post_rel). `increments`: (n, 49) actual post-meal
increments 0..240 min. `meds`: canonical meds table (pid, ts, drug[, med_class, dose]).
The module never changes the main prediction; it only appends fields.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from ..config import Config
from ..medication import analysis as A
from ..medication.api import build_block, patient_text
from ..medication.expected import BaselineExpected
from ..medication.fusion import fit_icr, fuse
from ..medication.meals import cgm_series, increments as meal_increments, meal_windows, merge_meals
from ..medication.pk import normalize_drug, pk_table
from ..medication.run import load_meals, logged_activity, tod
from .base import AddOnModule, ModuleInfo

INFO = ModuleInfo(
    key="m2", name="medication",
    spec="MODULE_medication_inference.md",
    attaches_to="after S6/S7 (PMRF expected curves) → S8 explanation; predictions.json + profile.json",
    inputs=["interim/canonical/{source}/meds.parquet", "interim/canonical/{source}/meal_photos.parquet",
            "interim/canonical/{source}/cgm.parquet"],
    outputs=["processed/m2_medication/medication_blocks.json", "processed/m2_medication/persons.csv"],
    contributes={"predictions.json": "medication {active_at_meal, personal_effect, consistency, class_signature, carb_fusion}",
                 "profile.json": "medication {classes, personal_effect, class_signature}"},
    notes=["clinician-only: consistency, class_signature, personal_effect (spec 5, 9)",
           "no diagnosis, no dosing advice; adherence wording '建议核对'"],
)


class MedicationModule(AddOnModule):
    info = INFO

    def __init__(self, expected_model=None, signature_model: str | Path | None = None):
        self.expected = expected_model
        self._sig_path = signature_model
        self._sig = None

    # -- set-up -------------------------------------------------------------
    def fit_reference(self, ref_meals: pd.DataFrame, ref_inc: np.ndarray) -> "MedicationModule":
        """Drug-free expected model (stand-in for PMRF): CGMacros healthy + prediabetes by default."""
        self.expected = BaselineExpected().fit(ref_meals, ref_inc)
        return self

    def signature(self):
        if self._sig is None and self._sig_path and Path(self._sig_path).exists():
            import joblib
            self._sig = joblib.load(self._sig_path)
        return self._sig

    # -- core ---------------------------------------------------------------
    def analyze(self, meals: pd.DataFrame, inc: np.ndarray, meds: pd.DataFrame, train_days=range(1, 8)) -> dict:
        if self.expected is None:
            raise RuntimeError("no expected model: pass a PMRF model or call fit_reference()")
        meals = meals.reset_index(drop=True)
        meds = meds.copy()
        if "med_class" not in meds or meds["med_class"].isna().any():
            meds["med_class"] = meds.get("med_class", pd.Series(index=meds.index, dtype=object))
            miss = meds["med_class"].isna()
            meds.loc[miss, "med_class"] = meds.loc[miss, "drug"].map(normalize_drug)
        if "dose" not in meds:
            meds["dose"] = np.nan
        a, h, active = logged_activity(meals, meds)
        if hasattr(self.expected, "calibrate_person"):
            self.expected.calibrate_person(meals, a)
        e_inc = self.expected.predict(meals)
        res = A.residuals(meals, inc, e_inc, self.expected.expected_pre(meals))
        res["a"] = a
        res["r_level"] = res["r_pre"] + np.stack(res["r_curve"].to_numpy()).mean(1)
        sig = self.signature()
        persons, p_inc = [], np.full(len(meals), np.nan)
        for pid, g in res.groupby("pid"):
            idx = g.index.to_numpy()
            ga = g["a"].to_numpy()
            carbs = meals.loc[idx, "carb_g"].fillna(0).to_numpy()
            on_drug = ga.max() > 0
            eff = A.within_person_effect(g["r_peak"].to_numpy(), ga, covars=carbs) if on_drug else \
                {"effect": np.nan, "ci": [np.nan, np.nan], "identifiable": False}
            rec = {"pid": pid, "on_logged_medication": bool(on_drug), "effect": eff["effect"],
                   "ci_lo": eff["ci"][0], "ci_hi": eff["ci"][1], "identifiable": eff.get("identifiable", False),
                   "classes": sorted({x["class"] for i in idx for x in active[i]})}
            if on_drug:
                order = np.argsort(g["ts"].to_numpy())
                lvl = A.within_person_effect(g["r_level"].to_numpy(), ga, covars=carbs, n_boot=0)
                beta = lvl["effect"] if np.isfinite(lvl["effect"]) else -10.0
                p_on = np.empty(len(g))
                p_on[order] = A.hmm_on_probability(g["r_level"].to_numpy()[order], ga[order], min(beta, -1.0),
                                                   float(np.std(g["r_level"])) or 10.0)
                p_inc[idx] = np.where(ga >= 0.2, 1 - p_on, np.nan)
                if sig is not None:
                    f = A.signature_features(g, ga, inc[idx], e_inc[idx])
                    x = np.array([[f[c.removeprefix("sig_")] for c in sig["cols"]]], float)
                    if np.isfinite(x).all():
                        pr = dict(zip(sig["model"].classes_, sig["model"].predict_proba(x)[0]))
                        rec["signature"] = {"best_match": max(pr, key=pr.get), "p": max(pr.values()), "probs": pr}
                if any(x["class"] == "insulin_rapid" for i in idx for x in active[i]):
                    tr = np.isin(meals.loc[idx, "day"], list(train_days))
                    rec["icr"] = fit_icr(ga[tr], carbs[tr], meals.loc[idx[tr], "pre_glucose"].to_numpy())
            persons.append(rec)
        P = pd.DataFrame(persons)
        if len(P):
            P["effect_shrunk"] = A.shrink(P["effect"], P["ci_lo"], P["ci_hi"])
        blocks = {}
        hist = meals.assign(tod=tod(meals["hour"].to_numpy())).groupby(["pid", "tod"])["carb_g"].agg(["mean", "std"])
        for i, r in meals.iterrows():
            pr = P.set_index("pid").loc[r.pid] if len(P) else None
            effect = None
            if pr is not None and np.isfinite(pr.get("effect_shrunk", np.nan)):
                effect = {"effect": pr["effect_shrunk"], "ci": [pr["ci_lo"], pr["ci_hi"]]}
            carb = None
            icr = pr.get("icr") if pr is not None and isinstance(pr.get("icr"), dict) else None
            if icr and np.isfinite(icr["icr"]) and a[i] > 0:
                c_p = float(r.carb_g)
                s_p = float(r.get("carb_err_sd", np.nan)) if "carb_err_sd" in meals else 0.25 * c_p + 8
                t = tod(np.array([r.hour]))[0]
                c_h, s_h = (hist.loc[(r.pid, t), "mean"], max(np.nan_to_num(hist.loc[(r.pid, t), "std"], nan=20), 10)) \
                    if (r.pid, t) in hist.index else (np.nan, np.nan)
                carb = fuse(c_p, s_p, icr["icr"] * a[i], icr["sigma"], c_h, s_h)
            alts = A.alternatives(res.at[i, "r_peak"], res.at[i, "r_pre"], r.get("hr_post_rel"), a[i])
            blocks[r.meal_id] = {
                "medication": build_block(active[i], effect, p_inc[i] if np.isfinite(p_inc[i]) else None, alts,
                                          pr.get("signature") if pr is not None and isinstance(pr.get("signature"), dict) else None,
                                          carb),
                "patient_text": patient_text(active[i], r.ts.tz_convert("UTC") if hasattr(r.ts, "tz_convert") else None),
            }
        return {"blocks": blocks, "persons": P, "residuals": res}

    # -- offline entry points ---------------------------------------------------
    def run(self, cfg: Config) -> dict:
        od = self.out_dir(cfg)
        pk_table().to_csv(od / "pk_table.csv", index=False)
        cd = cfg.canonical_dir()
        meds = pd.read_parquet(cd / "meds.parquet")
        if self._sig_path is None:
            rel = cfg.raw.get("modules", {}).get("m2", {}).get("signature_model",
                                                               "processed/medication/signature_model.joblib")
            self._sig_path = cfg.data_root / rel
        if meds.empty:
            msg = {"status": "skipped", "reason": f"no medication records in source '{cfg['source']}'",
                   "branch": "spec section 8: wait for competition medication fields"}
            (od / "status.json").write_text(json.dumps(msg, indent=2))
            print(json.dumps(msg, indent=2))
            return msg
        if self.expected is None:                       # drug-free reference until PMRF exists
            ref, _ = load_meals(cfg)
            free = ref["metabolic_label"].isin(["healthy", "prediabetes"]).to_numpy()
            self.fit_reference(ref[free], meal_increments(ref)[free])
        photos = pd.read_parquet(cd / "meal_photos.parquet")
        m = merge_meals(photos, cfg["meals"]["merge_window_min"])
        W = meal_windows(m, cgm_series(pd.read_parquet(cd / "cgm.parquet")), cfg["timezone"])
        out = self.analyze(W, meal_increments(W), meds)
        (od / "medication_blocks.json").write_text(json.dumps(out["blocks"], indent=1, ensure_ascii=False, default=str))
        out["persons"].to_csv(od / "persons.csv", index=False)
        return {"status": "ok", "meals": len(out["blocks"]), "persons": len(out["persons"])}

    def benchmark(self, cfg: Config, n_rep: int = 10) -> dict:
        from ..medication.run import main
        return main(cfg, n_rep=n_rep)
