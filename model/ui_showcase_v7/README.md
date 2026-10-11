# UI showcase data (model v7): 10 meals from 10 people with diabetes or prediabetes

Ten real meals, each from a different study participant: 5 with prediabetes and 5 with type 2 diabetes, aged 34 to 61, men
and women, BMI 25 to 46. No healthy participants. All meals come from days 8 and later, which the model never saw during
training. For each person we kept the one meal whose predicted glucose curve came closest to the real CGM curve.
`showcase_best_meals.png` shows all 10 at a glance.

The JSON is the real response of the live API (model `v7-20261010`), so screens built on these files work with the real
service unchanged.

## The 10 meals

Nutrition is carbs / protein / fat / fiber in g, then kcal. "Logged" is what the participant wrote in their food log;
"from photo" is what the model estimated from the photo alone. Peak rise is the highest glucose within 2 hours minus the
glucose at the start of the meal, in mg/dL.

| Meal ID | Person | Group | Sex, age, BMI | Meal | Logged nutrition | Nutrition from photo | Real peak rise | Predicted peak rise | Curve error |
|---|---|---|---|---|---|---|---|---|---|
| `011_1012_1854_dinner` | 011 | Prediabetes | M, 34, 29.2 | dinner | 108 / 33 / 31 / 0 / 850 | 88 / 31 / 27 / 6 / 720 | 59 | 48 | 10.8 |
| `016_0723_0738_breakfast` | 016 | Prediabetes | F, 48, 45.9 | breakfast | 24 / 22 / 10 / 0 / 268 | 67 / 28 / 32 / 0 / 674 | 34 | 35 | 7.0 |
| `008_0206_1224_lunch` | 008 | Prediabetes | M, 54, 39.9 | lunch | 40 / 76 / 17 / 13 / 585 | 27 / 44 / 16 / 10 / 424 | 38 | 42 | 4.9 |
| `041_0504_1856_dinner` | 041 | Prediabetes | F, 58, 27.9 | dinner | 67 / 89 / 32 / 5 / 919 | 39 / 23 / 26 / 3 / 487 | 96 | 90 | 15.3 |
| `044_1026_1224_lunch` | 044 | Prediabetes | F, 60, 35.9 | lunch | 94 / 44 / 20 / 4 / 725 | 83 / 25 / 28 / 10 / 688 | 73 | 72 | 7.1 |
| `039_0216_1205_lunch` | 039 | T2D | F, 45, 26.9 | lunch | 94 / 44 / 20 / 4 / 725 | 81 / 48 / 25 / 7 / 739 | 134 | 122 | 10.4 |
| `005_0825_1311_lunch` | 005 | T2D | F, 51, 31.0 | lunch | 43 / 20 / 20 / 13 / 445 | 25 / 34 / 25 / 6 / 461 | 36 | 32 | 7.1 |
| `014_0516_1444_lunch` | 014 | T2D | M, 53, 28.5 | lunch | 40 / 76 / 17 / 13 / 585 | 14 / 48 / 10 / 10 / 333 | 33 | 40 | 7.5 |
| `049_0519_1337_lunch` | 049 | T2D | F, 58, 36.1 | lunch | 43 / 20 / 20 / 13 / 445 | 25 / 22 / 18 / 8 / 349 | 92 | 96 | 4.2 |
| `036_0407_0754_breakfast` | 036 | T2D | M, 61, 25.0 | breakfast | 24 / 22 / 10 / 0 / 268 | 56 / 31 / 16 / 0 / 488 | 120 | 118 | 8.1 |

Several of these are the same standard study meal eaten by different people, which makes a good demo of personalization.
The 24 g-carb breakfast gave person 016 a rise of 34 mg/dL and person 036 a rise of 120 (predicted 35 and 118). The same
94 g-carb lunch gave 73 for person 044 and 134 for person 039 (predicted 72 and 122).

## Files

| Path | What it is | Use it for |
|---|---|---|
| `showcase_best_meals.png` | Overview figure: photo, predicted curve with its 80% band, and the real CGM curve for each meal | Quick look |
| `index.json` | People (with age, sex, BMI) and meals (with logged and photo-estimated nutrition, real and predicted peak rise) and their file paths | Navigation |
| `meals/<meal>.json` → `input` | What the app sends for the meal (photo, time, meal type, logged kcal) and the CGM, heart rate and activity from the 2 hours before | "Take a photo" flow |
| `meals/<meal>.json` → `output` | The API response: food tags, estimated nutrition, predicted curve with its band, peak, chance of going above 140 or 180, explanation, confidence, what-if scenarios, similar past meals | Meal result screen |
| `meals/<meal>.json` → `observed` | **Demo only**: the real CGM curve and the participant's own food log (logged nutrition). The live app will not have this | "Prediction vs reality" demo |
| `people/<id>/input_week1.json` | First-week data: age, sex, BMI; CGM, heart rate and activity (METs, active kcal) every 5 min; every meal with its photo and logged nutrition | History or onboarding screen |
| `people/<id>/output_profile.json` | Profile response: personal averages, diet guide (carb budget, biggest spikes with suggested swaps), metabolic profile (estimated HbA1c, risk tier) | Profile screen |
| `photos/` | Meal photos, 640 px wide | Images |

## Notes for design

- In these files `photo_key` holds a path into `photos/`. In the live API it is an opaque key that the app uses to fetch the image.
- Glucose is always in mg/dL (divide by 18 for mmol/L). Every curve uses the same grid, 0 to 120 minutes in steps of 5.
- Show the band, not only the line. About 80% of real curves fall inside it.
- Activity, age, sex, BMI and logged kcal are optional inputs. The model still predicts without them.
- The nutrition from the photo can differ a lot from what was logged (for example 67 g vs 24 g carbs for the 016 breakfast,
  a drink). Show it as an estimate the user can correct.
- `confidence.flags` and the `note` fields are written to be shown to users as they are. The diet guide and risk numbers are
  estimates and must not be presented as a diagnosis.
- These 10 are best cases, picked on purpose. Across all 44 participants the typical agreement is lower, so the design
  should handle predictions that miss.
- Field-by-field reference: `model/docs/api_contract.md`.
- To regenerate: `scripts/showcase_people.py`, then `scripts/import_cohort.py` and `scripts/export_ui_package.py` with the v7 model store.

## Data source and license

The photos, CGM, activity and food logs come from CGMacros: Gutierrez-Osuna R, Kerr D, Mortazavi B, Das A. *CGMacros: a
scientific dataset for personalized nutrition and diet monitoring* (version 1.0.0). PhysioNet, 2025. doi:10.13026/3z8q-x658.
The license is **CC BY-NC-SA 4.0**: keep this attribution, do not use the data commercially, and share anything derived
from it under the same license.
