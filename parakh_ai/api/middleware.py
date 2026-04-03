import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("parakh_ai.api")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # We don't log health check strictly
        path = request.url.path
        if "/health" in path:
            return await call_next(request)
            
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000
        logger.info(
            f"Method: {request.method} Path: {request.url.path} "
            f"Status: {response.status_code} "
            f"Time: {process_time:.2f}ms"
        )
        return response
