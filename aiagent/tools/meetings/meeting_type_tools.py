"""
Knowted Meeting Type Tools

Tools for interacting with meeting types.
"""

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_meeting_types() -> str:
    """
    Get all meeting types available in the organization.

    This returns all meeting types with their metadata structures, which helps understand
    what meeting types are available and what data structure they use for analysis.

    The tool automatically uses your organization and user context for access control.

    Returns:
        List of meeting types as JSON string with:
        - id: Meeting type ID
        - name: Meeting type name
        - description: Description of the meeting type
        - analysis_metadata_structure: The structure of metadata for this meeting type
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meeting-types?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching meeting types: {str(e)}"


@tool
async def get_meeting_type(meeting_type_id: str) -> str:
    """
    Get details for a specific meeting type including its metadata structure.

    Use this to understand what fields and structure a meeting type uses for analysis.
    This is useful when you need to know what data is available for meetings of this type.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_type_id: The meeting type ID

    Returns:
        Meeting type details as JSON string including:
        - id: Meeting type ID
        - name: Meeting type name
        - description: Description
        - analysis_metadata_structure: The structure of metadata for this meeting type
        - created_at: Creation timestamp
        - updated_at: Last update timestamp
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # GET /api/v1/meeting-types/{id} doesn't exist, so get all and filter
        result = await _make_api_request(
            f"api/v1/meeting-types?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        # Filter by meeting_type_id
        meeting_types = result if isinstance(result, list) else result.get("data", [])
        meeting_type = next(
            (mt for mt in meeting_types if mt.get("id") == meeting_type_id), None
        )

        if not meeting_type:
            return f"Error: Meeting type {meeting_type_id} not found"

        import json

        return json.dumps(meeting_type, indent=2)
    except Exception as e:
        return f"Error fetching meeting type: {str(e)}"
