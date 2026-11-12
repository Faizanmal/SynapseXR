"""
Tests for security middleware, rate limiting, and size boundaries.
"""

from fastapi.testclient import TestClient
from backend.app.main import create_app
from backend.app.config import Settings


def test_rate_limiter_blocks_burst():
    # Configure tiny rate limit for test
    settings = Settings(
        environment="test",
        rate_limit_default_per_min=5,
    )
    app = create_app(settings)
    client = TestClient(app)

    # First 5 requests should succeed
    for _ in range(5):
        resp = client.get("/health")
        assert resp.status_code == 200

    # 6th request should hit 429
    resp_blocked = client.get("/health")
    assert resp_blocked.status_code == 429
    assert "Rate limit exceeded" in resp_blocked.json()["message"]


def test_oversized_payload_rejected():
    # Limit max payload to 1 KB (1024 bytes)
    settings = Settings(
        environment="test",
        max_request_bytes=1024,
    )
    app = create_app(settings)
    client = TestClient(app)

    # Send payload exceeding 1KB
    huge_data = {"junk": "x" * 2000}
    resp = client.post("/api/agent/validate", json={"schemaType": "test", "data": huge_data})
    assert resp.status_code == 413
    assert resp.json()["error"] == "Payload Too Large"


def test_security_headers_present():
    app = create_app()
    client = TestClient(app)

    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert "strict-origin" in resp.headers.get("Referrer-Policy", "")
