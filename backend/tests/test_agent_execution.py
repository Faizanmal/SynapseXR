"""
Unit and integration tests for agent execution endpoints:
- POST /api/agent/execute
- POST /api/v1/agents/{role}/execute
- POST /api/agent/validate
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_app
from backend.app.config import Settings


@pytest.fixture
def client():
    settings = Settings(
        environment="test",
        llm_provider="none",
    )
    app = create_app(settings)
    return TestClient(app)


def test_planner_agent_execution(client):
    payload = {
        "runId": "run-test-001",
        "nodeId": "node-planner-1",
        "role": "planner",
        "mission": "Orchestrate automated CI/CD pipeline",
        "context": {"priority": "high"},
        "priorResults": [],
        "userProvidedEvidence": [],
    }

    response = client.post("/api/agent/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["runId"] == "run-test-001"
    assert data["nodeId"] == "node-planner-1"
    assert data["role"] == "planner"
    assert "phases" in data["structuredOutput"]
    assert len(data["structuredOutput"]["phases"]) == 3
    assert data["executionMode"] == "demo"
    assert "startedAt" in data["timestamps"]
    assert "completedAt" in data["timestamps"]


def test_researcher_agent_execution(client):
    payload = {
        "runId": "run-test-002",
        "nodeId": "node-research-1",
        "role": "researcher",
        "mission": "Investigate VR framerate bottlenecks",
        "context": {},
        "priorResults": [
            {
                "nodeId": "node-planner-1",
                "role": "planner",
                "summary": "Phase 1: Profile Three.js draw calls",
            }
        ],
        "userProvidedEvidence": [
            {
                "id": "evidence-1",
                "title": "IWSDK Profile Guide",
                "content": "Check draw calls and batched instances",
            }
        ],
    }

    response = client.post("/api/agent/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["role"] == "researcher"
    assert "findings" in data["structuredOutput"]
    assert data["structuredOutput"]["confidenceScore"] > 0.8
    assert len(data["evidenceReferences"]) > 0


def test_executor_agent_execution_via_frontend_path(client):
    # RemoteAIExecutor calls /api/v1/agents/{role}/execute
    payload = {
        "runId": "run-test-003",
        "nodeId": "node-executor-1",
        "role": "executor",
        "mission": "Generate workflow orchestration module",
        "context": {},
        "priorResults": [],
        "userProvidedEvidence": [],
    }

    response = client.post("/api/v1/agents/executor/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["role"] == "executor"
    assert data["structuredOutput"]["actionType"] == "SYNTHESIZE_ARTIFACT"
    assert "codeArtifact" in data["structuredOutput"]
    assert len(data["warnings"]) > 0  # Requires human approval warning


def test_reviewer_agent_execution(client):
    payload = {
        "runId": "run-test-004",
        "nodeId": "node-reviewer-1",
        "role": "reviewer",
        "mission": "Verify architecture safety invariants",
        "context": {},
        "priorResults": [],
        "userProvidedEvidence": [],
    }

    response = client.post("/api/agent/execute", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["role"] == "reviewer"
    assert data["structuredOutput"]["verdict"] == "APPROVED"
    assert data["structuredOutput"]["score"] >= 90.0


def test_invalid_role_rejected(client):
    payload = {
        "runId": "run-test-err",
        "nodeId": "node-err",
        "role": "hacker_bot",
        "mission": "Invalid role test",
    }
    response = client.post("/api/agent/execute", json=payload)
    assert response.status_code == 422  # Pydantic validation error


def test_validate_endpoint_valid_and_invalid(client):
    # Valid execution request
    valid_payload = {
        "kind": "execute_request",
        "payload": {
            "runId": "run-v-1",
            "nodeId": "node-v-1",
            "role": "planner",
            "mission": "Validate mission input",
        },
    }
    res_valid = client.post("/api/agent/validate", json=valid_payload)
    assert res_valid.status_code == 200
    assert res_valid.json()["valid"] is True

    # Invalid execution request missing required fields
    invalid_payload = {
        "kind": "execute_request",
        "payload": {
            "runId": "run-v-1",
            # missing nodeId, role, mission
        },
    }
    res_invalid = client.post("/api/agent/validate", json=invalid_payload)
    assert res_invalid.status_code == 200
    assert res_invalid.json()["valid"] is False
    assert len(res_invalid.json()["errors"]) > 0
