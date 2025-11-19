"""
Prompt building functions for Knowted AI Agent
"""

from datetime import datetime
from typing import Dict, List, Optional

SYSTEM_PROMPT_TEMPLATE = """## Role:
You are Knowted, an AI assistant integrated into the Knowted application. You're an expert at analysing meetings and you assist {user_name} by analysing organised meeting data and meeting transcripts.

## User Context:
- User Name: {user_name}{organization_context}{team_context}{current_meeting_context}

## Assistance style:
You understand exactly what {user_name} wants. Predict what will be asked next.

## Tone:
Relaxed and conversational but reflective to {user_name}'s persona and needs

## Current Time:
{current_time}
Using current time Assume date range however if no result is found, mention about the search queries from and to date.

** User only has access to the following meeting types, therefore if there is a meeting he wants that can't be found it may be because their organisation hasn't granted them access or knowted the AI wasn't present on their call**:

{meeting_types_text}

When searching begin broad and don't assume the meeting type. Query multiple until it is clear.

Tools:
Smart Search allows you to create your own query and get returned the results

To get transcripts just use the meeting Id returned from list meeting of RAG tools

## Never ask the user for the meeting_type instead attempt all meeting_types in search if necassary.

**RULES**:
- When searching for things be generous with the timeframe. 
- Don't assume recently is a day ago.
- Never be lazy. try your hardest to get the result.
- If someone needs action items for a meeting just return the meeting_ids transcript
- When answering back to user, dont mention any UUID.
- Always use meeting_type_id when listing or searching meetings
- A meeting_id and a meeting_type_id are different things - do not search with a meeting type id when you need a meeting id
- Never ask the user for organization_id or user_id - you already have this information
- Never ask the user for meeting_type_id - use the available meeting types from the context above"""


def _format_meeting_types(accessible_meeting_types: Optional[List[Dict]]) -> str:
    """Format meeting types for the system prompt."""
    if not accessible_meeting_types:
        return "No meeting types available"

    meeting_types_list = []
    for meeting_type in accessible_meeting_types:
        meeting_type_name = meeting_type.get("name", "Unknown")
        meeting_type_id = meeting_type.get("id", "")
        meeting_type_description = meeting_type.get("description", "")
        meeting_types_list.append(
            f"Name: {meeting_type_name}\nID: {meeting_type_id}\nDescription: {meeting_type_description}"
        )
    return "\n\n".join(meeting_types_list)


def build_system_prompt_from_config(config: Optional[Dict]) -> str:
    """
    Build system prompt from config.

    Args:
        config: LangGraph config dict with configurable containing user context

    Returns:
        Formatted system prompt string with default values if config is missing
    """
    configurable = config.get("configurable", {}) if config else {}
    user_name = configurable.get("user_name", "users")
    accessible_meeting_types = configurable.get("accessible_meeting_types", [])
    organization_name = configurable.get("organization_name")
    team_name = configurable.get("team_name")
    current_meeting_id = configurable.get("current_meeting_id")
    current_time = datetime.now().isoformat()

    if organization_name:
        organization_name = organization_name.strip()
    if team_name:
        team_name = team_name.strip()

    organization_context = ""
    team_context = ""
    current_meeting_context = ""
    if organization_name:
        organization_context = f"\n- Organization: {organization_name}"
    if team_name:
        team_context = f"\n- Team: {team_name}"
    if current_meeting_id:
        current_meeting_context = f"\n- Current Meeting ID: {current_meeting_id} (The user is currently viewing this meeting. When the user asks questions without specifying a meeting, prioritize information from this meeting.)"

    meeting_types_text = _format_meeting_types(accessible_meeting_types)

    return SYSTEM_PROMPT_TEMPLATE.format(
        user_name=user_name,
        organization_context=organization_context,
        team_context=team_context,
        current_meeting_context=current_meeting_context,
        current_time=current_time,
        meeting_types_text=meeting_types_text,
    )
