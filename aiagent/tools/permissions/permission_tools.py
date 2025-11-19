"""
Knowted Permission Tools

Tools for checking user permissions.
"""

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_user_permissions() -> str:
    """
    Get the current user's permissions in the organization.
    
    Use this to understand what the user can access and what actions they can perform.
    This is useful for understanding user capabilities and access levels.

    The tool automatically uses your organization and user context.

    Returns:
        User permissions as JSON string including:
        - permissions: List of permissions the user has
        - teams: Teams the user belongs to with their permissions
        - role: User's role in the organization
        - access_level: Overall access level
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/permissions?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching user permissions: {str(e)}"

