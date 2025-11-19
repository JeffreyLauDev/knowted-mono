"""
User Context Fetcher - Fetch user profile and accessible meeting types from backend API
"""

from typing import Any, Dict

from ..core.api_tools import _make_api_request


async def fetch_user_context(
    organization_id: str,
    user_id: str,
) -> Dict[str, Any]:
    """
    Fetch user context from backend API including:
    - User profile (name, email, etc.)
    - Organization name
    - Team name(s)
    - Accessible meeting types

    Args:
        organization_id: Organization ID
        user_id: User ID

    Returns:
        Dict with:
        - user_name: Full name of the user
        - organization_name: Name of the organization
        - team_name: Name of the user's primary team (or first team if multiple)
        - accessible_meeting_types: List of meeting types user has access to
        - user_profile: Full user profile data
    """
    context = {
        "user_name": None,
        "organization_name": None,
        "team_name": None,
        "accessible_meeting_types": [],
        "user_profile": None,
    }

    try:
        # Fetch user profile
        try:
            profile_result = await _make_api_request(
                "api/v1/profiles/me",
                method="GET",
                organization_id=organization_id,
                user_id=user_id,
            )

            if profile_result:
                context["user_profile"] = profile_result
                # Build full name from first_name and last_name
                first_name = profile_result.get("first_name", "")
                last_name = profile_result.get("last_name", "")
                if first_name or last_name:
                    context["user_name"] = f"{first_name} {last_name}".strip()
                else:
                    # Fallback to email if no name
                    context["user_name"] = profile_result.get("email", "User")
        except Exception as e:
            print(f"Warning: Could not fetch user profile: {e}")

        # Fetch organization data to get organization name
        try:
            org_result = await _make_api_request(
                f"api/v1/organizations/{organization_id}",
                method="GET",
                organization_id=organization_id,
                user_id=user_id,
            )
            if org_result and isinstance(org_result, dict):
                context["organization_name"] = org_result.get("name")
        except Exception as e:
            print(f"Warning: Could not fetch organization data: {e}")

        # Fetch user teams to get team name
        try:
            # Try to get teams from profile or a teams endpoint
            # First, try getting organization members to find user's team
            members_result = await _make_api_request(
                f"api/v1/organizations/{organization_id}/members",
                method="GET",
                organization_id=organization_id,
                user_id=user_id,
            )
            if members_result:
                # Find the current user in members and get their team
                if isinstance(members_result, list):
                    for member in members_result:
                        if (
                            member.get("user_id") == user_id
                            or member.get("id") == user_id
                        ):
                            # Try to get team info from member or fetch teams separately
                            team_id = member.get("team_id")
                            if team_id:
                                # Fetch team details
                                try:
                                    teams_result = await _make_api_request(
                                        "api/v1/teams",
                                        method="GET",
                                        organization_id=organization_id,
                                        user_id=user_id,
                                    )
                                    if teams_result:
                                        teams_list = (
                                            teams_result
                                            if isinstance(teams_result, list)
                                            else teams_result.get("data", [])
                                        )
                                        for team in teams_list:
                                            if team.get("id") == team_id:
                                                context["team_name"] = team.get("name")
                                                break
                                except Exception:
                                    pass
                            break
                elif isinstance(members_result, dict):
                    # If it's a dict, try to extract data
                    members_list = members_result.get("data", [])
                    for member in members_list:
                        if (
                            member.get("user_id") == user_id
                            or member.get("id") == user_id
                        ):
                            team_id = member.get("team_id")
                            if team_id:
                                try:
                                    teams_result = await _make_api_request(
                                        "api/v1/teams",
                                        method="GET",
                                        organization_id=organization_id,
                                        user_id=user_id,
                                    )
                                    if teams_result:
                                        teams_list = (
                                            teams_result
                                            if isinstance(teams_result, list)
                                            else teams_result.get("data", [])
                                        )
                                        for team in teams_list:
                                            if team.get("id") == team_id:
                                                context["team_name"] = team.get("name")
                                                break
                                except Exception:
                                    pass
                            break
        except Exception as e:
            print(f"Warning: Could not fetch team information: {e}")

        # Fetch accessible meeting types
        try:
            # Try the meeting types endpoint
            meeting_types_result = await _make_api_request(
                f"api/v1/meeting-types?organization_id={organization_id}",
                method="GET",
                organization_id=organization_id,
                user_id=user_id,
            )

            if meeting_types_result and isinstance(meeting_types_result, list):
                context["accessible_meeting_types"] = meeting_types_result
            elif meeting_types_result and isinstance(meeting_types_result, dict):
                # If it's a dict, try to extract the list
                if "data" in meeting_types_result:
                    context["accessible_meeting_types"] = meeting_types_result["data"]
                elif "meeting_types" in meeting_types_result:
                    context["accessible_meeting_types"] = meeting_types_result[
                        "meeting_types"
                    ]
        except Exception as e:
            print(f"Warning: Could not fetch accessible meeting types: {e}")
            # Try alternative endpoint
            try:
                # Use the get_user_accessible_meeting_types tool's logic
                # This might need to be adjusted based on actual backend endpoint
                pass
            except Exception:
                pass

    except Exception as e:
        print(f"Error fetching user context: {e}")

    return context
