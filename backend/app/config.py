"""Typed service configuration loaded from environment variables.

Secrets are wrapped in ``SecretStr`` so they never appear in reprs, logs or responses.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

from pydantic import SecretStr

ProviderName = Literal["none", "gemini", "openai"]

DEFAULT_MODELS: dict[str, str] = {
    "gemini": "gemini-2.5-flash",
    "openai": "gpt-4o-mini",
}

_LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


def _read_int(name: str, default: int, low: int, high: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be an integer") from exc
    return max(low, min(high, value))


def _read_float(name: str, default: float, low: float, high: float) -> float:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be a number") from exc
    return max(low, min(high, value))


def _read_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _load_env_file() -> None:
    """Best-effort loader for local .env files (e.g. backend/.env or root .env)."""
    candidates = (
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), "backend", ".env"),
    )
    for path in candidates:
        norm = os.path.normpath(path)
        if os.path.isfile(norm):
            try:
                with open(norm, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass


def _read_secret(name: str) -> SecretStr | None:
    raw = os.environ.get(name, "").strip()
    return SecretStr(raw) if raw else None


def is_local_url(url: str) -> bool:
    return (urlparse(url).hostname or "") in _LOCAL_HOSTS


def validate_provider_base_url(url: str) -> str:
    """Only fixed, operator-configured HTTPS endpoints (or plain HTTP on localhost) are allowed."""
    parsed = urlparse(url.strip())
    if parsed.scheme == "https" and parsed.hostname:
        return url.strip().rstrip("/")
    if parsed.scheme == "http" and (parsed.hostname or "") in _LOCAL_HOSTS:
        return url.strip().rstrip("/")
    raise ValueError("Provider base URL must use https (plain http is only allowed for localhost)")


def parse_origins(raw: str) -> tuple[str, ...]:
    origins: list[str] = []
    for item in raw.split(","):
        origin = item.strip().rstrip("/")
        if not origin:
            continue
        if origin == "*":
            raise ValueError("ALLOWED_ORIGINS must be an explicit allowlist; '*' is not permitted")
        # Handle cases where double scheme is accidentally introduced via env vars
        while origin.startswith(("https://https://", "http://https://", "https://http://")):
            origin = origin[origin.index("://") + 3:]
        if not origin.startswith(("http://", "https://")):
            origin = f"https://{origin}"
        parsed = urlparse(origin)
        if parsed.scheme in {"http", "https"} and parsed.hostname:
            origins.append(origin)
    return tuple(dict.fromkeys(origins))


@dataclass(frozen=True)
class Settings:
    environment: str = "development"
    llm_provider: ProviderName = "none"
    llm_model: str = ""
    gemini_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    openai_base_url: str = "https://api.openai.com/v1"
    request_timeout_s: float = 30.0
    max_retries: int = 2
    retry_backoff_s: float = 0.5
    agent_timeout_s: float = 90.0
    max_output_tokens: int = 2048
    max_prompt_chars: int = 24000
    max_response_chars: int = 60000
    max_request_bytes: int = 262_144
    allowed_origins: tuple[str, ...] = ("https://localhost:8081", "http://localhost:8081")
    rate_limit_execute_per_min: int = 20
    rate_limit_default_per_min: int = 120
    trust_proxy_headers: bool = False
    access_token: SecretStr | None = None

    @property
    def resolved_model(self) -> str:
        if self.llm_provider == "none":
            return ""
        return self.llm_model or DEFAULT_MODELS[self.llm_provider]

    @property
    def live_enabled(self) -> bool:
        return self.llm_provider != "none"

    def secret_values(self) -> tuple[str, ...]:
        """Raw secret strings, used only for redaction checks."""
        secrets = (self.gemini_api_key, self.openai_api_key, self.access_token)
        return tuple(s.get_secret_value() for s in secrets if s is not None)

    @classmethod
    def from_env(cls) -> Settings:
        _load_env_file()
        gemini_key = _read_secret("GEMINI_API_KEY")
        openai_key = _read_secret("OPENAI_API_KEY")
        openai_base = validate_provider_base_url(
            os.environ.get("OPENAI_BASE_URL", "").strip() or "https://api.openai.com/v1"
        )
        openai_usable = openai_key is not None or is_local_url(openai_base)

        requested = os.environ.get("LLM_PROVIDER", "auto").strip().lower() or "auto"
        provider: ProviderName
        if requested == "auto":
            provider = "gemini" if gemini_key else ("openai" if openai_key else "none")
        elif requested in {"none", "demo"}:
            provider = "none"
        elif requested == "gemini":
            provider = "gemini" if gemini_key else "none"
        elif requested == "openai":
            provider = "openai" if openai_usable else "none"
        else:
            raise ValueError("LLM_PROVIDER must be one of: auto, none, gemini, openai")

        return cls(
            environment=os.environ.get("ENVIRONMENT", "development").strip() or "development",
            llm_provider=provider,
            llm_model=os.environ.get("LLM_MODEL", "").strip(),
            gemini_api_key=gemini_key,
            openai_api_key=openai_key,
            openai_base_url=openai_base,
            request_timeout_s=_read_float("REQUEST_TIMEOUT_S", 30.0, 1.0, 120.0),
            max_retries=_read_int("MAX_RETRIES", 2, 0, 5),
            retry_backoff_s=_read_float("RETRY_BACKOFF_S", 0.5, 0.0, 10.0),
            agent_timeout_s=_read_float("AGENT_TIMEOUT_S", 90.0, 5.0, 300.0),
            max_output_tokens=_read_int("MAX_OUTPUT_TOKENS", 2048, 256, 8192),
            max_prompt_chars=_read_int("MAX_PROMPT_CHARS", 24000, 2000, 200_000),
            max_response_chars=_read_int("MAX_RESPONSE_CHARS", 60000, 2000, 400_000),
            max_request_bytes=_read_int("MAX_REQUEST_BYTES", 262_144, 4096, 2_097_152),
            allowed_origins=parse_origins(
                os.environ.get("ALLOWED_ORIGINS", "https://localhost:8081,http://localhost:8081")
            ),
            rate_limit_execute_per_min=_read_int("RATE_LIMIT_EXECUTE_PER_MIN", 20, 1, 10_000),
            rate_limit_default_per_min=_read_int("RATE_LIMIT_DEFAULT_PER_MIN", 120, 1, 100_000),
            trust_proxy_headers=_read_bool("TRUST_PROXY_HEADERS", False),
            access_token=_read_secret("ACCESS_TOKEN"),
        )


_cached_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached or newly initialized application settings."""
    global _cached_settings
    if _cached_settings is None:
        _cached_settings = Settings.from_env()
    return _cached_settings


def reset_settings_cache() -> None:
    """Reset cached settings (for test isolation)."""
    global _cached_settings
    _cached_settings = None


