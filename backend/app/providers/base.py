"""
Abstract base class for LLM providers in AgentSphere.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from ..models.schemas import AgentRole


class BaseLLMProvider(ABC):
    """Abstract interface for LLM execution providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model name."""
        pass

    @abstractmethod
    async def generate_role_response(
        self,
        role: AgentRole,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a structured JSON response for the given role.
        Must return a parsed dictionary conforming to the role's output schema.
        """
        pass

