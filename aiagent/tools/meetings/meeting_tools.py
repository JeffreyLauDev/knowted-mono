"""
Knowted Meeting Tools

Tools for interacting with meetings data.
"""

from typing import Any, Dict, Optional

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def get_meeting_details(
    meeting_id: str,
) -> str:
    """
    Get complete details for a specific meeting including all fields: title, meeting_date, summary, transcript, 
    participants, duration, host_email, video_url, chapters, summary_meta_data, and all other meeting information.

    Use this tool when you need comprehensive information about a meeting. This returns all available meeting data.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID (usually obtained from smart_search_meetings or list_meetings)

    Returns:
        Complete meeting details as JSON string including:
        - id, title, meeting_date, duration_mins
        - summary, transcript, transcript_json
        - host_email, participants_email
        - video_url, thumbnail, transcript_url
        - chapters, summary_meta_data
        - meeting_type information
        - created_at, updated_at
        - and all other meeting fields
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return f"Error fetching meeting details: {str(e)}"


@tool
async def get_meeting_summary(
    meeting_id: str,
) -> str:
    """
    Get summary and insights for a specific meeting.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID

    Returns:
        Meeting summary, transcript, and insights as JSON string
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching meeting summary: {str(e)}"


@tool
async def list_meetings(
    meeting_type_id: Optional[str] = None,
    startdate: Optional[str] = None,
    enddate: Optional[str] = None,
    limit: Optional[int] = 10,
) -> str:
    """
    List meetings based on meeting types and organisation id.

    This returns the meeting details and their summarys, not their transcripts.

    Meeting type id is required upon ever query and generously assume the users intended date range using current time.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_type_id: Meeting type ID (required for every query)
        startdate: Start date for sql query (format: YYYY-MM-DD)
        enddate: End date for sql query (format: YYYY-MM-DD)
        limit: Limit the query, 10 by default unless user has specifically mentioned

    Returns:
        List of matching meetings as JSON string (only meetings user has access to)
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        params: Dict[str, Any] = {
            "organization_id": organization_id,
            "limit": min(limit or 10, 100),
        }
        if meeting_type_id:
            params["meeting_type_id"] = meeting_type_id
        if startdate:
            params["from_date"] = startdate
        if enddate:
            params["to_date"] = enddate

        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        result = await _make_api_request(
            f"api/v1/meetings?{query_string}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error listing meetings: {str(e)}"


@tool
async def search_meetings(
    query: Optional[str] = None,
    team_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    Search meetings by content, participants, or date range.

    The tool automatically uses your organization and user context for access control.

    Args:
        query: Search query for meeting titles and participant emails
        team_id: Filter by team ID (optional)
        from_date: Filter meetings from this date (ISO string format)
        to_date: Filter meetings to this date (ISO string format)
        limit: Number of results to return (default: 20, max: 100)

    Returns:
        List of matching meetings as JSON string (only meetings user has access to)
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        params: Dict[str, Any] = {
            "organization_id": organization_id,
            "limit": min(limit, 100),
        }
        if query:
            params["search"] = query
        if team_id:
            params["team_id"] = team_id
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date

        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        result = await _make_api_request(
            f"api/v1/meetings?{query_string}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error searching meetings: {str(e)}"


@tool
async def get_meeting_transcript(
    meeting_id: str,
) -> str:
    """
    Only use when you have a meeting id to Get a meetings transcript with a meeting id usually returned by list meetings tool. A meeting_id and a meeting_type_id are different things. do not search with a meeting type id.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID (must be the same id from RAG or list meetings)

    Returns:
        Meeting transcript as text
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        # Extract transcript from meeting response
        transcript = result.get("transcript", "")
        transcript_json = result.get("transcript_json")
        
        # Return structured transcript if available, otherwise plain text
        if transcript_json:
            import json
            return json.dumps(transcript_json, indent=2)
        return transcript if isinstance(transcript, str) else str(transcript)
    except Exception as e:
        return f"Error fetching transcript: {str(e)}"


@tool
async def get_meeting_insights(
    meeting_id: str,
) -> str:
    """
    Get AI-generated insights and analysis for a meeting.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID

    Returns:
        Meeting insights and analysis as JSON string
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # Get meeting details and extract insights from response
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}?organization_id={organization_id}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        # Extract insights-related fields from meeting response
        insights = {
            "summary": result.get("summary", ""),
            "summary_meta_data": result.get("summary_meta_data", {}),
            "chapters": result.get("chapters", ""),
            "key_points": result.get("summary_meta_data", {}).get("key_points", []),
        }
        import json

        return json.dumps(insights, indent=2)
    except Exception as e:
        return f"Error fetching insights: {str(e)}"


@tool
async def get_upcoming_meetings(limit: Optional[int] = 10) -> str:
    """
    Get scheduled upcoming meetings for the organization.

    Use this to find meetings that are scheduled in the future. This is useful when
    users ask about upcoming meetings, scheduled calls, or what's on their calendar.

    The tool automatically uses your organization and user context for access control.

    Args:
        limit: Number of upcoming meetings to return (default: 10, max: 100)

    Returns:
        List of upcoming scheduled meetings as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/upcoming-scheduled?organization_id={organization_id}&limit={min(limit or 10, 100)}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching upcoming meetings: {str(e)}"


@tool
async def get_meeting_share_link(meeting_id: str) -> str:
    """
    Get the share link for a meeting if it exists.

    Use this when users want to share a meeting with others. Returns the share link
    if one has been created, or indicates if no share link exists.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID

    Returns:
        Share link information as JSON string including:
        - share_token: The share token
        - share_url: The full share URL
        - expires_at: When the link expires (if applicable)
        - is_enabled: Whether sharing is enabled
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}/share",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching meeting share link: {str(e)}"


@tool
async def get_meeting_video_url(
    meeting_id: str, expires_in: Optional[int] = 3600
) -> str:
    """
    Get the video URL for a meeting recording.

    Use this when users want to access or share the video recording of a meeting.
    The URL is signed and can be set to expire after a certain time.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID
        expires_in: URL expiration time in seconds (default: 3600 = 1 hour)

    Returns:
        Video URL information as JSON string including:
        - video_url: The signed video URL
        - expires_at: When the URL expires
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}/video-url?expires_in={expires_in}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error fetching meeting video URL: {str(e)}"


@tool
async def update_meeting(meeting_id: str, updates: Dict[str, Any]) -> str:
    """
    Update meeting details.

    Use this to modify meeting information such as title, description, or other metadata.
    Only provide the fields you want to update in the updates dictionary.

    The tool automatically uses your organization and user context for access control.

    Args:
        meeting_id: The meeting ID
        updates: Dictionary of fields to update (e.g., {"title": "New Title", "description": "New Description"})

    Returns:
        Updated meeting data as JSON string
    """
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        result = await _make_api_request(
            f"api/v1/meetings/{meeting_id}?organization_id={organization_id}",
            method="PATCH",
            data=updates,
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )
        import json

        return json.dumps(result, indent=2)
    except Exception as e:
        return f"Error updating meeting: {str(e)}"
