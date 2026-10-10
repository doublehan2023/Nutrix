"""Entry point for the AWS deployment: the model team's service (model/service/app.py) with person data on
DynamoDB + S3 instead of files under /data. Nothing in model/ is changed; the store is swapped at start-up.

/predict also returns `observed` (the real CGM curve and outcomes after the meal) when the store already holds CGM
for the two hours after it, e.g. for onboarded study participants; see server/observed.py.

Env: PMRF_TABLE (DynamoDB table), PMRF_STATE_BUCKET (S3 bucket for first-week states), AWS_REGION,
plus every PMRF_* variable the base service reads (see model/DEPLOY.md).
"""
import json
import os
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import Request
from fastapi.routing import APIRoute
from pydantic import BaseModel

from service import app as base
from server.mobile_gateway import verify_mobile_request
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


base.app.router.lifespan_context = lifespan


class MobilePredictionIn(BaseModel):
    log_meal: bool = True
    meal_time: str
    meal_type: str
    photo_key: str


@base.app.middleware("http")
async def authenticate_mobile_routes(request: Request, call_next):
    """Verify Clerk before the base app checks its private x-api-key.

    In Starlette the last-added middleware is outermost. The key is injected
    only into this in-process request after Clerk verification; it is never
    exposed to the mobile client.
    """
    if request.url.path.startswith("/v1/mobile/"):
        request.state.mobile_identity = verify_mobile_request(request)
        headers = [(key, value) for key, value in request.scope["headers"] if key != b"x-api-key"]
        headers.append((b"x-api-key", base.CFG["api_key"].encode()))
        request.scope["headers"] = headers
    return await call_next(request)


def mobile_identity(request: Request):
    return request.state.mobile_identity


@base.app.get("/v1/mobile/readiness")
def mobile_readiness(request: Request):
    identity = mobile_identity(request)
    store = base.S["people"]
    if not store.exists(identity.person_id):
        return dict(status="collecting_baseline", daysCollected=0, requiredDays=7)
    if not store.has_state(identity.person_id):
        return dict(status="processing_baseline", daysCollected=0, requiredDays=7)
    return dict(status="ready", daysCollected=7, requiredDays=7)


@base.app.post("/v1/mobile/photos/upload-url")
def mobile_upload_url(request: Request):
    identity = mobile_identity(request)
    result = base.upload_url(identity.person_id, base.UploadUrlIn(content_type="image/jpeg"))
    return dict(photoKey=result["photo_key"], uploadUrl=result["upload_url"], headers=result["headers"])


@base.app.post("/v1/mobile/predictions")
def mobile_prediction(request: Request, body: MobilePredictionIn):
    if body.meal_type not in base.MEAL_TYPES:
        raise ValueError("meal_type must be breakfast, lunch, dinner, or snack")
    identity = mobile_identity(request)
    return predict(
        identity.person_id,
        base.PredictIn(
            photo_key=body.photo_key,
            meal_time=body.meal_time,
            meal_type=body.meal_type,
            log_meal=body.log_meal,
        ),
    )
app = base.app
