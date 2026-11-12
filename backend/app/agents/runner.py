"""
Agent execution runner.
Coordinates prompts, calls the LLM provider, validates the response,
and packages it into an AgentExecuteResponse with robust error handling and fallback.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from .prompts import get_system_prompt_for_role, build_user_prompt
from ..models.schemas import (
    AgentExecuteRequest,
    AgentExecuteResponse,
    ExecutionTimestamps,
    UsageInfo,
)
from ..providers.base import BaseLLMProvider

logger = logging.getLogger("agentsphere.agents.runner")


class AgentRunner:
    """Executes agent workflow steps safely with structured fallback."""

    def __init__(self, provider: BaseLLMProvider) -> None:
        self._provider = provider

    async def execute(self, req: AgentExecuteRequest) -> AgentExecuteResponse:
        started_at = datetime.now(timezone.utc).isoformat()

        system_prompt = get_system_prompt_for_role(req.role)
        user_prompt = build_user_prompt(
            role=req.role,
            mission=req.mission,
            context=req.context,
            prior_results=req.prior_results,
            evidence=req.user_provided_evidence,
        )

        try:
            raw_output = await self._provider.generate_role_response(
                role=req.role,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )
            summary = raw_output.get("summary", f"Completed step for role {req.role}")
            structured = raw_output.get("structuredOutput", {})
            evidence_refs = raw_output.get("evidenceReferences", [])
            warnings = raw_output.get("warnings", [])

        except Exception as e:
            logger.warning(f"Provider {self._provider.name} failed execution: {e}. Using safe fallback.")
            summary = f"Fallback execution for {req.role} (Provider error: {type(e).__name__})"
            structured = {
                "fallback": True,
                "errorDetail": str(e),
                "role": req.role,
            }
            evidence_refs = []
            warnings = [f"LLM Provider encounter: {str(e)[:150]}"]

        completed_at = datetime.now(timezone.utc).isoformat()

        execution_mode = "demo" if self._provider.name == "demo" else "live"

        return AgentExecuteResponse(
            run_id=req.run_id,
            node_id=req.node_id,
            role=req.role,
            summary=summary,
            structured_output=structured,
            evidence_references=evidence_refs,
            warnings=warnings,
            execution_mode=execution_mode,
            provider=self._provider.name,
            model=getattr(self._provider, "default_model", None),
            timestamps=ExecutionTimestamps(started_at=started_at, completed_at=completed_at),
            usage=UsageInfo(prompt_tokens=len(user_prompt) // 4, completion_tokens=len(summary) // 4, estimated=True),
        )
