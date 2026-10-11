# Nutrix glucose model: data, inputs, models and results

Everything here describes the deployed model (`v7-20261010`). From a meal photo and the person's first week of data, the
model predicts the glucose curve for the next 2 hours (0 to 120 min, every 5 min, with an 80% band). From that curve it
also gives glucose at 30/60/90/120 min, the peak, the peak rise, the time to peak and the area under the curve (iAUC).

## 1. Datasets

| Dataset | What it is | Size | What we used it for |
|---|---|---|---|
| **CGMacros** (official) | Adults with a Dexcom CGM and a Fitbit (heart rate, METs), logging every meal with a photo, for about 10 days | 45 people (15 healthy, 16 prediabetes, 14 type 2 diabetes); 1,397 meals with a usable 2-hour glucose curve | Main training and test data |
| **MetaboNet** (official, `Type1Diabetes.parquet`) | Type 1 diabetes studies: CGM, carbs, insulin | 671,666 meals from 1,085 people (the 9 studies that log carbs) | Pretraining Model B |
| BIG IDEAs (extra) | Dexcom CGM and food log | 16 people; 397 meals from 14 of them | Extra training meals for Model A; HbA1c model |
| Colas et al. 2019 (extra) | 1 to 2 days of CGM, then about 2.7 years of follow-up | 208 adults without diabetes, 17 developed type 2 diabetes | Diabetes-risk model; HbA1c model |

**How CGMacros is split.** Each person is split by time, as the challenge asks: the model learns from days 1 to 7 and is
tested on day 8 onward.

- **Training:** 943 CGMacros meals from days 1 to 7, plus 397 BIG IDEAs meals (1,340 in total).
- **Validation (for every model choice):** learn from days 1 to 5, check on days 6 and 7 (273 meals from 43 people).
- **Test:** days 8 and later, 402 meals from 44 people. These meals were never used for training or for any choice. 314 of
  them are recipes the person did not eat in their first week.

A meal counts when the CGM covers its 2 hours (at least 90% of readings) and no other meal starts within those 2 hours.

## 2. Inputs

When predicting, the app sends only the meal photo and the meal time (and, optionally, the calories the user typed).
Everything else comes from data the service already has: CGM, heart rate, activity, the first-week meals, and age, sex and BMI.
The nutrients of the new meal come from the photo.

**Model A (LightGBM)** has 59 inputs in 12 groups. The share column shows how much each group drives the peak-rise
prediction (LightGBM gain).

| Input group | What it contains | Inputs | Share |
|---|---|---|---|
| Personal profile (first week) | Your average rise after meals, rise per 10 g of carbs, mean glucose, variability, time in range, night glucose, resting heart rate | 12 | 29% |
| Meal from photo | Estimated carbs, protein, fat, fiber and kcal (with uncertainty), 8 image features, how familiar the photo looks | 15 | 16% |
| Your similar past meals | Glucose rise after your most similar first-week meals (matched by photo) | 4 | 15% |
| Glucose before the meal | Level at meal start, compared with your 24-hour median, and 3-hour mean | 3 | 12% |
| Glucose trend before the meal | Rate of change over 30 and 60 min, variability in the last hour | 3 | 7% |
| Logged calories (optional) | kcal the user entered | 1 | 6% |
| Previous meals | Time since the last meal, its carbs, number of meals in the last 6 hours | 3 | 5% |
| Meal type and time of day | Breakfast, lunch, dinner or snack; hour | 7 | 5% |
| Other people's similar meals | Glucose rise of other participants after similar-looking meals | 2 | 3% |
| Activity before the meal | METs in the last 30 and 120 min, active minutes, active kcal | 4 | 1.4% |
| Heart rate | Heart rate above resting before the meal | 2 | 1.0% |
| Age, sex, BMI | | 3 | 0.6% |

Activity and age, sex and BMI were picked on the validation days: adding them lowered the validation error only slightly
(by 0.4%).

**Model B (transformer)** sees each meal as one token: the photo features, the 2 hours of CGM before the meal, and 31
numbers. Those numbers are the photo-estimated nutrients (for past meals also the logged ones), meal type, time, glucose
level and trend, heart rate, previous meal, insulin (MetaboNet only), and age, sex and BMI. With the new meal it also reads
up to 30 of the person's past meals together with their recorded glucose curves, and learns the person's response from them.

## 3. Models

| Step | Model | What it does |
|---|---|---|
| Photo understanding | MobileCLIP-S2 image encoder (open model from Apple) | Turns the photo into features and 30 food tags |
| Nutrition from photo | Nearest similar meals (all people and the person's own) + ridge + LightGBM | Estimates carbs, protein, fat, fiber, kcal |
| **Model A** | LightGBM, one model per output (3 seeds, plus 10% and 90% models) | Glucose change at 15 to 120 min, peak rise, time to peak, iAUC |
| **Model B** | In-context transformer, pretrained on MetaboNet, fine-tuned on CGMacros (3 seeds) | Full 0 to 120 min curve with 10/50/90% bands |
| Blend | Weighted average, weights picked on the validation days | Final curve: 60% Model B and 40% Model A; peak rise: 30% B and 70% A |
| Profile screen | Ridge regression on 15 CGM metrics; logistic regression | Estimated HbA1c from 7 days of CGM; type 2 diabetes risk tier |

We compared against three baselines:

- **Population mean:** the average curve for each meal type.
- **Chronos-2:** Amazon's time-series foundation model, used zero-shot with carbs as an extra input.
- **Population model:** photo and context inputs, but no personal data.

## 4. Results on the test meals (days 8+, 402 meals, 44 people)

Mean absolute error (lower is better). Glucose and peak rise are in mg/dL, iAUC in mg/dL·min. The last column is the
correlation between predicted and real peak rise.

| Model | Glucose at 60 min | Peak rise | iAUC | r (peak rise) |
|---|---|---|---|---|
| Population mean by meal type | 29.1 | 30.3 | 2,216 | 0.29 |
| Chronos-2 zero-shot | 33.6 | 43.8 | 2,575 | 0.13 |
| Population model (photo + context, not personal) | 24.8 | 25.3 | 1,814 | 0.55 |
| Model A (LightGBM, personalized) | 21.7 | 21.7 | **1,502** | 0.69 |
| Model B (transformer, personalized) | 21.9 | 24.3 | 1,614 | 0.70 |
| **Final blend (deployed)** | **21.2** | **21.4** | 1,522 | **0.72** |

For scale, the average real peak rise was 52 mg/dL (median 43).

Headline numbers:

- **Better than the population model:** the final model lowers the error by 3.9 mg/dL for peak rise (95% CI 2.2 to 5.3),
  3.6 mg/dL for glucose at 60 min (1.5 to 5.8) and 292 for iAUC (151 to 425).
- **Ranks people correctly:** across people, predicted and real average peak rise correlate at r = 0.82 (population model 0.73).
- **Whole curve:** the average error over the 0 to 120 min curve is 17.5 mg/dL, and 81% of real readings fall inside the
  80% band.
- **Works on new recipes:** on the 314 meals the person had not eaten before, the peak-rise error is 20.1, the 60-min error
  20.1 and the curve error 16.7 mg/dL, no worse than on all meals.
- **Nutrition from photo:** the carbs error is 24 g (logged meals average 51 g), on all 525 day-8+ photos.
- **HbA1c from 7 days of CGM:** error 0.27 HbA1c points (cross-validated on 261 people), against 0.33 for the standard GMI
  formula. On CGMacros alone the error is 0.46, against 0.59 for GMI.
- **Type 2 diabetes risk (Colas cohort):** AUC 0.82 (95% CI 0.68 to 0.92) with clinical data plus CGM, and 0.76 with CGM
  alone. These rest on only 17 cases.

## 5. How the results were checked

- **Choices made on validation only:** every choice (inputs, blend weights, training length) was made on the validation
  days. The test meals were scored once at the end.
- **Confidence intervals:** 95% bootstrap over people, so one person with many meals cannot dominate.
- **Small cohort:** the test set has 44 people and 402 meals. Model A and the final blend differ by about 1 mg/dL or
  less, and Model A alone is slightly better on iAUC and glucose at 90 min. The clear gains are personalized versus not
  personalized, and versus the baselines.
