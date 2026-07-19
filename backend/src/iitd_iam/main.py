import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from redis.asyncio import Redis
from sqlalchemy import text
from starlette.responses import Response

from iitd_iam.api.v1.routes import router as v1_router
from iitd_iam.config import get_settings
from iitd_iam.database import SessionLocal
from iitd_iam.errors import ApiError, api_error_handler
from iitd_iam.middleware.request_id import request_id_middleware

KEYCLOAK_HEALTH_CACHE_TTL_SECONDS = 60
_keycloak_health_cache = {"checked_at": 0.0, "status": "unknown"}


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="IITD IAM API", version="0.1.0", openapi_url="/api/openapi.json")
    app.add_exception_handler(ApiError, api_error_handler)
    
    from fastapi.exceptions import RequestValidationError
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details = []
        for err in exc.errors():
            loc = " -> ".join(str(item) for item in err.get("loc", []))
            msg = err.get("msg", "invalid value")
            details.append(f"{loc}: {msg}")
        api_error = ApiError(
            "VALIDATION_ERROR",
            "The request payload failed validation.",
            status_code=422,
            details=details
        )
        return await api_error_handler(request, api_error)

    app.middleware("http")(request_id_middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "PUT"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Dev-User", "X-Dev-Roles"],
    )

    @app.get("/health/live")
    async def live():
        return {"status": "live", "service": settings.service_name}

    @app.get("/health/ready")
    async def ready():
        checks = {"api": "ok", "postgres": "unknown", "redis": "unknown", "keycloak": "unknown"}
        try:
            async with SessionLocal() as session:
                await session.execute(text("select 1"))
            checks["postgres"] = "ok"
        except Exception:
            checks["postgres"] = "failed"
        try:
            redis = Redis.from_url(str(settings.redis_url))
            await redis.ping()
            await redis.aclose()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "failed"
        now = time.monotonic()
        if now - _keycloak_health_cache["checked_at"] < KEYCLOAK_HEALTH_CACHE_TTL_SECONDS:
            checks["keycloak"] = _keycloak_health_cache["status"]
        else:
            try:
                discovery = f"{str(settings.oidc_issuer).rstrip('/')}/.well-known/openid-configuration"
                async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                    response = await client.get(discovery)
                checks["keycloak"] = "ok" if 200 <= response.status_code < 400 or response.status_code == 429 else "failed"
            except Exception:
                checks["keycloak"] = "failed"
            _keycloak_health_cache.update({"checked_at": now, "status": checks["keycloak"]})

        status = "ready" if all(value == "ok" for value in checks.values()) else "degraded"
        return {"status": status, "checks": checks}

    @app.get("/metrics")
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(v1_router, prefix=settings.api_base_path)
    return app


app = create_app()
