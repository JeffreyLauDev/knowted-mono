"""
Knowted Calendar Tools

Tools for calendar integration and sync status.
"""

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_calendar_sync_status() -> str:
    """
    Get the calendar sync status for the user's organization.
    
    Use this to check if calendar integration is connected and syncing properly.
    This is useful when users ask about calendar connections or sync issues.

    The tool automatically uses your organization and user context.

    Returns:
        Calendar sync status as JSON string including:
        - is_connected: Whether calendar is connected
        - provider: Calendar provider (google, microsoft, etc.)
        - last_sync: Last sync timestamp
        - sync_status: Current sync status
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/calendar/sync-status?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching calendar sync status: {str(e)}"


@tool
async def get_available_calendars() -> str:
    """
    Get list of available calendars for the user.
    
    Use this to see what calendars are available for the user to sync.
    This is useful when users want to know what calendars they can connect or
    which calendars are already available.

    The tool automatically uses your organization and user context.

    Returns:
        List of available calendars as JSON string including:
        - calendar_id: Calendar ID
        - name: Calendar name
        - provider: Calendar provider
        - is_synced: Whether the calendar is currently synced
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/calendar/available-calendars?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching available calendars: {str(e)}"


@tool
async def get_my_calendars() -> str:
    """
    Get list of calendars currently synced for the user.
    
    Use this to see what calendars the user has connected and is currently syncing.
    This is useful when users ask about their connected calendars.

    The tool automatically uses your organization and user context.

    Returns:
        List of user's calendars as JSON string including:
        - calendar_id: Calendar ID
        - name: Calendar name
        - provider: Calendar provider
        - sync_status: Current sync status
        - last_sync: Last sync timestamp
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/calendar/my-calendars?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching user calendars: {str(e)}"

