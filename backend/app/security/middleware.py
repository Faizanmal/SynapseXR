"""
Security middleware and request bounds enforcement for AgentSphere.
Enforces request body size limits, security headers, and rate limiting.
"""

from typing import Callable, Awaitable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from .rate_limiter import InMemoryRateLimiter
from ..config import Settings


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces:
    1. Maximum request body size (rejects 413 Payload Too Large)
    2. Rate limiting per client IP (rejects 429 Too Many Requests)
    3. Essential security headers (X-Content-Type-Options, etc.)
    """

    def __init__(
        self,
        app,
        settings: Settings,
        rate_limiter: InMemoryRateLimiter,
    ) -> None:
        super().__init__(app)
        self.settings = settings
        self.rate_limiter = rate_limiter

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # 1. Enforce content-length limit
        content_length_str = request.headers.get("content-length")
        if content_length_str:
            try:
                content_length = int(content_length_str)
                if content_length > self.settings.max_request_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={
                            "error": "Payload Too Large",
                            "message": f"Request body exceeds maximum allowed size of {self.settings.max_request_bytes} bytes.",
                        },
                    )
            except ValueError:
                pass

        # 2. Enforce rate limiting
        client_ip = request.client.host if request.client else "unknown"
        if not self.rate_limiter.is_allowed(client_ip):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Please wait before retrying.",
                },
            )

        # 3. Process request
        response = await call_next(request)

        # 4. Inject security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response
