"""
Helper functions for emitting UI components from Knowted tools.

These functions can be called from within tool implementations to emit
UI components that will be rendered in the frontend chat interface.
"""

from typing import Any, Dict, List, Optional
from langgraph.graph.ui import push_ui_message
from langchain.messages import AIMessage


def emit_meeting_list(
    meetings: List[Dict[str, Any]], 
    message: Optional[AIMessage] = None
) -> Dict[str, Any]:
    """
    Emit a meeting list UI component.
    
    Args:
        meetings: List of meeting dictionaries
        message: Optional AI message to associate with the UI component
        
    Returns:
        UI message dictionary
    """
    meeting_cards = [
        {
            "id": str(m.get("id", "")),
            "title": m.get("title", "Untitled Meeting"),
            "meeting_date": m.get("meeting_date") or m.get("created_at"),
            "thumbnail": m.get("thumbnail"),
            "duration": m.get("duration"),
            "meetingType": m.get("meeting_type", {}),
            "host_email": m.get("host_email"),
        }
        for m in meetings
    ]
    
    return push_ui_message(
        "meeting_list",
        {"meetings": meeting_cards, "loading": False},
        message=message
    )


def emit_meeting_card(
    meeting: Dict[str, Any], 
    message: Optional[AIMessage] = None
) -> Dict[str, Any]:
    """
    Emit a single meeting card UI component.
    
    Args:
        meeting: Meeting dictionary
        message: Optional AI message to associate with the UI component
        
    Returns:
        UI message dictionary
    """
    return push_ui_message(
        "meeting_card",
        {
            "id": str(meeting.get("id", "")),
            "title": meeting.get("title", "Untitled Meeting"),
            "meeting_date": meeting.get("meeting_date") or meeting.get("created_at"),
            "thumbnail": meeting.get("thumbnail"),
            "duration": meeting.get("duration"),
            "meetingType": meeting.get("meeting_type", {}),
            "host_email": meeting.get("host_email"),
        },
        message=message
    )


def emit_report_summary(
    report: Dict[str, Any], 
    message: Optional[AIMessage] = None
) -> Dict[str, Any]:
    """
    Emit a report summary UI component.
    
    Args:
        report: Report dictionary with title, summary, metrics, insights
        message: Optional AI message to associate with the UI component
        
    Returns:
        UI message dictionary
    """
    return push_ui_message(
        "report_summary",
        {
            "title": report.get("title", "Report"),
            "summary": report.get("summary", ""),
            "metrics": report.get("metrics", {}),
            "insights": report.get("insights", []),
        },
        message=message
    )


def emit_team_insights(
    team: Dict[str, Any], 
    message: Optional[AIMessage] = None
) -> Dict[str, Any]:
    """
    Emit team insights UI component.
    
    Args:
        team: Team dictionary with name, member_count, recent_meetings, etc.
        message: Optional AI message to associate with the UI component
        
    Returns:
        UI message dictionary
    """
    return push_ui_message(
        "team_insights",
        {
            "teamName": team.get("name", "Team"),
            "memberCount": team.get("member_count", 0),
            "recentMeetings": team.get("recent_meetings"),
            "averageDuration": team.get("average_duration"),
        },
        message=message
    )

