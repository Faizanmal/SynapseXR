"""
Capabilities endpoint.
Returns supported models, modes, and feature flags without leaking secrets.
"""

from fastapi import APIRouter, Depends
from ..config import Settings, get_settings
from ..providers.factory import get_provider_capabilities

router = APIRouter(tags=["System"])


@router.get("/api/capabilities")
async def get_capabilities(settings: Settings = Depends(get_settings)):
    """Return available models, active providers, and feature configuration."""
    provider_info = get_provider_capabilities(settings)
    return {
        "service": "AgentSphere AI Orchestration Engine",
        "version": "1.0",
        "environment": settings.environment,
        "activeProvider": provider_info["activeProvider"],
        "providers": provider_info["providers"],
        "features": {
            "rateLimiting": True,
            "maxPayloadBytes": settings.max_request_bytes,
            "timeoutSeconds": settings.request_timeout_s,
            "spatialWorkflowsSupported": True,
        },
    }
