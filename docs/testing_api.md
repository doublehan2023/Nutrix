# Testing the deployed API

Run from the repo root in Git Bash. Field reference: `model/docs/api_contract.md`. Architecture: `docs/architecture.md`.

## 0. Setup

```bash
export API=https://8la1c1eazd.execute-api.us-west-2.amazonaws.com
export PMRF_API_KEY=$(aws secretsmanager get-secret-value --secret-id pmrf/api-key \
  --profile nutrix --region us-west-2 --query SecretString --output text)
```

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

## 3. One prediction by hand

The live service already has an onboarded test person, `demo-hospital-001` (CGMacros participant 001, CGM uploaded up
to 2020-05-08 12:30):

```bash
# Upload a photo and get its key
KEY=$(curl -s -H "x-api-key: $PMRF_API_KEY" \
  -F "file=@tests/integration/hospital_meals/korea_snuh_evening_meal.jpg;type=image/jpeg" \
  $API/v1/people/demo-hospital-001/photos | python -c "import json,sys;print(json.load(sys.stdin)['photo_key'])")

# Predict; log_meal=false keeps the meal out of the person's food log
curl -s -H "x-api-key: $PMRF_API_KEY" -H "content-type: application/json" \
  -d "{\"photo_key\":\"$KEY\",\"meal_time\":\"2020-05-08T12:30:00\",\"log_meal\":false}" \
  $API/v1/people/demo-hospital-001/predict | python -m json.tool | head -60

# Profile (diet guide, estimated HbA1c, risk tier)
curl -s -H "x-api-key: $PMRF_API_KEY" $API/v1/people/demo-hospital-001/profile | python -m json.tool
```

What to look at in the prediction:

| Field | Meaning |
| --- | --- |
| `meal.photo_tags`, `meal.estimated_nutrition` | What the model recognised and its carb estimate |
| `prediction.curve` | 0–120 min glucose curve with the 80% band (`lower80`, `upper80`) |
| `prediction.peak_rise_mgdl`, `prediction.prob_peak_above_mgdl` | Peak rise and the chance of going above 140 / 180 mg/dL |
| `confidence.level`, `confidence.flags` | Confidence and plain-language warnings |

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

Predict any photo for one of them with the curl in section 3 (use their id and a `meal_time` before `cgm_until`).
Add or refresh patients (re-running replaces their history), optionally comparing one photo across all of them at
the same study day and time:

```bash
python -I ops/data/onboard_patients.py $API data/CGMacros 002 004 007 008 003 005   --compare-photo tests/integration/hospital_meals/korea_snuh_evening_meal.jpg --day 8 --time 12:30
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
| 404 | Person not onboarded yet (no `/history`), or unknown photo key |
| 409 | No CGM reading in the 30 min before the meal: send `/signals` or `recent_cgm` |
| 422 | Invalid request: not an image, values out of range, wrong types |
| 429 | Throttled: API Gateway allows 10 requests/s (burst 20) |
| 503 / 504 | Service starting or overloaded: check CloudWatch logs `/ecs/pmrf` |
