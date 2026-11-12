"""
Health check router.
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from ..models.schemas import HealthResponse
from .. import API_VERSION

router = APIRouter(tags=["System"])

SERVER_START_TIME = datetime.now(timezone.utc)


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Return current server health status, uptime, and version."""
    uptime_seconds = (datetime.now(timezone.utc) - SERVER_START_TIME).total_seconds()
    return HealthResponse(
        status="ok",
        version=API_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptimeSeconds=round(uptime_seconds, 2),
    )
