"""
Knowted Organization Tools

Tools for organization and member management.
"""

from typing import Optional

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_organization_members() -> str:
    """
    Get list of all members in the organization.
    
    Use this to see who is in the organization, their roles, teams, and other member information.
    This is useful when users ask about team members, who's in the organization, or organizational structure.

    The tool automatically uses your organization and user context for access control.

    Returns:
        List of organization members as JSON string including:
        - user_id: User ID
        - email: User email
        - first_name: First name
        - last_name: Last name
        - teams: List of teams the user belongs to
        - role: User's role in the organization
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/organizations/{organization_id}/members",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching organization members: {str(e)}"


@tool
async def get_organization_invitations() -> str:
    """
    Get pending invitations for the current user.
    
    Use this to check if the user has any pending organization invitations.
    This is useful when users ask about invitations or want to see what organizations
    they've been invited to join.

    The tool automatically uses your organization and user context.

    Returns:
        List of pending invitations as JSON string including:
        - invitation_id: Invitation ID
        - organization_id: Organization ID
        - organization_name: Organization name
        - invited_by: User who sent the invitation
        - created_at: When the invitation was sent
        - expires_at: When the invitation expires (if applicable)
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            "api/v1/organizations/my-invitations",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching organization invitations: {str(e)}"

