"""
Knowted Team Tools

Tools for team management and insights.
"""

from typing import Optional

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_team_insights(team_id: str) -> str:
    """
    Get insights and analytics for a team.
    
    The tool automatically uses your organization and user context for access control.

    Args:
        team_id: The team ID

    Returns:
        Team insights and analytics as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/teams/{team_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )

        # Get team meetings for additional insights
        try:
            meetings_result = await _make_api_request(
                f"api/v1/meetings?organization_id={organization_id}&team_id={team_id}&limit=50",
                method="GET",
                organization_id=organization_id,
                user_id=user_id,
                internal_service_secret=internal_service_secret,
            )
            result["recent_meetings"] = meetings_result.get("data", [])
        except Exception:
            pass

        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching team insights: {str(e)}"


@tool
async def get_team_members(team_id: str) -> str:
    """
    Get list of team members.
    
    The tool automatically uses your organization and user context for access control.

    Args:
        team_id: The team ID

    Returns:
        Team members list as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # Get organization members and filter by team
        result = await _make_api_request(
            f"api/v1/organizations/{organization_id}/members",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        # Filter members by team
        members = result if isinstance(result, list) else []
        team_members = [m for m in members if m.get("team") == team_id or m.get("team_id") == team_id]
        
        import json
        return json.dumps(team_members, indent=2)
    except Exception as e:
        return f"Error fetching team members: {str(e)}"


@tool
async def get_team_meetings(team_id: str, limit: int = 20) -> str:
    """
    Get meetings for a specific team.
    
    The tool automatically uses your organization and user context for access control.

    Args:
        team_id: The team ID
        limit: Number of meetings to return (default: 20)

    Returns:
        List of team meetings as JSON string (only meetings user has access to)
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings?organization_id={organization_id}&team_id={team_id}&limit={limit}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching team meetings: {str(e)}"
