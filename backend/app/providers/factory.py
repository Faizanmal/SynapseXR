"""
Provider factory for selecting and configuring the active LLM provider.
"""

from typing import Dict, Any
from .base import BaseLLMProvider
from .demo import DemoProvider
from .gemini import GeminiProvider
from .openai_provider import OpenAIProvider
from ..config import Settings


def get_llm_provider(settings: Settings) -> BaseLLMProvider:
    """Return configured provider based on settings."""
    provider_name = settings.llm_provider.lower().strip()

    if provider_name == "gemini":
        gemini_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else ""
        if gemini_key:
            return GeminiProvider(
                api_key=gemini_key,
                default_model=settings.resolved_model or "gemini-2.5-flash",
                base_url=settings.gemini_base_url,
                timeout_seconds=settings.request_timeout_s,
            )
        # Fallback to demo if key is missing
        return DemoProvider()

    elif provider_name == "openai":
        openai_key = settings.openai_api_key.get_secret_value() if settings.openai_api_key else ""
        if openai_key:
            return OpenAIProvider(
                api_key=openai_key,
                default_model=settings.resolved_model or "gpt-4o-mini",
                base_url=settings.openai_base_url,
                timeout_seconds=settings.request_timeout_s,
            )
        # Fallback to demo if key is missing
        return DemoProvider()

    # Default fallback
    return DemoProvider()


def get_provider_capabilities(settings: Settings) -> Dict[str, Any]:
    """Inspect configured providers without exposing any secret keys."""
    has_gemini = bool(settings.gemini_api_key and settings.gemini_api_key.get_secret_value())
    has_openai = bool(settings.openai_api_key and settings.openai_api_key.get_secret_value())

    return {
        "activeProvider": settings.llm_provider,
        "providers": {
            "demo": {
                "available": True,
                "configured": True,
                "models": ["agentsphere-demo-v1"],
            },
            "gemini": {
                "available": True,
                "configured": has_gemini,
                "models": [settings.resolved_model] if (has_gemini and settings.llm_provider == "gemini") else ["gemini-2.5-flash"],
            },
            "openai": {
                "available": True,
                "configured": has_openai,
                "models": [settings.resolved_model] if (has_openai and settings.llm_provider == "openai") else ["gpt-4o-mini"],
            },
        },
    }
