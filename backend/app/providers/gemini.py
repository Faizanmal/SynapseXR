"""
Google Gemini LLM Provider for AgentSphere.
Uses httpx directly to communicate with Gemini REST API with strict timeouts, structured JSON mode, and secret isolation.
"""

import json
import logging
from typing import Any, Dict, Optional
import httpx

from .base import BaseLLMProvider
from ..models.schemas import AgentRole

logger = logging.getLogger("agentsphere.providers.gemini")


class GeminiProvider(BaseLLMProvider):
    """Google Gemini API Provider."""

    def __init__(
        self,
        api_key: str,
        default_model: str = "gemini-1.5-pro",
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self._default_model = default_model
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def default_model(self) -> str:
        return self._default_model

    async def generate_role_response(
        self,
        role: AgentRole,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call Gemini REST API requesting application/json response_mime_type."""
        target_model = model or self._default_model
        endpoint = f"{self._base_url}/models/{target_model}:generateContent"

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": temperature,
            },
        }

        headers = {
            "x-goog-api-key": self._api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Gemini API returned HTTP {e.response.status_code}: {e.response.text}")
                raise RuntimeError(f"Gemini API HTTP error: {e.response.status_code}")
            except Exception as e:
                logger.error(f"Gemini request failed: {e}")
                raise RuntimeError(f"Gemini communication failed: {str(e)}")

        # Parse text from candidate
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini API")
            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            if not parts:
                raise ValueError("Empty candidate content from Gemini API")
            raw_text = parts[0].get("text", "{}")
            parsed = json.loads(raw_text)
            return parsed
        except (json.JSONDecodeError, KeyError, IndexError, ValueError) as parse_err:
            logger.error(f"Failed to parse structured JSON from Gemini candidate: {parse_err}")
            raise RuntimeError(f"Invalid JSON returned by Gemini: {parse_err}")

