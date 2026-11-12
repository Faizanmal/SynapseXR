"""Versioned public API models (API v1.0).

All request models forbid unknown fields and bound every string/list so that
oversized or malformed payloads are rejected before reaching any agent or provider.
"""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app import API_VERSION

AgentRole = Literal["planner", "researcher", "executor", "reviewer"]
ExecutionMode = Literal["live", "demo"]

IDENTIFIER_PATTERN = r"^[A-Za-z0-9_\-:.]{1,128}$"
MAX_CONTEXT_JSON_CHARS = 16_000
MAX_STRUCTURED_JSON_CHARS = 24_000


def _json_size(value: Any) -> int:
    return len(json.dumps(value, ensure_ascii=False, default=str))


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        str_strip_whitespace=True,
    )


class PriorResult(ApiModel):
    node_id: str = Field(pattern=IDENTIFIER_PATTERN)
    role: AgentRole
    summary: str = Field(default="", max_length=4000)
    structured_output: dict[str, Any] = Field(default_factory=dict)

    @field_validator("structured_output")
    @classmethod
    def _bound_structured(cls, value: dict[str, Any]) -> dict[str, Any]:
        if _json_size(value) > MAX_STRUCTURED_JSON_CHARS:
            raise ValueError(f"structuredOutput exceeds {MAX_STRUCTURED_JSON_CHARS} characters")
        return value


class EvidenceItem(ApiModel):
    id: str = Field(pattern=IDENTIFIER_PATTERN)
    title: str = Field(min_length=1, max_length=300)
    content: str = Field(min_length=1, max_length=8000)


class AgentExecuteRequest(ApiModel):
    run_id: str = Field(pattern=IDENTIFIER_PATTERN)
    node_id: str = Field(pattern=IDENTIFIER_PATTERN)
    role: AgentRole
    mission: str = Field(min_length=1, max_length=4000)
    context: dict[str, Any] = Field(default_factory=dict)
    prior_results: list[PriorResult] = Field(default_factory=list, max_length=16)
    user_provided_evidence: list[EvidenceItem] = Field(default_factory=list, max_length=20)

    @field_validator("context")
    @classmethod
    def _bound_context(cls, value: dict[str, Any]) -> dict[str, Any]:
        if _json_size(value) > MAX_CONTEXT_JSON_CHARS:
            raise ValueError(f"context exceeds {MAX_CONTEXT_JSON_CHARS} characters")
        return value

    @field_validator("user_provided_evidence")
    @classmethod
    def _unique_evidence_ids(cls, value: list[EvidenceItem]) -> list[EvidenceItem]:
        ids = [item.id for item in value]
        if len(ids) != len(set(ids)):
            raise ValueError("userProvidedEvidence ids must be unique")
        return value


class ExecutionTimestamps(ApiModel):
    started_at: str
    completed_at: str


class UsageInfo(ApiModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    estimated: bool = False
    provider_calls: int = 0


class AgentExecuteResponse(ApiModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")

    api_version: str = API_VERSION
    run_id: str
    node_id: str
    role: AgentRole
    summary: str = Field(max_length=2000)
    structured_output: dict[str, Any]
    evidence_references: list[str]
    warnings: list[str]
    execution_mode: ExecutionMode
    provider: str | None = None
    model: str | None = None
    timestamps: ExecutionTimestamps
    usage: UsageInfo


ValidationKind = Literal["execute_request", "agent_output"]


class ValidateRequest(ApiModel):
    kind: ValidationKind
    role: AgentRole | None = None
    payload: dict[str, Any]

    @field_validator("payload")
    @classmethod
    def _bound_payload(cls, value: dict[str, Any]) -> dict[str, Any]:
        if _json_size(value) > 64_000:
            raise ValueError("payload exceeds 64000 characters")
        return value


class ValidationIssue(ApiModel):
    loc: str
    message: str


class ValidateResponse(ApiModel):
    api_version: str = API_VERSION
    valid: bool
    kind: ValidationKind
    errors: list[ValidationIssue]


class ErrorResponse(ApiModel):
    error: str
    message: str


class HealthResponse(ApiModel):
    status: str = "ok"
    version: str = API_VERSION
    timestamp: str
    uptime_seconds: float


