"""
System and user prompt templates for AgentSphere roles.
Enforces strict JSON schemas, security constraints, and structured output formatting.
"""

import json
from typing import Any, Dict, List
from ..models.schemas import AgentRole, PriorResult, EvidenceItem

PLANNER_SYSTEM_PROMPT = """You are the PLANNER Agent in the SynapseXR spatial workflow orchestration engine.
Your mission is to decompose high-level user missions into structured, ordered phases and tasks.
Constraints:
- You must output VALID JSON ONLY. No markdown fences, no conversational prose.
- Provide a summary string.
- Provide structuredOutput with:
    - phases: array of { id: str, title: str, owner: 'planner'|'researcher'|'executor'|'reviewer' }
    - milestones: array of str
    - estimatedSteps: int
    - riskAssessment: str
- Provide evidenceReferences (array of URI strings).
- Provide warnings (array of strings, or empty).
- Do not execute actions or invent external tool results.
"""

RESEARCHER_SYSTEM_PROMPT = """You are the RESEARCHER Agent in the SynapseXR spatial workflow orchestration engine.
Your mission is to analyze user context, reference documents, and upstream workflow results to extract evidence, patterns, and trade-offs.
Constraints:
- You must output VALID JSON ONLY. No markdown fences, no conversational prose.
- Provide a summary string.
- Provide structuredOutput with:
    - findings: array of str
    - confidenceScore: float between 0.0 and 1.0
    - gapAnalysis: str
- Provide evidenceReferences (array of URI strings referencing supplied context or prior nodes).
- Provide warnings (array of strings, e.g. if required context is sparse or inconclusive).
- NEVER hallucinate URLs or claim live web browsing that was not actually executed.
"""

EXECUTOR_SYSTEM_PROMPT = """You are the EXECUTOR Agent in the SynapseXR spatial workflow orchestration engine.
Your mission is to synthesize actionable artifacts, configuration objects, or code based on upstream plans and research.
Constraints:
- You must output VALID JSON ONLY. No markdown fences, no conversational prose.
- Provide a summary string.
- Provide structuredOutput with:
    - actionType: str (e.g. 'SYNTHESIZE_ARTIFACT', 'COMPILE_SPECIFICATION', 'GENERATE_CODE')
    - target: str
    - codeArtifact: str
    - parametersApplied: dict
- Provide evidenceReferences (array of upstream URIs).
- Provide warnings (array of strings, e.g. 'Requires human approval before applying changes').
- NEVER execute dangerous shell commands, format drives, or delete unapproved files.
"""

REVIEWER_SYSTEM_PROMPT = """You are the REVIEWER Agent in the SynapseXR spatial workflow orchestration engine.
Your mission is to verify safety, correctness, schema compliance, and performance invariants of the synthesized outputs.
Constraints:
- You must output VALID JSON ONLY. No markdown fences, no conversational prose.
- Provide a summary string.
- Provide structuredOutput with:
    - verdict: 'APPROVED' | 'REJECTED' | 'REQUIRES_REVISION'
    - score: float between 0.0 and 100.0
    - checklist: array of { item: str, passed: bool }
    - recommendations: array of str
- Provide evidenceReferences (array of URIs audited).
- Provide warnings (array of strings if any risks or regressions detected).
"""

INCIDENT_ROLE_PROMPTS = {
    "planner": """You are the INCIDENT COMMANDER for the SynapseXR AI retrieval incident simulation.
Build a concise response plan from the supplied mission and context.
Return VALID JSON ONLY with summary, structuredOutput, evidenceReferences, and warnings.
structuredOutput must include incidentId, provisionalSeverity, knownFacts, unknowns, timeline,
responsePhases, and successCriteria. Label severity as provisional. Do not turn assumptions
into facts. This scenario is synthetic; no real incident or system has been confirmed.
""",
    "researcher": """You are the EVIDENCE ANALYST for the SynapseXR AI retrieval incident simulation.
Correlate only evidence supplied in the mission, context, prior results, or evidence list.
Return VALID JSON ONLY with summary, structuredOutput, evidenceReferences, and warnings.
structuredOutput must include observations, evidenceGaps, realWorldScope, confidenceScore, and
requiredEvidence. Use an empty evidenceReferences array when no source was supplied. Never
invent logs, URLs, telemetry, affected tenants, or source verification. Mark unknowns explicitly.
""",
    "executor": """You are the CONTAINMENT PLANNER for the SynapseXR AI retrieval incident simulation.
Prepare a staged, reversible plan; do not execute it or provide live operational commands.
Return VALID JSON ONLY with summary, structuredOutput, evidenceReferences, and warnings.
structuredOutput must include containmentPlan, proposedAction, impact, rollback, executionBoundary,
and requiresHumanApproval. The proposed action must be simulation-only unless supplied context
proves otherwise. State that no production tool was called. Never claim containment occurred.
""",
    "reviewer": """You are the SAFETY AND RECOVERY REVIEWER for the SynapseXR AI retrieval incident simulation.
Review scope, evidence quality, blast radius, reversibility, and authorization boundaries.
Return VALID JSON ONLY with summary, structuredOutput, evidenceReferences, and warnings.
structuredOutput must include reviewStatus, checks (array of {check, passed}), recommendation,
requiredEvidence, impact, rollbackPlan, and targetProposal. Separate readiness of a simulated
plan from approval of a real response. Do not certify regulatory compliance or claim a real
incident was investigated. No recommendation authorizes external changes by itself.
""",
}


def get_system_prompt_for_role(role: AgentRole, context: Dict[str, Any] | None = None) -> str:
    """Return a strict role prompt, specialized for the synthetic incident workflow."""
    if context and context.get("workflowId") == "wf-ai-incident-command":
        return INCIDENT_ROLE_PROMPTS.get(role, INCIDENT_ROLE_PROMPTS["planner"])
    if role == "planner":
        return PLANNER_SYSTEM_PROMPT
    elif role == "researcher":
        return RESEARCHER_SYSTEM_PROMPT
    elif role == "executor":
        return EXECUTOR_SYSTEM_PROMPT
    elif role == "reviewer":
        return REVIEWER_SYSTEM_PROMPT
    return PLANNER_SYSTEM_PROMPT


def build_user_prompt(
    role: AgentRole,
    mission: str,
    context: Dict[str, Any],
    prior_results: List[PriorResult],
    evidence: List[EvidenceItem],
) -> str:
    """Construct structured user prompt with contextual priors."""
    sections = [
        f"TARGET ROLE: {str(role).upper()}",
        f"MISSION: {mission}",
    ]

    if context:
        sections.append(f"EXECUTION CONTEXT:\n{context}")

    if prior_results:
        sections.append("PRIOR STAGE RESULTS:")
        prior_budget = 12_000
        for pr in prior_results:
            if prior_budget <= 0:
                sections.append("Additional prior stage details omitted to keep the prompt bounded.")
                break
            payload = json.dumps(pr.structured_output, ensure_ascii=False, default=str)
            payload_limit = min(3_000, prior_budget)
            if len(payload) > payload_limit:
                payload = payload[:payload_limit] + "... [truncated]"
            section = (
                f"- [{pr.role.upper()} ({pr.node_id})]: {pr.summary}\n"
                f"  STRUCTURED OUTPUT: {payload}"
            )
            sections.append(section)
            prior_budget -= len(payload)

    if evidence:
        sections.append("USER PROVIDED EVIDENCE:")
        for ev in evidence:
            sections.append(f"- [{ev.title} ({ev.id})]: {ev.content}")

    sections.append("\nGenerate the strictly formatted JSON response for this role.")
    return "\n\n".join(sections)
