"""
In-memory sliding-window rate limiter for AgentSphere API endpoints.
Limits requests per IP over a fixed time window.
"""

import time
from collections import defaultdict
from typing import Dict, List


class InMemoryRateLimiter:
    """Sliding window rate limiter."""

    def __init__(self, max_requests: int = 60, window_seconds: float = 60.0) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._records: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_id: str) -> bool:
        """Check if client_id is within rate limit; record timestamp if allowed."""
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = self._records[client_id]
        # Purge timestamps outside the window
        valid_timestamps = [t for t in timestamps if t > cutoff]
        self._records[client_id] = valid_timestamps

        if len(valid_timestamps) >= self.max_requests:
            return False

        self._records[client_id].append(now)
        return True

    def reset(self) -> None:
        """Clear all rate limit records (useful for testing)."""
        self._records.clear()
