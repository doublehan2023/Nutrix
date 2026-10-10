# M2 Medication Inference Add-on · `MedicationModule`

> Spec: `MODULE_medication_inference.md`
> Code: `src/ehrrn/modules/medication_module.py` (public API), `src/ehrrn/medication/` (implementation)
> Status: runs end to end and has been validated on semi-synthetic data. Real medication datasets (ShanghaiT2DM, AZT1D,
> HUPA-UCM) are downloaded but not yet wired in.

---

## 1. What it does

The module first gets the expected post-meal curve: what the meal would do without any medication. It then measures
how far the actual CGM curve departs from it. A departure that matches the dose timing and has the expected direction is
read as a drug signal. The module **only appends fields. It never changes the main prediction.**

| Function | Output field | Audience |
|---|---|---|
| Drug activity at the meal | `active_at_meal` | patient (plain language), clinician |
| Personal drug effect on the post-meal rise | `personal_effect` | clinician, profile |
| Medication consistency (possible missed dose) | `consistency` | clinician only, worded "please verify" |
| Drug-class recognition | `class_signature` | clinician, data QC |
| Carb fusion (meal-time insulin only) | `carb_fusion` | prediction input |

## 2. Place in the workflow

```
S0 clean CGM / meals / meds ──► meals.py   meal windows (-30 … +240 min, 5-min grid)
                                     │
   drug-free expected model ◄────────┤    PMRF (S6) once built; BaselineExpected until then
                                     ▼
  medication log ─► pk.py activity ─► analysis.py  residuals / within-person effect / HMM / shape features
                                     │
                                     ├─► fusion.py  insulin-to-carb ratio + carb fusion
                                     ▼
                             api.py  "medication" block ──► predictions.json (S7/S8)
                                                       └─► profile.json (clinician profile)
```

- **Attaches:** after S6/S7, before S8.
- **Reads:** S0 CGM, meals and medication tables, plus the expected model.
- **Writes:** only `processed/m2_medication/`.

## 3. Run process, step by step

### 3.0 One-time setup
1. **PK table** (`pk.PK_PARAMS`)
   - Covers 13 drug classes.
   - Each class has tmax, half-life, duration, reference dose, mechanism and source.
   - Values approximate the FDA labels and are marked `verified=False` until checked against DailyMed.
   - Exported to `pk_table.csv` for the knowledge base.
2. **Class-signature classifier** (`signature_model.joblib`)
   - Trained on semi-synthetic data by `benchmark` and saved there.

### 3.1 Drug name → class (spec 4.1)
`normalize_drug(name)` maps a drug name to a class:
- It first checks a local alias table, and the longest match wins ("metformin XR" → `metformin_xr`).
- With `online=True` it falls back to RxNav/RxClass and maps the ATC code. Results are cached as JSON.

### 3.2 Meal windows
- `merge_meals` merges photos taken within 25 min into one meal.
- `meal_windows` cuts −30 to +240 min around each meal on a 5-min grid:
  - Gaps of 15 min or less are linearly interpolated.
  - Meals with more than 10% missing are dropped.
- Each meal gets `pre_glucose`, `pre_slope`, time of day, minutes since the previous meal, and a 49-point increment
  curve (actual minus pre-meal glucose).

### 3.3 Drug activity at each meal (4.1)
`logged_activity` computes activity per meal from the logged doses:

| Drug type | How activity is computed |
|---|---|
| Oral or daily injectable | One-compartment Bateman curve (ka solved from tmax); doses summed and capped at 1.5 |
| Weekly GLP-1 RA | 1 while in use, plus days since the injection |
| Meal-time insulin | Units bolused in the 30 min before the meal |

Each meal also gets `hours_since_dose`. Activity is computed from the **logged** doses, so a missed dose still counts as
active. This is what the consistency check relies on.

### 3.4 Drug-free expected curve (4.2)
Any model can plug in if it provides `fit / predict / expected_pre`. The current stand-in is `BaselineExpected`:
- **Model:** ridge regression of the increment curve on nutrients, carbs², carbs × fiber, pre-meal glucose and slope,
  time of day, and minutes since the previous meal.
- **Training data:** the CGMacros healthy and prediabetes cohort, which has no medication log.
- **Personal drug-free baseline:** median pre-meal glucose over the person's low-activity meals (activity < 0.1, at
  least 3 meals). If there are too few, the population value is used.

### 3.5 Residuals (4.3)
`residuals` computes the residual curve = actual increment − expected increment, point by point over 0–240 min. Each
meal is summarised by:

| Metric | Meaning |
|---|---|
| `r_peak` | change in the post-meal rise |
| `r_pre` | baseline shift |
| `r_early` / `r_mid` / `r_late` | mean residual over 0–60, 60–120 and 150–240 min |
| `t_peak_shift` | peak delay |
| `descent` | descent speed |

`event_aligned` averages the residuals in bins of hours since dose. The result is the person's drug-response curve.

### 3.6 Personal drug effect (4.3)
- **Regression:** `within_person_effect` regresses `r_peak` on activity within one person, with carbs as a covariate so
  the drug effect is separated from carb sensitivity. The CI comes from 300 bootstrap resamples.
- **Why within-person only:** this avoids the confound that people on medication tend to be sicker.
- **Shrinkage:** `shrink` applies empirical-Bayes shrinkage toward 0. The between-person variance τ² is estimated by
  the method of moments.
- **Output:** `personal_effect`, in mg/dL change in the post-meal rise at activity 1.

### 3.7 Consistency (4.3)
`hmm_on_probability` runs a two-state HMM (drug acting / not acting) over each person's meals in time order:

| Part | Setting |
|---|---|
| Observation | `r_level` = baseline shift + mean post-meal residual |
| Emission when acting | N(β·a, σ) |
| Emission when not acting | N(0, σ) |
| Transition | 0.8 probability of staying in the same state |

Forward–backward gives P(acting) for each meal. For meals with logged activity a ≥ 0.2, `p_inconsistent` = 1 − P(acting).

### 3.8 Class signature (4.4)
- **Features:** `signature_features` builds 9 shape features per person as (high-activity meals) − (low-activity meals):
  - baseline shift, peak change, peak delay;
  - early, mid and late residuals, and late − mid;
  - descent change and log peak ratio.
  - If the person has no low-activity meals, an activity-weighted mean is used instead.
- **Classifier:** standardised logistic regression, trained on semi-synthetic data and cross-validated with GroupKFold
  by person.
- **Output:** `best_match` with class probabilities over GLP-1, sulfonylurea, SGLT2, insulin and metformin.

### 3.9 Carb fusion (4.5, only with meal-time insulin)
- `fit_icr` fits the personal insulin-to-carb ratio on days 1–7, after removing the correction dose,
  (pre-glucose − 120) / ISF.
- `fuse` combines three carb estimates by inverse error variance: photo, insulin-implied, and personal history.
- If photo and insulin disagree by more than 2.5 SD, the meal is flagged `possible_unseen_carbs` or
  `photo_may_overestimate`, and the SD is widened ×1.5.

### 3.10 Other explanations (4.6)
`alternatives` lists other possible causes from the residual direction and supporting evidence:

| Evidence | Cause listed |
|---|---|
| Heart rate up | `activity` |
| Positive residual despite logged medication | `missed_dose`, `unlogged_food`, `illness_or_poor_sleep` |
| Slow drift across days | `sensor_drift` |

They are attached to `consistency.alternatives`.

### 3.11 Output assembly (5)
- `build_block` assembles the `medication` block and validates it against `schemas/medication.schema.json`.
- `patient_text` writes plain-language lines only for drugs with activity ≥ 0.2, e.g. "8 点服用的二甲双胍此时仍在起作用".

## 4. Interface

### Python
```python
from ehrrn.modules import MedicationModule
mm = MedicationModule(expected_model=None,                         # pass PMRF; if None call fit_reference
                      signature_model="data/processed/medication/signature_model.joblib")
mm.fit_reference(ref_meals, ref_increments)                        # drug-free reference cohort (no PMRF yet)
out = mm.analyze(meals, increments, meds, train_days=range(1, 8))
out["blocks"]["P01_k3"]["medication"]      # block appended to predictions.json
out["blocks"]["P01_k3"]["patient_text"]    # patient-facing lines
out["persons"]                             # per person: effect / effect_shrunk / CI / signature / icr
out["residuals"]                           # per-meal residual table
```

**`meals` columns**
- Required: pid, meal_id, ts, day, hour, pre_glucose, pre_slope, carb_g, protein_g, fat_g, fiber_g,
  min_since_prev_meal.
- Optional: `carb_err_sd` (photo error from S2), `hr_post_rel` (heart-rate feature from S1).

**`meds` columns**
- Canonical table: pid, ts, drug, and optionally med_class and dose.
- A missing med_class is filled by `normalize_drug`.

### CLI (compute node)
```bash
ehrrn module run m2              # offline run on the configured source
ehrrn module benchmark m2        # semi-synthetic validation (= sbatch slurm/medication.sbatch --n-rep 10)
```

### Output files under `data/processed/`
| File | Content |
|---|---|
| `m2_medication/medication_blocks.json` | per-meal `medication` block + `patient_text` |
| `m2_medication/persons.csv` | per-person effect, CI, class signature, ICR |
| `m2_medication/pk_table.csv` | PK parameters and sources |
| `m2_medication/status.json` | written when the source has no medication records (e.g. CGMacros) |
| `medication/benchmark.json`, `persons.csv`, `signature_confusion.csv`, `fusion.csv`, `t2d_check.csv`, `example_block.json` | semi-synthetic validation |

Block example: `examples/medication_block.json`. Schema: `schemas/medication.schema.json`, also inlined in
`predictions.schema.json`.

## 5. Performance (semi-synthetic, `benchmark.json`)

**Setup**
- **Base data:** real post-meal curves of the CGMacros healthy and prediabetes cohort, 31 people and 1,146 meals.
- **Simulated medication:**
  - each person gets one class, or control (20%);
  - the effect size is drawn per person;
  - 15% of doses are logged but not taken (missed doses).
- **Expected model:** trained with a 2-fold split by person, so no one's own curves train their own expected model.
- **Replicates:** 10, giving 240 person-instances on medication.

| Check (spec §7) | Metric | Result | Verdict |
|---|---|---|---|
| Personal effect recovery | MAE (mg/dL, change in rise at activity 1) | raw 20.2 → **11.9 after shrinkage**; median error 11.1 | usable for the clinician view, only with the interval |
| | 95% CI coverage | **83%** (nominal 95%) | intervals too narrow; needs calibration |
| | MAE by class (shrunk) | insulin 6.1, metformin 12.0, sulfonylurea 11.9, GLP-1 12.5, SGLT2 15.8 | SGLT2 worst: it acts mostly on the baseline, so there is little signal in the rise |
| Separating drug effect from carb sensitivity | MAE of carb coefficient (insulin excluded) | with drug term 0.052 vs ignoring drug 0.030 | **not achieved**: adding the drug term makes it worse |
| Missed-dose detection | AUC | **0.56**; false-alarm rate 44% at threshold 0.5 | **essentially not working** |
| Class recognition | accuracy (cross-validated by person) | **52%** (chance 22%) | GLP-1 41/49 and SGLT2 28/48 are good; metformin is worst at 9/51, often called SGLT2 |
| Carb fusion | carb MAE (g) | photo only 17.4 → **fused 8.1** (−53%) | strongest result |

### Why, and what to do next
**Separation not achieved and missed-dose detection near chance**
- With chronic, regular dosing, a person's activity barely changes between meals. It varies only through time since the
  dose and the occasional missed dose, so the signal is weak.
- Next steps:
  - use the real dose times in ShanghaiT2DM;
  - use PMRF personal networks as the expected model, to cut residual noise;
  - model the HMM per day, and use heart rate to rule out exercise.

**Insulin: effect and carb sensitivity cannot be separated**
- The meal bolus equals carbs / ICR, so the drug term is collinear with carbs. This is mathematically unidentifiable, and
  insulin is left out of the separation metric.

**Effect sizes are assumptions**
- The semi-synthetic effect sizes come from literature assumptions. They only show that the method can separate an
  effect; they are not real effect sizes (spec §9).

## 6. Open items
1. Validate time alignment and class recognition on ShanghaiT2DM.
   - Data is in `data/external/shanghai_t2dm/`.
   - The medication fields are free text and need parsing first.
2. Validate ICR and carb fusion on AZT1D and HUPA-UCM.
   - Clean the outlier `Basal` values in AZT1D.
   - Check the unit of `basal_rate` in HUPA.
3. Replace `BaselineExpected` with PMRF.
4. Spec §7, last row ("effect on the main prediction"), needs S6/S7 first.
5. Check each PK parameter against DailyMed, then set `verified=True`.

## 7. Rules
- No diagnosis and no medication or dosing advice. An inferred medication state is never used to compute a dose.
- `consistency`, `class_signature` and `personal_effect` are shown on the clinician side only, worded "建议核对"
  (please verify). Patients see only `patient_text`.
- In production, user photos and data are processed in memory and not written to disk.
- Branches once the competition data arrives (spec §8):

  | Competition medication data | Steps used |
  |---|---|
  | Meal-time insulin present | 3.9 enabled |
  | Oral drugs only | 3.1–3.8 |
  | Classes only, no timing | between-person comparison, flagged as confounded |
