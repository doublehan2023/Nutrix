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
| Image | ECR `pmrf-api:<model version>-<git sha>` |
| Logs | CloudWatch `/ecs/pmrf` |
| Person data | DynamoDB `nutrix-people` + S3 `nutrix-person-state` (`server/store.py`) |

Verified 2026-10-10 against the live API: `scripts/test_integration.sh` passed 13/13 API-flow checks and returned the
same hospital-meal predictions as the local container (~290 ms per prediction).

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

1. `pmrf/` inference code. Only the code defines:
   - transformer architecture: number of heads, the 56 `num` inputs, the 50-dim `pre` input, input normalization;
   - how P(peak > 140 / 180 mg/dL) is computed (no separate calibrator in S3);
   - confidence-flag thresholds (e.g. photo-novelty similarity cutoff).
2. Golden test set: inputs and expected outputs for the 176 inspector meals, plus person states for the 45 CGMacros participants.

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
- Light CI in GitHub Actions: lint + golden-set comparison on PRs, no AWS access.
- Target: FastAPI container on ECS Fargate (2 vCPU / 4 GB) behind API Gateway; models loaded from S3 at startup by `MODEL_VERSION`.
