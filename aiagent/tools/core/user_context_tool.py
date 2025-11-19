"""
User Context Tool - Get user's accessible meeting types and profile
"""

import json

from langchain_core.tools import tool

from .api_tools import _make_api_request, get_context_from_config


@tool
async def get_user_accessible_meeting_types() -> str:
    """
    Get the meeting types the user has access to, including their metadata structures.
    This helps understand what meeting types are available for searching.

    The tool automatically uses your organization and user context.

    Returns:
        JSON string with meeting types and their analysis_metadata_structure
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # Query similar to the n8n Postgres node that fetches accessible meeting types
        # We'll use the backend API to get this information
        # First, try to get meeting types from the organization
        result = await _make_api_request(
            f"api/v1/meeting-types?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )

        # If that endpoint doesn't exist, try alternative approach
        if not result or isinstance(result, dict) and result.get("statusCode"):
            # Try getting user profile with teams, then meeting types
            # For now, return empty list - this might need backend endpoint
            return json.dumps(
                {
                    "meeting_types": [],
                    "note": "Meeting types endpoint may need to be implemented in backend",
                }
            )

        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        # Fallback: return empty list
        return json.dumps({"meeting_types": [], "error": str(e)})
