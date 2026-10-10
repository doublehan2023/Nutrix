# Deployment notes

Last updated: 2026-10-10

## AWS

- Account: Workshop Studio event account (temporary), role `WSParticipantRole`, region `us-west-2`.
- Credentials are temporary (a few hours). Refresh from the event page → "Get AWS CLI credentials", then write them to the `nutrix` profile:
  ```bash
  aws configure set aws_access_key_id ...     --profile nutrix
  aws configure set aws_secret_access_key ... --profile nutrix
  aws configure set aws_session_token ...     --profile nutrix
  aws configure set region us-west-2          --profile nutrix
  ```
- The whole account is wiped when the event ends. Keep authoritative copies of data and models elsewhere.
- The profile lives in `C:/Users/yikma/.aws/{config,credentials}` on the deployment laptop. `The config profile (nutrix)
  could not be found` means the shell looks elsewhere: WSL (`export AWS_CONFIG_FILE=/mnt/c/Users/yikma/.aws/config
  AWS_SHARED_CREDENTIALS_FILE=/mnt/c/Users/yikma/.aws/credentials`), another machine or user (run `aws configure` there),
  or a stray `AWS_CONFIG_FILE`. `aws: command not found` in Git Bash: `export PATH="/c/Program Files/Amazon/AWSCLIV2:$PATH"`.

### Permissions (tested 2026-10-10 by creating and deleting real resources)

`WSParticipantRole` has `AdministratorAccess` attached and no permissions boundary.

| Service | Result |
| --- | --- |
| ECR: create/delete repo, docker login | OK |
| ECS: create/delete cluster | OK |
| IAM: create role (ecs-tasks trust), attach/detach `AmazonECSTaskExecutionRolePolicy`, delete | OK |
| API Gateway HTTP API: create/delete | OK |
| CloudWatch Logs: create/delete log group | OK |
| CodeBuild, Fargate (quota 140 vCPU), default VPC `vpc-081d76efba1ecd6a2` | Available |
| App Runner | Denied (simulator: implicitDeny) |

Git Bash note: set `MSYS_NO_PATHCONV=1` when passing AWS names that start with `/` (e.g. log groups), or Git Bash rewrites them to Windows paths.

## Live deployment

| Item | Value |
| --- | --- |
| API | `https://8la1c1eazd.execute-api.us-west-2.amazonaws.com` (every `/v1/*` call needs the `x-api-key` header) |
| API key | Secrets Manager `pmrf/api-key`: `aws secretsmanager get-secret-value --secret-id pmrf/api-key --query SecretString --output text` |
| Stack | CloudFormation `pmrf` (`infra/pmrf.yaml`), architecture in `docs/architecture.md` |
| Image | ECR `pmrf-api:<model version>-<git sha>`; live `v4-20261010-211c503` (see Images below) |
| Logs | CloudWatch `/ecs/pmrf` |
| Person data | DynamoDB `nutrix-people` + S3 `nutrix-person-state` (`server/store.py`) |

Verified 2026-10-10 against the live API: `scripts/test_integration.sh` passed 13/13 API-flow checks and returned the
same hospital-meal predictions as the local container (~290 ms per prediction).

Testing tools (all in `docs/testing_api.md`):

| Tool | Use |
| --- | --- |
| `scripts/predict.sh <patient> <photo> <meal time> [--log]` | One prediction; photo = test image name, `photos/...` key or local file; key read from Secrets Manager |
| `scripts/plot_prediction.py [json] [png]` | Plots `prediction.curve` with the 80% band, the 140 / 180 lines and the predicted peak |
| curl examples | Predict and profile with an existing photo key (no upload) |
| `scripts/test_integration.sh` | Full 13-check flow plus the 5 hospital meals; resets its two test users first |

A missing photo key returns 404: the task role has `s3:ListBucket` (photo bucket limited to `photos/*`, and the state
bucket); without it S3 answers 403 and the service returned 500.

## Images

| Where | What | Notes |
| --- | --- | --- |
| Local `pmrf-api:v4-20261010` | Model image built from `model/deploy/Dockerfile` | Base for the service image; keep it |
| Local `pmrf-aws:v4-20261010` | Service image (`server/Dockerfile`: model image + `server/`) | Same image as ECR `211c503` |
| ECR `v4-20261010-211c503` | Live | |
| ECR `v4-20261010-8159e02` | Rollback | Same image content as `211c503` (no service-code change in between), so it only becomes a real rollback after the next code change |

Image size: 2.99 GB uncompressed, ~860 MB in ECR. Main parts: torch CPU 697 MB, model files 445 MB (380 MB is the
MobileCLIP encoder), pyarrow / scipy / pandas / sklearn / numpy ~520 MB. Unused: ~100 MB of torch dependencies (sympy,
networkx, Jinja2, fsspec), hf-xet / pip / setuptools ~23 MB, the empty `/data` (`PMRF_DATA_DIR`). Not trimmed: they are
in the model team's `model/deploy/Dockerfile`, and uninstalling them in `server/Dockerfile` would not shrink the lower
layer.

Cleanup on 2026-10-10:
- ECR `v4-20261010-d8cf24b` deleted, with its two child manifests. It was the EFS-era image and cannot reach person data
  any more.
- Local build cache pruned (3.46 GB).
- Local test container `pmrf-local` stopped and removed, with `pmrf-aws:test` and the local copy of `8159e02`. It had
  been left running on port 8080 against the live DynamoDB table and S3.

Commits that change only `infra/`, `docs/` or local scripts do not need a new image: deploy with
`SKIP_BUILD=1 bash scripts/deploy.sh`.

## How `/profile` is built

Computed on every call, not stored, from:

| Input | Where | Used for |
| --- | --- | --- |
| First-week state: `hist.parquet` (meals and observed rises), `profile.json` (person statistics), `arrays.npz` | S3 `nutrix-person-state/<pid>/` | `personalization`, `diet_guide` spikes and time of day |
| Person meta and week-1 CGM | DynamoDB `nutrix-people` | `metabolic_profile` (HbA1c estimate, risk tier) |
| `guide/effects.json`, `risk/models.json`, population averages | Model files in the image | Group nutrient effects, risk models |

Two in-memory caches in the container: the loaded state (`server/store.py`, keyed by the ETag of `profile.json`, up to
512 people) and the finished response (`profile_cache`). Both refresh after `/history` or `/signals`; a restart clears
them.

`diet_guide` (`model/pmrf/guide.py`) does not use the main model. It uses nutrient effects measured in the CGMacros
standardized shakes (reference, -42 g carbs, +44 g protein, +31.5 g fat) applied to the person's own biggest week-1
spikes:
- personal version (`person_guide_measured`): the person's own shake contrasts shrunk toward the group, with a carb
  budget per meal; used only when the person is in the training library (`in_library`);
- group version (`person_guide_group`): group averages, no carb budget; used for everyone else.

## Storage

DynamoDB table `nutrix-people` (created by the `pmrf` stack): person meta and daily CGM / HR / meal / med chunks; layout in `docs/architecture.md`.

### S3 buckets

All buckets: block public access, versioning on, SSE-S3 (AES256).

| Bucket | Layout | Notes |
| --- | --- | --- |
| `nutrix-data` | `cgmacros/raw/CGMacros/` (3,502 files), `cgmacros/raw/physionet-1.0.0/` (7), `t1d/raw/Type1Diabetes.parquet` | Verified against local `data/` (counts and bytes). Sync with `ops/data/sync_data.sh pull|push`. |
| `nutrix-models` | `models/<version>/` | Current version `v4-20261010`. |
| `nutrix-input-images` | `photos/<person_id>/...` (written by the service; prefix fixed in `model/service/storage.py`), `photos/test/hospital-meals/` (5 untouched hospital trays from Wikimedia Commons, licenses in `sources.csv`; same files in `tests/integration/hospital_meals/`; under `photos/` so the service can read them directly as photo keys) | Meal photos sent to `/predict`. The service hands the app a presigned PUT URL (`/photos/upload-url`) and reads photos by key; set `PMRF_PHOTO_BUCKET=nutrix-input-images`. No versioning (write-once keys); incomplete multipart uploads are aborted after 1 day. |
| `nutrix-person-state` | `<pid>/hist.parquet`, `arrays.npz`, `profile.json` | First-week person states written by the service (created by the `pmrf` stack). |

## Model artifacts: `s3://nutrix-models/models/v4-20261010/`

115 files, 444 MB. All 114 files listed in `manifest.json` match their sha256; nothing missing or extra.

| Component | Files |
| --- | --- |
| Photo encoder (MobileCLIP-S2, `datacompdr`) | `encoder/open_clip_model.safetensors`; preprocess params in manifest |
| Food tags | `encoder/food_tag_text_emb.npy` (30×512); prompts in manifest |
| Photo PCA | `pca.npz` (mean 512, components 8×512) |
| Nutrition estimator | `macro/ridge.npz` (4 nutrients), `macro/stack0-3.txt`, `macro/library.npz` (1,119 photos) |
| Population meal retrieval | `retrieval.npz` (943 meals, 3 outcome columns) |
| LightGBM response | `gbm/<target>/{point,q10,q90}_seed{0,1,2}.txt`; targets d15–d120 every 15 min, dpeak, ttp, iauc; 70 features, log targets, CQR offsets and smearing in manifest |
| Transformer | `transformer/seed{0,1,2}.safetensors` (d=96, 3 layers) |
| Blend | manifest `blend`: per-target weights, `curve_weight` 0.65, `band_scale` 0.9 |
| Diet guide | `guide/effects.json` |
| Risk models | `risk/models.json` (HbA1c ridge, T2D logistic) |

Library versions are pinned in the manifest (lightgbm 4.5.0, torch 2.5.1, open_clip_torch 2.29.0, numpy 1.26.4, ...). No pickles. Python version is not recorded; use 3.11 (per the technical report).

### Still needed from the model team

1. ~~`pmrf/` inference code~~: received with the merge of `feature/model` (`model/`).
2. Golden test set: inputs and expected outputs for the 176 inspector meals, plus person states for the 45 CGMacros participants.

### Findings to raise with the model team

Seen on the live API (cgmacros-003, Korean hospital meal, 2020-03-18 12:30):

| Finding | Detail | Suggestion |
| --- | --- | --- |
| Carbs underestimated for unseen foods | Hospital trays get low carb estimates with wide uncertainty | Extend the nutrition library (see Planned changes) |
| `what_if` under-reacts | Double portion +66 -> +72 mg/dL; +10 g fiber: no change. `guide.py` notes that model counterfactuals under-react to carbs about five-fold because photo features stay fixed | App: show only "Half the carbs" / "Double portion", or the direction only; use `/profile` `biggest_spikes` for advice |
| Peak above the curve | `peak_glucose_mgdl` 179 vs curve maximum ~169: the peak is predicted separately and the mean curve is smoother | Explained in `plot_prediction.py` and the docs; model team could cap one by the other |
| Onboarded CGMacros patients get the group diet guide | API-onboarded people have `in_library=false`, so no personal shake effects and no carb budget, although `effects.json` has their shakes | Correct for real new users; ask how to enable it for the demo if wanted. Do not edit `model/` |
| `status` vs dataset label | cgmacros-003 is T2D in CGMacros; profile estimates prediabetes at 50% from one week of CGM | Present as an estimate, never as a diagnosis (contract rule) |
| No `carb_curve` for group-version patients | Listed in the contract, absent from the group version | Tell the app team before they design that chart |

## Unseen foods

- Every photo gets its own 512-d image embedding from MobileCLIP at request time, so new foods are encoded fine.
- `food_tag_text_emb.npy` holds embeddings of the 30 text prompts. Tagging is a softmax over those 30, so an unseen food is forced into the closest class (e.g. sushi → "fish or seafood").
- Tags are display only: none of the 70 LightGBM features use them, and the transformer takes the full image embedding.
- What does degrade for unseen foods: nutrition kNN and meal retrieval find less similar neighbours, so carb estimates are worse. `photo_sim_pop` is a model feature, and the photo-novelty flag lowers confidence.

### Planned changes

| Change | Owner | Affects predictions |
| --- | --- | --- |
| Expand food prompts (e.g. Food-101 class list); compute text embeddings in the service from the encoder's text tower | Deployment | No (display only) |
| Show "unrecognised" when the top tag similarity is below a threshold | Deployment | No (display only) |
| Optional VLM dish description (Qwen2.5-VL, ~5.3 s/photo on CPU, async) | Deployment | No |
| Extend the nutrition photo library (e.g. Nutrition5k) and retrain the stacker | Model team, to confirm | Yes |

## Deployment decisions

- Person data on DynamoDB + S3 instead of EFS (2026-10-10): `server/store.py` replaces the model's file-based `PersonStore` at start-up, so `model/` stays untouched. Signals go to DynamoDB in one item per person, signal and day; first-week states (1–3 MB) go to S3. Switched after the same tests passed with identical predictions. Risk: depends on `PersonStore`'s method names; `scripts/test_integration.sh` catches a break.

- Scope of the deployment role: ends once the API is up (model service reachable through API Gateway). App integration belongs to the app team.

- No full CD: temporary credentials and a disposable account make GitHub → AWS automation not worth it. Use a one-command `scripts/deploy.sh` (build → push ECR → update ECS → health check).
- Light CI in GitHub Actions (`.github/workflows/ci.yml`): lint and a Docker build on PRs, no AWS access. Golden-set
  comparison to be added once the model team provides the inputs.
- FastAPI container on ECS Fargate (2 vCPU / 4 GB) behind API Gateway. Model files are baked into the image (read-only,
  no download at start-up); `scripts/fetch_model.sh` pulls and checks them from S3 before a build.
- Test images live under `photos/test/hospital-meals/` so they work as photo keys without uploading.
- ECR keeps the live image plus one rollback; older images are deleted. No local containers left running against live
  data after a test.
- `model/` is never edited (the model team syncs it with `rsync --delete`); findings go to the model team instead.
