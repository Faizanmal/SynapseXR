"""
Unit and integration tests for /health and /api/capabilities.
Ensures zero secret leakage and correct capability inspection.
"""

from fastapi.testclient import TestClient
from pydantic import SecretStr
from backend.app.main import create_app
from backend.app.config import Settings


def test_health_check_returns_ok():
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0"
    assert "uptimeSeconds" in data
    assert "timestamp" in data


def test_capabilities_does_not_leak_secrets():
    settings = Settings(
        environment="development",
        llm_provider="gemini",
        gemini_api_key=SecretStr("sensitive_gemini_secret_key_12345"),
        openai_api_key=SecretStr("sensitive_openai_secret_key_67890"),
    )
    app = create_app(settings)
    client = TestClient(app)

    response = client.get("/api/capabilities")
    assert response.status_code == 200
    data = response.json()

    # Verify provider status without secret values
    providers = data["providers"]
    assert providers["gemini"]["configured"] is True
    assert providers["openai"]["configured"] is True

    # Assert secrets do NOT appear anywhere in the serialized payload
    body_text = response.text
    assert "sensitive_gemini_secret_key_12345" not in body_text
    assert "sensitive_openai_secret_key_67890" not in body_text
