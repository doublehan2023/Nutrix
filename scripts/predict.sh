#!/usr/bin/env bash
# Predict one patient's glucose response to a meal photo, against the deployed API, in one command.
#   ./scripts/predict.sh <patient> <photo> <meal time YYYY-MM-DDTHH:MM:SS> [--log]
#   e.g. ./scripts/predict.sh cgmacros-003 korea_snuh_evening_meal 2020-03-18T12:30:00
# <photo> is one of:
#   - a test image name (already in S3 under photos/test/hospital-meals/): korea_snuh_evening_meal,
#     us_chicken_penne_greens, germany_cabbage_roll_mash, germany_greek_salad_pita, israel_hospital_meal
#   - an S3 key the service already has: photos/...
#   - a local .jpg file, uploaded first
# Prints a summary; the full JSON goes to tests/integration/out/predict_<patient>.json.
# --log records the meal in the patient's food log (log_meal=true); default is a preview that changes nothing.
# Env: API (default: the live API), PMRF_API_KEY (default: read from Secrets Manager pmrf/api-key)
set -euo pipefail
for d in "/c/Program Files/Amazon/AWSCLIV2"; do [ -d "$d" ] && PATH="$d:$PATH"; done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATIENT="${1:?usage: $0 <patient> <photo> <meal time> [--log]}"
PHOTO="${2:?photo missing: a test image name, an S3 key photos/... or a local .jpg}"
MEAL_TIME="${3:?meal time missing, e.g. 2020-03-18T12:30:00}"
LOG=false; [ "${4:-}" = "--log" ] && LOG=true
API="${API:-https://8la1c1eazd.execute-api.us-west-2.amazonaws.com}"

if [ -z "${PMRF_API_KEY:-}" ]; then
  PMRF_API_KEY="$(aws secretsmanager get-secret-value --secret-id pmrf/api-key --profile "${AWS_PROFILE:-nutrix}" \
    --region us-west-2 --query SecretString --output text)" || { echo "could not read the API key (AWS credentials expired?)" >&2; exit 1; }
fi

# 1. photo key: an existing S3 key, a local file to upload, or a test image name
if [[ "$PHOTO" == photos/* ]]; then
  KEY="$PHOTO"
elif [ -f "$PHOTO" ]; then
  RESP="$(mktemp)"
  CODE="$(curl -s -o "$RESP" -w '%{http_code}' -H "x-api-key: $PMRF_API_KEY" -F "file=@$PHOTO;type=image/jpeg" \
    "$API/v1/people/$PATIENT/photos")"
  [ "$CODE" = 200 ] || { echo "photo upload failed ($CODE): $(cat "$RESP")" >&2; exit 1; }
  KEY="$(python -c "import json,sys;print(json.load(open(sys.argv[1]))['photo_key'])" "$RESP")"
else
  KEY="photos/test/hospital-meals/${PHOTO%.jpg}.jpg"
fi

# 2. predict
mkdir -p "$ROOT/tests/integration/out"
JSON="$ROOT/tests/integration/out/predict_$PATIENT.json"
CODE="$(curl -s -o "$JSON" -w '%{http_code}' -H "x-api-key: $PMRF_API_KEY" -H "content-type: application/json" \
  -d "{\"photo_key\":\"$KEY\",\"meal_time\":\"$MEAL_TIME\",\"log_meal\":$LOG}" "$API/v1/people/$PATIENT/predict")"
[ "$CODE" = 200 ] || { echo "predict failed ($CODE): $(cat "$JSON")" >&2; exit 1; }

python - "$JSON" "$KEY" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1], encoding="utf8"))
m, p, c = d["meal"], d["prediction"], d["confidence"]
n = m["estimated_nutrition"]
print(f"patient     {d['person_id']}   meal time {m['time']} ({m['meal_type']})")
print(f"photo       {sys.argv[2]}")
print("photo tags  " + ", ".join(f"{t['label']} {t['p']:.0%}" for t in m["photo_tags"]))
print(f"nutrition   carbs {n['carbs_g']:.0f} g (+/- {n['carbs_uncertainty_g']:.0f}), protein {n['protein_g']:.0f} g, fat {n['fat_g']:.0f} g, {n['kcal']:.0f} kcal")
print(f"glucose     before {d['pre_meal_state']['glucose_mgdl']:.0f} -> peak {p['peak_glucose_mgdl']:.0f} mg/dL "
      f"(+{p['peak_rise_mgdl']:.0f}) at {p['time_to_peak_min']:.0f} min")
print("at minutes  " + "  ".join(f"{k}: {v:.0f}" for k, v in p["glucose_at_min"].items()))
print(f"P(peak>140) {p['prob_peak_above_mgdl']['140']:.0%}   P(peak>180) {p['prob_peak_above_mgdl']['180']:.0%}")
print(f"confidence  {c['level']}" + (f" ({'; '.join(c['flags'])})" if c["flags"] else ""))
print(f"full JSON   {sys.argv[1]}")
EOF
