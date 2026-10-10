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
from fastapi.routing import APIRoute

from service import app as base
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
app = base.app
