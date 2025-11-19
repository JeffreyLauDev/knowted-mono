"""
Smart Search Tool - Intelligent meeting search
Replicates the n8n Smart Search workflow functionality
"""

import json
from typing import Any, Dict, Optional

from langchain_core.tools import tool

from ..core.api_tools import _make_api_request, get_context_from_config


@tool
async def smart_search_meetings(
    objective: str,
    fields: Optional[str] = None,
    sort_by: Optional[str] = None,
    limit: Optional[int] = 10,
    filters: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    meeting_type_id: Optional[str] = None,
    contains_keyword: Optional[str] = None,
    specific_field: Optional[str] = None,
) -> str:
    """
    This tool allows you to return exactly what you want from the meeting database.

    Intelligent meeting search that understands natural language objectives and constructs
    smart queries. Use this for complex searches with specific fields or metadata.

    The tool automatically uses your organization and user context for access control.

    Args:
        objective: Natural language description of what the user wants from the database. Guides the rest of the query.
        fields: Comma-separated fields to return (e.g., "title, meeting_date, id"). Allowed: title, meeting_date, summary, duration_mins, host_email, participants_email, id. Always default to id.
        sort_by: Which column to sort by and in what direction (e.g., "meeting_date DESC"). Default is meeting_date DESC.
        limit: Maximum number of records to return. Default to 10, but you can always go higher.
        filters: SQL condition (no WHERE/AND) - only use: id, title, meeting_date, duration_mins, host_email, participants_email, summary, transcript, created_at, updated_at. Strings single-quoted. Example: duration_mins >= 30
        start_date: Filter results from this start date (format YYYY-MM-DD). Used on meeting_date.
        end_date: Filter results up to this end date (format YYYY-MM-DD). Used on meeting_date.
        meeting_type_id: Comma-separated meeting type IDs. Pick from accessible meeting types. If none apply, return empty string.
        contains_keyword: Optionally if what the user wants is going to reference a keyword. Example 'what did sarah say' you'd be looking for keyword sarah in transcript. This is different to specific field.
        specific_field: Comma-separated list of summary_meta_data keys to SELECT (e.g., Objectives, Action Items). Return empty if not needed.

    Returns:
        JSON string with meeting results
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # Build query parameters for the backend API
        params: Dict[str, Any] = {
            "organization_id": organization_id,
            "limit": min(limit or 10, 100),
        }

        # Add date filters
        if start_date:
            params["from_date"] = start_date
        if end_date:
            params["to_date"] = end_date

        # Add meeting type filter
        if meeting_type_id:
            # Handle comma-separated IDs
            meeting_type_ids = [
                mt.strip() for mt in meeting_type_id.split(",") if mt.strip()
            ]
            if meeting_type_ids:
                # Backend API might accept comma-separated or we need to handle multiple calls
                # For now, use the first one (backend might need enhancement for multiple)
                params["meeting_type_id"] = (
                    meeting_type_ids[0]
                    if len(meeting_type_ids) == 1
                    else meeting_type_id
                )

        # Add keyword search (use search parameter for transcript/keyword search)
        if contains_keyword:
            params["search"] = contains_keyword

        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])

        # Call the backend API
        result = await _make_api_request(
            f"api/v1/meetings?{query_string}",
            method="GET",
            organization_id=organization_id,
            user_id=user_id,
            internal_service_secret=internal_service_secret,
        )

        # If specific_field is requested, we need to extract those fields from summary_meta_data
        # This might require backend support or post-processing
        if specific_field and isinstance(result, dict) and "data" in result:
            specific_fields = [
                f.strip() for f in specific_field.split(",") if f.strip()
            ]
            for meeting in result.get("data", []):
                if "summary_meta_data" in meeting and isinstance(
                    meeting["summary_meta_data"], dict
                ):
                    # Extract specific fields from summary_meta_data
                    extracted = {}
                    for field in specific_fields:
                        if field in meeting["summary_meta_data"]:
                            extracted[field] = meeting["summary_meta_data"][field]
                    if extracted:
                        meeting["extracted_fields"] = extracted

        # Filter fields if requested
        if fields and isinstance(result, dict) and "data" in result:
            field_list = [f.strip().lower() for f in fields.split(",") if f.strip()]
            if field_list:
                filtered_data = []
                for meeting in result.get("data", []):
                    filtered_meeting = {}
                    for field in field_list:
                        # Map common field names
                        field_map = {
                            "id": "id",
                            "title": "title",
                            "meeting_date": "meeting_date",
                            "summary": "summary",
                            "duration_mins": "duration_mins",
                            "host_email": "host_email",
                            "participants_email": "participants_email",
                        }
                        if field in field_map and field_map[field] in meeting:
                            filtered_meeting[field_map[field]] = meeting[
                                field_map[field]
                            ]
                    if filtered_meeting:
                        filtered_data.append(filtered_meeting)
                result["data"] = filtered_data

        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return f"Error in smart search: {str(e)}"
