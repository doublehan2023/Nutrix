"""Entry point for the AWS deployment: the model team's service (model/service/app.py) with person data on
DynamoDB + S3 instead of files under /data. Nothing in model/ is changed; the store is swapped at start-up.

/predict also returns `observed` (the real CGM curve and outcomes after the meal) when the store already holds CGM
for the two hours after it, e.g. for onboarded study participants; see server/observed.py.

GET /v1/people/{pid}/history/days and /history/days/{YYYY-MM-DD} serve the stored data per calendar day for the
app's history screen (server/history_view.py).

Env: PMRF_TABLE (DynamoDB table), PMRF_STATE_BUCKET (S3 bucket for first-week states), AWS_REGION,
plus every PMRF_* variable the base service reads (see model/DEPLOY.md).
"""
import json
import os
from contextlib import asynccontextmanager

import boto3
import pandas as pd
from botocore.config import Config
from fastapi.routing import APIRoute

from service import app as base
from service.storage import check_key
from server.history_view import day_view, days_overview
from server.observed import CGM_AFTER_MIN, observed_outcome
from server.store import DynamoPersonStore

_base_lifespan = base.app.router.lifespan_context


@asynccontextmanager
async def lifespan(app):
    async with _base_lifespan(app):
        store = DynamoPersonStore(os.environ["PMRF_TABLE"], os.environ["PMRF_STATE_BUCKET"], region=os.environ.get("AWS_REGION"))
        base.S["people"] = store
        base.LOG.info(json.dumps(dict(event="person_store", store=store.describe())))
        yield


PREDICT = "/v1/people/{pid}/predict"
base.app.router.routes = [r for r in base.app.router.routes if not (isinstance(r, APIRoute) and r.path == PREDICT)]


@base.app.post(PREDICT)
def predict(pid: str, body: base.PredictIn):
    """The model team's /predict, plus `observed` when the CGM after the meal is already stored. The prediction itself
    still only sees data up to the meal time."""
    resp = base.predict(pid, body)
    mt = pd.Timestamp(resp["meal"]["time"])
    person = base.S["people"].person(pid, until=mt + pd.Timedelta(minutes=CGM_AFTER_MIN))
    obs = observed_outcome(person, mt, resp["prediction"])
    if obs is not None:
        resp["observed"] = base._clean(obs)
    return resp


PHOTO_URL_TTL_S = 3600
_photo_s3 = {}


def _photo_url(key):
    """presigned GET for a meal photo (the task role may read photos/* only), or None without an S3 photo bucket"""
    bucket = base.CFG["photo_bucket"]
    if not bucket or not key.startswith("photos/"):
        return None
    check_key(key)
    if "c" not in _photo_s3:
        _photo_s3["c"] = boto3.client("s3", region_name=base.CFG["region"], config=Config(signature_version="s3v4"))
    return _photo_s3["c"].generate_presigned_url("get_object", Params=dict(Bucket=bucket, Key=key), ExpiresIn=PHOTO_URL_TTL_S)


@base.app.get("/v1/people/{pid}/history/days")
def history_days(pid: str):
    """dates with stored data, each with a glucose summary and meal / medication counts (history screen day picker)"""
    base._require(pid, state=False)
    return base._clean(days_overview(base.S["people"], pid))


@base.app.get("/v1/people/{pid}/history/days/{date}")
def history_day(pid: str, date: str):
    """one calendar day: CGM, 5-min heart rate, meals with photo URL and observed response, medication"""
    base._require(pid, state=False)
    return base._clean(day_view(base.S["people"], pid, date, photo_url=_photo_url))


base.app.router.lifespan_context = lifespan
app = base.app
