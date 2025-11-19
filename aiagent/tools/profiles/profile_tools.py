"""
Knowted Profile Tools

Tools for user profile management.
"""

from typing import Dict, Any, Optional

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_user_profile() -> str:
    """
    Get the current user's profile information.
    
    Use this to get user details like name, email, avatar, and other profile information.
    This is useful for personalizing responses and understanding who the user is.

    The tool automatically uses your organization and user context.

    Returns:
        User profile as JSON string including:
        - id: User ID
        - first_name: User's first name
        - last_name: User's last name
        - email: User's email address
        - avatar_url: Profile picture URL (if available)
        - created_at: Account creation timestamp
        - updated_at: Last update timestamp
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            "api/v1/profiles/me",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching user profile: {str(e)}"


@tool
async def update_user_profile(first_name: Optional[str] = None, last_name: Optional[str] = None) -> str:
    """
    Update the current user's profile information.
    
    Use this when users want to update their name or other profile information.
    Only provide the fields that need to be updated.

    The tool automatically uses your organization and user context.

    Args:
        first_name: New first name (optional)
        last_name: New last name (optional)

    Returns:
        Updated profile as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        updates: Dict[str, Any] = {}
        if first_name is not None:
            updates["first_name"] = first_name
        if last_name is not None:
            updates["last_name"] = last_name

        if not updates:
            return "Error: At least one field (first_name or last_name) must be provided to update"

        result = await _make_api_request(
            "api/v1/profiles/me",
            method="PATCH",
            data=updates,
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error updating user profile: {str(e)}"

