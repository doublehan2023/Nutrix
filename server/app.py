"""Entry point for the AWS deployment: the model team's service (model/service/app.py) with person data on
DynamoDB + S3 instead of files under /data. Nothing in model/ is changed; the store is swapped at start-up.

Env: PMRF_TABLE (DynamoDB table), PMRF_STATE_BUCKET (S3 bucket for first-week states), AWS_REGION,
plus every PMRF_* variable the base service reads (see model/DEPLOY.md).
"""
import json
import os
from contextlib import asynccontextmanager

from service import app as base
from server.store import DynamoPersonStore

_base_lifespan = base.app.router.lifespan_context


@asynccontextmanager
async def lifespan(app):
    async with _base_lifespan(app):
        store = DynamoPersonStore(os.environ["PMRF_TABLE"], os.environ["PMRF_STATE_BUCKET"], region=os.environ.get("AWS_REGION"))
        base.S["people"] = store
        base.LOG.info(json.dumps(dict(event="person_store", store=store.describe())))
        yield


base.app.router.lifespan_context = lifespan
app = base.app
