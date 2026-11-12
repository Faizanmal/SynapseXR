"""
Agent execution and schema validation router.
Handles:
- POST /api/agent/execute
- POST /api/v1/agents/{role}/execute (frontend RemoteAIExecutor alias)
- POST /api/agent/validate
"""

from fastapi import APIRouter, Depends, HTTPException, status
from ..config import Settings, get_settings
from ..models.schemas import (
    AgentExecuteRequest,
    AgentExecuteResponse,
    ValidateRequest,
    ValidateResponse,
    ValidationIssue,
    AgentRole,
)
from ..providers.factory import get_llm_provider
from ..agents.runner import AgentRunner

router = APIRouter(tags=["Agent Execution"])


@router.post("/api/agent/execute", response_model=AgentExecuteResponse)
async def execute_agent(
    req: AgentExecuteRequest,
    settings: Settings = Depends(get_settings),
) -> AgentExecuteResponse:
    """Execute an agent stage with the active LLM provider."""
    provider = get_llm_provider(settings)
    runner = AgentRunner(provider=provider)
    return await runner.execute(req)


@router.post("/api/v1/agents/{role}/execute", response_model=AgentExecuteResponse)
async def execute_agent_by_role_path(
    role: str,
    req: AgentExecuteRequest,
    settings: Settings = Depends(get_settings),
) -> AgentExecuteResponse:
    """Frontend-compatible alias endpoint matching RemoteAIExecutor path."""
    valid_roles = ("planner", "researcher", "executor", "reviewer")
    normalized = role.lower().strip()
    if normalized not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid agent role in path: '{role}'. Supported roles: {list(valid_roles)}",
        )

    # Ensure payload role matches path role
    if req.role != normalized:
        req = req.model_copy(update={"role": normalized})

    provider = get_llm_provider(settings)
    runner = AgentRunner(provider=provider)
    return await runner.execute(req)


@router.post("/api/agent/validate", response_model=ValidateResponse)
async def validate_workflow_schema(req: ValidateRequest) -> ValidateResponse:
    """Validate a proposed workflow input or output schema."""
    issues = []

    if req.kind == "execute_request":
        try:
            AgentExecuteRequest.model_validate(req.payload)
        except Exception as e:
            issues.append(ValidationIssue(loc="payload", message=str(e)))
    elif req.kind == "agent_output":
        try:
            AgentExecuteResponse.model_validate(req.payload)
        except Exception as e:
            issues.append(ValidationIssue(loc="payload", message=str(e)))

    return ValidateResponse(
        valid=len(issues) == 0,
        kind=req.kind,
        errors=issues,
    )
