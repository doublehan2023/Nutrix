"""Clerk-authenticated mobile facade for the PMRF service."""
import hashlib
import os
from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request


@dataclass(frozen=True)
class MobileIdentity:
    person_id: str
    role: str


@dataclass(frozen=True)
class ClerkConfig:
    audience: str
    issuer: str
    role_claim: str


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} must be configured before enabling mobile routes")
    return value


def clerk_config() -> ClerkConfig:
    return ClerkConfig(
        audience=_required("CLERK_JWT_AUDIENCE"),
        issuer=_required("CLERK_JWT_ISSUER").rstrip("/"),
        role_claim=os.environ.get("CLERK_ROLE_CLAIM", "role"),
    )


def person_id_for(subject: str) -> str:
    """Return a PMRF-compatible ID that cannot be selected by a caller."""
    return f"clerk-{hashlib.sha256(subject.encode()).hexdigest()[:32]}"


def verify_mobile_request(request: Request) -> MobileIdentity:
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "missing bearer token")

    config = clerk_config()
    try:
        signing_key = jwt.PyJWKClient(f"{config.issuer}/.well-known/jwks.json").get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=config.audience,
            issuer=config.issuer,
            options={"require": ["aud", "exp", "iat", "iss", "sub"]},
        )
    except jwt.PyJWTError as error:
        raise HTTPException(401, "invalid or expired session token") from error

    role = claims.get(config.role_claim)
    if not isinstance(role, str) or role.lower() not in {"admin", "clinician", "patient"}:
        raise HTTPException(403, "session token has no authorized Nutrix role")

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise HTTPException(401, "session token has no user subject")
    return MobileIdentity(person_id=person_id_for(subject), role=role.lower())
