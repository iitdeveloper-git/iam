from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.responses import Response

from iitd_iam.api.v1.routes import router as v1_router
from iitd_iam.config import get_settings
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
        return {"status": "ready", "checks": {"api": "ok"}}

    @app.get("/metrics")
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(v1_router, prefix=settings.api_base_path)
    return app


app = create_app()

