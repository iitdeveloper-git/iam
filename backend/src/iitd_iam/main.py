from fastapi import FastAPI
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


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="IITD IAM API", version="0.1.0", openapi_url="/api/openapi.json")
    app.add_exception_handler(ApiError, api_error_handler)
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
        try:
            discovery = f"{str(settings.oidc_issuer).rstrip('/')}/.well-known/openid-configuration"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(discovery)
                response.raise_for_status()
            checks["keycloak"] = "ok"
        except Exception:
            checks["keycloak"] = "failed"

        status = "ready" if all(value == "ok" for value in checks.values()) else "degraded"
        return {"status": status, "checks": checks}

    @app.get("/metrics")
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(v1_router, prefix=settings.api_base_path)
    return app


app = create_app()
