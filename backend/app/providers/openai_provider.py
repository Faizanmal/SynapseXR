"""
OpenAI / OpenAI-compatible LLM Provider for AgentSphere.
Uses httpx to call chat/completions with response_format={"type": "json_object"}.
"""

import json
import logging
from typing import Any, Dict, Optional
import httpx

from .base import BaseLLMProvider
from ..models.schemas import AgentRole

logger = logging.getLogger("agentsphere.providers.openai")


class OpenAIProvider(BaseLLMProvider):
    """OpenAI / Compatible Provider."""

    def __init__(
        self,
        api_key: str,
        default_model: str = "gpt-4o",
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 30.0,
    ) -> None:
        self._api_key = api_key
        self._default_model = default_model
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    @property
    def name(self) -> str:
        return "openai"

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
        """Call /chat/completions with json_object format."""
        target_model = model or self._default_model
        endpoint = f"{self._base_url}/chat/completions"

        payload = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": temperature,
        }

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"OpenAI API returned HTTP {e.response.status_code}: {e.response.text}")
                raise RuntimeError(f"OpenAI API HTTP error: {e.response.status_code}")
            except Exception as e:
                logger.error(f"OpenAI request failed: {e}")
                raise RuntimeError(f"OpenAI communication failed: {str(e)}")

        try:
            choices = data.get("choices", [])
            if not choices:
                raise ValueError("No choices returned from OpenAI API")
            content_str = choices[0].get("message", {}).get("content", "{}")
            parsed = json.loads(content_str)
            return parsed
        except (json.JSONDecodeError, KeyError, IndexError, ValueError) as parse_err:
            logger.error(f"Failed to parse structured JSON from OpenAI choice: {parse_err}")
            raise RuntimeError(f"Invalid JSON returned by OpenAI: {parse_err}")
