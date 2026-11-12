"""
Main FastAPI Application Entrypoint for AgentSphere.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import API_VERSION
from .config import Settings, get_settings
from .security.rate_limiter import InMemoryRateLimiter
from .security.middleware import SecurityMiddleware
from .api import health_router, capabilities_router, agent_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agentsphere.app")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Factory creating configured FastAPI app instance."""
    app_settings = settings or get_settings()

    app = FastAPI(
        title="SynapseXR AI Swarm Engine",
        description="Secure multi-agent spatial workflow execution backend for Meta Quest VR.",
        version=API_VERSION,
        docs_url="/docs" if app_settings.environment != "production" else None,
        redoc_url=None,
    )

    # 1. CORS Middleware
    allowed_origins = [str(o) for o in app_settings.allowed_origins]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    # 2. Security & Rate Limiting Middleware
    rate_limiter = InMemoryRateLimiter(
        max_requests=app_settings.rate_limit_default_per_min,
        window_seconds=60.0,
    )
    app.add_middleware(
        SecurityMiddleware,
        settings=app_settings,
        rate_limiter=rate_limiter,
    )

    # 3. Exception handler for sanitizing unhandled exceptions
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred. Request ID logged.",
            },
        )

    # 4. Include routers
    app.include_router(health_router)
    app.include_router(capabilities_router)
    app.include_router(agent_router)

    app.dependency_overrides[get_settings] = lambda: app_settings

    return app


app = create_app()
