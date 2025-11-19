"""
Knowted AI Agent - Complete Implementation
Replicates n8n workflow functionality with LangGraph DeepAgents
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from deepagents import create_deep_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt
from langchain_anthropic import ChatAnthropic
from memory.checkpointer import setup_checkpointer
from prompts import build_system_prompt_from_config
from tools import (
    calculator,
    get_current_time,
    get_meeting_details,
    get_organization_data,
    get_organization_members,
    get_team_members,
    get_user_accessible_meeting_types,
    get_user_permissions,
    get_user_profile,
    smart_search_meetings,
)


@dataclass
class KnowtedContext:
    """Runtime context for Knowted agent."""

    organization_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    accessible_meeting_types: List[Dict] = field(default_factory=list)
    user_profile: Optional[Dict] = None
    organization_name: Optional[str] = None
    team_name: Optional[str] = None
    thread_id: Optional[str] = None
    current_meeting_id: Optional[str] = None


@dynamic_prompt
def knowted_system_prompt(request: ModelRequest) -> str:
    """Dynamic system prompt that reads from runtime context."""
    context = getattr(getattr(request, "runtime", None), "context", None)
    config = None

    if isinstance(context, KnowtedContext):
        config = {
            "configurable": {
                "organization_id": context.organization_id,
                "user_id": context.user_id,
                "user_name": context.user_name,
                "accessible_meeting_types": context.accessible_meeting_types,
                "user_profile": context.user_profile,
                "organization_name": context.organization_name,
                "team_name": context.team_name,
                "current_meeting_id": context.current_meeting_id,
            }
        }

    return build_system_prompt_from_config(config)


def create_knowted_agent(
    user_name: Optional[str] = None,
    accessible_meeting_types: Optional[List[Dict]] = None,
    use_memory: bool = True,
) -> Any:
    """Create the Knowted agent with all tools and prompts."""
    llm = ChatAnthropic(model="claude-3-5-haiku-20241022", temperature=0.7)

    tools = [
        # Search tools
        smart_search_meetings,
        # Meeting tools
        get_meeting_details,
        # User context
        get_user_accessible_meeting_types,
        # Organization tools
        get_organization_data,
        get_organization_members,
        # Team tools
        get_team_members,
        # Profile tools
        get_user_profile,
        # Permission tools
        get_user_permissions,
        # Core utilities
        calculator,
        get_current_time,
        # Note: Filesystem tools (read_file, write_file, edit_file, ls, glob, grep)
        # and write_todos are built-in DeepAgents tools and are automatically available
    ]

    checkpointer = setup_checkpointer(use_postgres=True) if use_memory else None

    agent = create_deep_agent(
        model=llm,
        middleware=[knowted_system_prompt],
        tools=tools,
        checkpointer=checkpointer,
        context_schema=KnowtedContext,
    )

    return agent


knowted_agent = create_knowted_agent()
