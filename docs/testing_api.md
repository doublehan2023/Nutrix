# Testing the deployed API

Run from the repo root in Git Bash. Field reference: `model/docs/api_contract.md`. Architecture: `docs/architecture.md`.

## 0. Setup

```bash
export API=https://8la1c1eazd.execute-api.us-west-2.amazonaws.com
export PMRF_API_KEY=$(aws secretsmanager get-secret-value --secret-id pmrf/api-key \
  --profile nutrix --region us-west-2 --query SecretString --output text)
```

`aws: command not found` in Git Bash: the shell was opened before the AWS CLI was installed. Run
`export PATH="/c/Program Files/Amazon/AWSCLIV2:$PATH"` (add it to `~/.bashrc` to keep it).
`ExpiredToken` means the event credentials expired: refresh them from the Workshop Studio page (see
`docs/deployment_notes.md`) and run the export again.

## 1. Health check (no key needed)

```bash
curl $API/healthz
# {"status":"ok","model_version":"v4-20261010","api_version":"0.1"}
```

## 2. Full test (recommended)

```bash
PATH="$PWD/.venv/Scripts:$PATH" bash scripts/test_integration.sh $API
```

Needs `data/CGMacros` (`./ops/data/sync_data.sh pull`), AWS credentials (profile `nutrix`) and numpy, pandas, httpx,
boto3 in `.venv`. It first deletes the two test users (`ops/data/reset_person.py`), since person data persists in
DynamoDB + S3 between runs. Then it runs:

1. The model team's end-to-end flow, 13 checks: photo upload → `/history` → `/signals` → `/predict` → `/profile`, plus
   auth and error cases.
2. The 5 unseen hospital meal photos for CGMacros participant 001 at day 8, 12:30, printed as a table. Full JSON:
   `tests/integration/out/hospital_meals.json`.

Result on 2026-10-10 (DynamoDB + S3 store): 13/13 checks passed; about 315 ms per prediction.

## 3. One prediction

```bash
./scripts/predict.sh <patient> <photo> <meal time>
./scripts/predict.sh cgmacros-003 korea_snuh_evening_meal 2020-03-18T12:30:00
```

```
patient     cgmacros-003   meal time 2020-03-18 12:30:00 (lunch)
photo       photos/test/hospital-meals/korea_snuh_evening_meal.jpg
photo tags  a plate of mixed home-cooked food 54%, rice with meat 42%, yogurt 1%
nutrition   carbs 42 g (+/- 36), protein 16 g, fat 23 g, 436 kcal
glucose     before 113 -> peak 179 mg/dL (+66) at 56 min
at minutes  30: 135  60: 169  90: 157  120: 142
P(peak>140) 92%   P(peak>180) 49%
confidence  high
```

- `<patient>`: one of the onboarded patients (section 4).
- `<photo>`: a test image already in S3 (`korea_snuh_evening_meal`, `us_chicken_penne_greens`,
  `germany_cabbage_roll_mash`, `germany_greek_salad_pita`, `israel_hospital_meal`, stored under
  `s3://nutrix-input-images/photos/test/hospital-meals/`), any S3 key `photos/...`, or a local `.jpg` (uploaded first).
- `<meal time>`: local time within the patient's record (before `CGM until` in section 4), with CGM in the 30 min before.
- Add `--log` to record the meal in the patient's food log (`log_meal=true`: later predictions see it as the previous
  meal). Without it the call is a preview and changes nothing, so you can compare several photos at the same time.
- The API key is read from Secrets Manager unless `PMRF_API_KEY` is set. Errors print the service's reason.
  Full JSON: `tests/integration/out/predict_<patient>.json`.

The same call with curl (the photo is already in S3, so no upload):

```bash
# predict
curl -s -H "x-api-key: $PMRF_API_KEY" -H "content-type: application/json" \
  -d '{"photo_key":"photos/test/hospital-meals/korea_snuh_evening_meal.jpg","meal_time":"2020-03-18T12:30:00","log_meal":false}' \
  $API/v1/people/cgmacros-003/predict | python -m json.tool | head -60

# profile
curl -s -H "x-api-key: $PMRF_API_KEY" $API/v1/people/cgmacros-003/profile | python -m json.tool
```

What to look at in the prediction:

| Field | Meaning |
| --- | --- |
| `meal.photo_tags`, `meal.estimated_nutrition` | What the model recognised and its carb estimate |
| `prediction.curve` | 0–120 min glucose curve with the 80% band (`lower80`, `upper80`) |
| `prediction.peak_rise_mgdl`, `prediction.prob_peak_above_mgdl` | Peak rise and the chance of going above 140 / 180 mg/dL |
| `confidence.level`, `confidence.flags` | Confidence and plain-language warnings |

`demo-hospital-001` and `flowtest-user` are test users that `scripts/test_integration.sh` deletes and rebuilds on every
run; use the patients in section 4 for demos.

## 4. Onboarded patients

Six CGMacros participants are stored as patients, two per group, with week 1 as history and all later CGM and heart
rate uploaded, so predictions work at any time up to `cgm_until`:

| Patient | Group | Usable week-1 meals | CGM until |
| --- | --- | --- | --- |
| `cgmacros-002` | Healthy | 21 | 2019-11-25 08:08 |
| `cgmacros-004` | Healthy | 27 | 2023-09-21 07:48 |
| `cgmacros-007` | Prediabetes | 13 | 2023-11-10 16:10 |
| `cgmacros-008` | Prediabetes | 21 | 2023-02-09 08:57 |
| `cgmacros-003` | T2D | 22 | 2020-03-21 08:08 |
| `cgmacros-005` | T2D | 23 | 2020-08-27 10:37 |

Predict for one of them with `./scripts/predict.sh` (section 3).
Add or refresh patients (re-running replaces their history), optionally comparing one photo across all of them at
the same study day and time:

```bash
python -I ops/data/onboard_patients.py $API data/CGMacros 002 004 007 008 003 005 \
  --compare-photo tests/integration/hospital_meals/korea_snuh_evening_meal.jpg --day 8 --time 12:30
```

Same Korean hospital meal at day 8, 12:30 (2026-10-10): predicted rise from +31 mg/dL (`cgmacros-005`) to +66 mg/dL
(`cgmacros-003`); the group label alone does not order the responses, which is why the model is personalised.

## 5. A new person

A new person needs a first week of data before `/predict` works:

1. Upload each week-1 meal photo: `POST /v1/people/{id}/photos` (multipart `file`) → `photo_key`.
2. `POST /v1/people/{id}/history` with `cgm[]`, `hr[]`, `meals[]` (time, type, `photo_key`, logged nutrition) and
   optional `meds[]`. Builds the person's state in about 10 s.
3. Before each prediction, send CGM up to the meal time with `POST /v1/people/{id}/signals`, or attach `recent_cgm` to
   the `/predict` body.

`tests/integration/demo_hospital_meals.py` does all three from CGMacros data and is the easiest template.

## 6. Errors

| Status | Meaning |
| --- | --- |
| 401 | Missing or wrong `x-api-key` |
| 404 | Person not onboarded yet (no `/history`), or the photo key does not exist |
| 409 | No CGM reading in the 30 min before the meal: send `/signals` or `recent_cgm` |
| 422 | Invalid request: not an image, values out of range, wrong types |
| 429 | Throttled: API Gateway allows 10 requests/s (burst 20) |
| 503 / 504 | Service starting or overloaded: check CloudWatch logs `/ecs/pmrf` |
