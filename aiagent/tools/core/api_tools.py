"""
Knowted Backend API Integration Tools

Tools for calling Knowted's NestJS backend API.
"""

import os
from typing import Any, Dict, Optional, Tuple

import httpx
from langchain_core.tools import tool

# Try to import get_config from different possible locations
try:
    from langgraph.config import get_config
except ImportError:
    try:
        from langchain_core.runnables.config import get_config
    except ImportError:
        try:
            from langchain_core.runnables import get_config
        except ImportError:
            # Fallback: get_config might not be available in this version
            get_config = None

# Get API configuration from environment
KNOWTED_API_URL = os.getenv("KNOWTED_API_URL", "http://localhost:3000")
KNOWTED_API_KEY = os.getenv("KNOWTED_API_KEY", "")
# Internal service secret for service-to-service authentication (preferred for AI agent)
INTERNAL_SERVICE_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "")


def get_context_from_config() -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Get organization_id, user_id, and internal_service_secret from LangGraph execution context.

    This is the standard LangGraph way to access runtime config.
    The config is automatically available in the execution context when
    the agent is invoked with config.configurable containing these values.

    Returns:
        Tuple of (organization_id, user_id, internal_service_secret) or (None, None, None) if not found
    """
    if get_config is None:
        return None, None, None

    try:
        config = get_config()
        if config:
            configurable = config.get("configurable", {})
            organization_id = configurable.get("organization_id")
            user_id = configurable.get("user_id")
            internal_service_secret = configurable.get("internal_service_secret")

            # DEBUG: Log what we got from config
            if internal_service_secret:
                print(
                    f"[DEBUG] internal_service_secret from config: {internal_service_secret[:30]}... (length: {len(internal_service_secret)})"
                )
            else:
                print("[DEBUG] internal_service_secret from config: None or empty")

            # FALLBACK: If secret from config is too short (likely truncated), use env var
            # The full secret should be 54 characters: "knowted-ai-agent-secret-2025-change-this-in-production"
            if internal_service_secret and len(internal_service_secret) < 50:
                print(
                    f"[DEBUG] Secret from config is too short ({len(internal_service_secret)} chars), using env var fallback"
                )
                internal_service_secret = INTERNAL_SERVICE_SECRET
                if internal_service_secret:
                    print(
                        f"[DEBUG] Using env var secret: {internal_service_secret[:30]}... (length: {len(internal_service_secret)})"
                    )

            return organization_id, user_id, internal_service_secret
    except Exception as ex:
        # get_config() may not be available in all contexts
        print(f"[DEBUG] Error getting config: {ex}")
        pass

    return None, None, None


async def _make_api_request(
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    organization_id: Optional[str] = None,
    user_id: Optional[str] = None,
    internal_service_secret: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Make a request to Knowted backend API using service-to-service authentication.

    Args:
        endpoint: API endpoint (e.g., "api/v1/meetings")
        method: HTTP method (GET, POST, PUT, DELETE)
        data: Request body data
        headers: Additional headers
        organization_id: Organization ID for access control (required)
        user_id: User ID for access control (required)
        internal_service_secret: Service secret for authentication (required)

    Returns:
        JSON response from API
    """
    url = f"{KNOWTED_API_URL}/{endpoint.lstrip('/')}"

    request_headers = headers or {}

    # CRITICAL: Require service secret and context
    if not internal_service_secret:
        raise ValueError("internal_service_secret is required for API calls")
    if not organization_id or not user_id:
        raise ValueError("organization_id and user_id are required for API calls")

    # Use service secret for authentication
    # DEBUG: Log what we're sending
    print(
        f"[DEBUG] Sending API key: {internal_service_secret[:30]}... (length: {len(internal_service_secret)})"
    )
    request_headers["X-API-Key"] = internal_service_secret
    request_headers["X-Organization-ID"] = organization_id
    request_headers["X-User-ID"] = user_id

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(
            method=method,
            url=url,
            json=data,
            headers=request_headers,
        )
        response.raise_for_status()
        return response.json()


@tool
async def call_knowted_api(
    endpoint: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Call Knowted backend API endpoints using service-to-service authentication.

    The tool automatically uses your organization and user context for access control.

    Args:
        endpoint: API endpoint path (e.g., "api/v1/meetings" or "api/external/v1/meetings")
        method: HTTP method (GET, POST, PUT, DELETE, PATCH)
        data: Request body as dictionary (for POST/PUT/PATCH)

    Returns:
        JSON response as string
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            endpoint,
            method,
            data,
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except httpx.HTTPStatusError as e:
        return f"API Error: {e.response.status_code} - {e.response.text}"
    except Exception as e:
        return f"Error calling API: {str(e)}"


@tool
async def get_organization_data() -> str:
    """
    Get organization data including name, industry, business description, team size, and settings.
    Use this tool to personalize your responses and introductions based on the organization's context.

    The tool automatically uses your organization and user context.

    Returns:
        Organization data as JSON string including:
        - name: Organization name
        - industry: Industry type
        - business_description: What the business does
        - business_offering: What they offer
        - team_size: Size of the team
        - company_type: Type of company
        - website: Organization website
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/organizations/{organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching organization data: {str(e)}"
