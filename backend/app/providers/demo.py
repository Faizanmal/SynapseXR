"""
Deterministic Demo Provider for AgentSphere.
Produces realistic, role-conforming structured responses without external API calls.
"""

from typing import Any, Dict, Optional
from .base import BaseLLMProvider
from ..models.schemas import AgentRole


class DemoProvider(BaseLLMProvider):
    """Deterministic offline demo provider."""

    @property
    def name(self) -> str:
        return "demo"

    @property
    def default_model(self) -> str:
        return "agentsphere-demo-v1"

    async def generate_role_response(
        self,
        role: AgentRole,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate structured offline demo output based on role."""
        if role == "planner":
            return {
                "summary": "Decomposed mission into 3 sequential execution phases and milestones.",
                "structuredOutput": {
                    "phases": [
                        {"id": "phase-1", "title": "Requirements & Context Gathering", "owner": "researcher"},
                        {"id": "phase-2", "title": "Implementation & Synthesis", "owner": "executor"},
                        {"id": "phase-3", "title": "Safety & Policy Verification", "owner": "reviewer"},
                    ],
                    "milestones": ["M1: Target Definition", "M2: Prototype Synthesis", "M3: Sign-Off"],
                    "estimatedSteps": 3,
                    "riskAssessment": "Low risk; dependencies verified.",
                },
                "evidenceReferences": ["mission://spec/v1", "policy://orchestration/dag"],
                "warnings": [],
            }

        elif role == "researcher":
            return {
                "summary": "Synthesized evidence and architectural patterns from user context and prior results.",
                "structuredOutput": {
                    "findings": [
                        "AgentSphere DAG architecture guarantees bounded execution and zero cyclic dependencies.",
                        "Three.js procedural rendering maintains steady 72-90 FPS in Meta Quest 3 WebXR session.",
                        "Structured JSON schema enforcement prevents LLM prompt injection and payload malformation.",
                    ],
                    "confidenceScore": 0.96,
                    "gapAnalysis": "External live web access disabled in demo mode; synthesized from supplied references.",
                },
                "evidenceReferences": [
                    "doc://agentsphere/architecture-spec",
                    "doc://meta-vr/iwsdk-best-practices",
                ],
                "warnings": [
                    "Demo mode: Live web search is simulated using supplied context references."
                ],
            }

        elif role == "executor":
            return {
                "summary": "Generated executable artifact and configuration specification for AgentSphere.",
                "structuredOutput": {
                    "actionType": "SYNTHESIZE_ARTIFACT",
                    "target": "src/workflows/orchestrator.ts",
                    "codeArtifact": (
                        "// Generated AgentSphere Workflow Orchestration Module\n"
                        "export const workflowPipeline = Object.freeze({\n"
                        "  runtime: 'IWSDK_v0.2.1',\n"
                        "  targetFramerate: 90,\n"
                        "  concurrencyLimit: 4,\n"
                        "});\n"
                    ),
                    "parametersApplied": {"optimizeForVR": True, "strictTypeCheck": True},
                },
                "evidenceReferences": [
                    "execution://planner/phase-2",
                    "execution://researcher/findings",
                ],
                "warnings": [
                    "Action requires human approval before writing to production filesystem."
                ],
            }

        elif role == "reviewer":
            return {
                "summary": "Completed comprehensive audit for safety, schema compliance, and performance bounds.",
                "structuredOutput": {
                    "verdict": "APPROVED",
                    "score": 98.5,
                    "checklist": [
                        {"item": "Schema compliance", "passed": True},
                        {"item": "No cyclic dependencies", "passed": True},
                        {"item": "Secret isolation preserved", "passed": True},
                        {"item": "Bounds checking & rate limits active", "passed": True},
                    ],
                    "recommendations": [
                        "Proceed with execution pipeline; all safety invariant checks passed."
                    ],
                },
                "evidenceReferences": [
                    "audit://executor/artifact-validation",
                    "policy://meta-vr/contest-guidelines",
                ],
                "warnings": [],
            }

        # Fallback for any unexpected role
        return {
            "summary": f"Executed step for role: {role}",
            "structuredOutput": {"status": "success", "role": role},
            "evidenceReferences": [],
            "warnings": [],
        }
