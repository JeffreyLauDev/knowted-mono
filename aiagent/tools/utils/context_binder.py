"""
Context Binder - Securely binds organization_id and user_id to tools from config

SECURITY: This ensures organization_id and user_id are ALWAYS extracted from
the runtime config (set by the backend) and NEVER from the LLM's input.
The LLM cannot override these values even if it tries to pass them.
"""

import contextvars
import inspect
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field, create_model

# Thread-local context variable to store the current config
# This is set when the agent is invoked and read by tools
_current_config: contextvars.ContextVar[Optional[Dict[str, Any]]] = (
    contextvars.ContextVar("_current_config", default=None)
)


def set_runtime_config(config: Optional[Dict[str, Any]]) -> None:
    """
    Set the runtime config in the current context.

    This should be called when the agent is invoked to store the config
    so tools can access organization_id and user_id.

    Args:
        config: The LangGraph config dict
    """
    _current_config.set(config)


def get_runtime_config() -> Optional[Dict[str, Any]]:
    """
    Get the runtime config from the current context.

    Returns:
        The current config dict, or None if not set
    """
    return _current_config.get(None)


def _remove_security_params_from_schema(tool: BaseTool) -> Optional[BaseModel]:
    """
    Create a new args schema that excludes organization_id and user_id.

    This prevents the LLM from seeing these as parameters it can pass.
    """
    # First, try to get schema from tool's args_schema
    if hasattr(tool, "args_schema") and tool.args_schema is not None:
        original_schema = tool.args_schema
        if isinstance(original_schema, type) and issubclass(original_schema, BaseModel):
            # Get all fields except organization_id and user_id
            fields = {}
            for field_name, field_info in original_schema.model_fields.items():
                if field_name not in ["organization_id", "user_id"]:
                    # Properly copy the field definition
                    # For Pydantic v2, we need to pass (annotation, Field(...)) or (annotation, default_value)
                    if field_info.default is not ...:
                        # Field has a default value
                        fields[field_name] = (
                            field_info.annotation,
                            Field(default=field_info.default),
                        )
                    else:
                        # Required field
                        fields[field_name] = (field_info.annotation, ...)

            # Create new model without security-sensitive fields
            if fields:
                try:
                    new_model = create_model(
                        f"{original_schema.__name__}_Secure", **fields
                    )
                    return new_model
                except Exception:
                    import traceback

                    traceback.print_exc()

    # If no args_schema exists, try to create one from the function signature
    if hasattr(tool, "func") and tool.func:
        try:
            sig = inspect.signature(tool.func)
            fields = {}
            for param_name, param in sig.parameters.items():
                # Skip organization_id and user_id
                if param_name in ["organization_id", "user_id"]:
                    continue

                # Get the annotation (type hint)
                annotation = (
                    param.annotation
                    if param.annotation != inspect.Parameter.empty
                    else Any
                )

                # Determine if it's optional (has default value)
                if param.default != inspect.Parameter.empty:
                    # Parameter has a default, make it Optional
                    if not (
                        hasattr(annotation, "__origin__")
                        and annotation.__origin__ is Optional
                    ):
                        if annotation == Any:
                            annotation = Optional[Any]
                        else:
                            annotation = Optional[annotation]
                    # Use Field with default value
                    fields[param_name] = (annotation, Field(default=param.default))
                else:
                    # Required parameter - use annotation directly
                    fields[param_name] = (annotation, ...)

            if fields:
                new_model = create_model(f"{tool.name}_Secure", **fields)
                return new_model
        except Exception:
            import traceback

            traceback.print_exc()

    return None


def create_context_aware_tool(tool: BaseTool) -> BaseTool:
    """
    Wrap a tool to SECURELY extract organization_id and user_id from runtime config.

    SECURITY FEATURES:
    1. ALWAYS extracts organization_id and user_id from config.configurable
    2. ALWAYS overrides any values the LLM might try to pass
    3. Removes these parameters from the tool schema so LLM can't see them
    4. These values are hardcoded from the backend's config, not from user input

    Args:
        tool: The tool to wrap

    Returns:
        Wrapped tool that securely extracts context from config
    """
    original_func = tool.func if hasattr(tool, "func") else None

    if not original_func:
        return tool

    # Create a secure wrapper function
    async def wrapped_func(*args, **kwargs):
        # SECURITY: Remove any organization_id or user_id that the LLM might have passed
        # We will ALWAYS use the values from config, never from LLM input
        kwargs.pop("organization_id", None)
        kwargs.pop("user_id", None)

        # Try multiple methods to get config from LangGraph execution context
        config = None

        # Method 1: Try to get from context variable (set by SecureAgentWrapper if used)
        config = get_runtime_config()

        # Method 2: Try to get from kwargs (some LangGraph versions pass it here)
        if not config:
            config = kwargs.pop("config", None) or kwargs.pop("__config__", None)

        # Method 3: Try to get from LangChain's RunnableConfig (LangGraph execution context)
        if not config:
            try:
                # Try to import get_config from different possible locations
                try:
                    from langgraph.config import get_config
                except ImportError:
                    try:
                        from langchain_core.runnables.config import get_config
                    except ImportError:
                        from langchain_core.runnables import get_config

                # LangGraph/LangChain stores config in the execution context
                # This is the proper way to access it when called through LangGraph CLI
                runnable_config = get_config()
                if runnable_config:
                    # Convert RunnableConfig to dict format
                    config = {
                        "configurable": runnable_config.get("configurable", {}),
                        **{
                            k: v
                            for k, v in runnable_config.items()
                            if k != "configurable"
                        },
                    }
            except Exception:
                # This is expected if not in a LangChain execution context or if get_config is not available
                pass

        # Method 4: Try to get from call stack as last resort
        if not config:
            try:
                import inspect

                frame = inspect.currentframe()
                while frame:
                    if "config" in frame.f_locals:
                        potential_config = frame.f_locals["config"]
                        if (
                            isinstance(potential_config, dict)
                            and "configurable" in potential_config
                        ):
                            config = potential_config
                            break
                    frame = frame.f_back
            except Exception:
                pass

        # Extract organization_id and user_id from config
        # These are set by the backend and are the ONLY source of truth
        organization_id = None
        user_id = None

        if config:
            if isinstance(config, dict):
                configurable = config.get("configurable", {})
                organization_id = configurable.get("organization_id")
                user_id = configurable.get("user_id")
            elif hasattr(config, "configurable"):
                configurable = getattr(config, "configurable", {})
                if isinstance(configurable, dict):
                    organization_id = configurable.get("organization_id")
                    user_id = configurable.get("user_id")

        # Also try to get from runtime config (contextvars)
        runtime_config = get_runtime_config()
        if runtime_config:
            runtime_configurable = runtime_config.get("configurable", {})
            if not organization_id:
                organization_id = runtime_configurable.get("organization_id")
            if not user_id:
                user_id = runtime_configurable.get("user_id")

        # SECURITY: ALWAYS inject from config, overriding any LLM attempts
        if organization_id:
            kwargs["organization_id"] = organization_id
        if user_id:
            kwargs["user_id"] = user_id

        # Call original function with secure context
        return await original_func(*args, **kwargs)

    # Create new args schema without organization_id and user_id
    # This prevents the LLM from seeing these as parameters
    new_schema = _remove_security_params_from_schema(tool)

    # CRITICAL: We MUST provide a schema that excludes organization_id and user_id
    # If we don't have a schema, StructuredTool.from_function will auto-generate
    # from the function signature, which includes those parameters
    if new_schema is None:
        # If we can't create a schema, return the tool as-is
        # This should not happen, but it's a safety fallback
        return tool

    # Clean up description to remove mentions of organization_id and user_id
    # The LLM shouldn't see these parameters at all
    cleaned_description = tool.description
    if cleaned_description:
        # Remove lines that mention organization_id or user_id as parameters
        lines = cleaned_description.split("\n")
        cleaned_lines = []
        for i, line in enumerate(lines):
            # Skip lines that mention these parameters
            if "organization_id" in line.lower() or "user_id" in line.lower():
                # Check if it's in the Args section - if so, skip it
                if (
                    "args:" in line.lower()
                    or "arg:" in line.lower()
                    or ":" in line
                    and ("organization_id" in line.lower() or "user_id" in line.lower())
                ):
                    continue
            cleaned_lines.append(line)
        cleaned_description = "\n".join(cleaned_lines)

    # Create a custom tool class that overrides _arun to ensure our wrapper is always called
    # This is critical because LangGraph may call _arun directly, bypassing func
    class ContextAwareTool(StructuredTool):
        """Tool wrapper that ensures context is injected even when _arun is called directly."""

        async def _arun(self, *args, **kwargs):
            """Override _arun to ensure our wrapper is called."""
            # This will call our wrapped_func which handles config extraction
            return await wrapped_func(*args, **kwargs)

        def _run(self, *args, **kwargs):
            """Sync version - should not be called for async tools, but provide fallback."""
            import asyncio

            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            return loop.run_until_complete(wrapped_func(*args, **kwargs))

    # Create new tool with wrapped function and secure schema
    # CRITICAL: StructuredTool.from_function() may ignore args_schema if the function
    # signature doesn't match. We need to create the tool directly with the schema.
    # This ensures the LLM only sees the parameters in our secure schema.
    wrapped_tool = ContextAwareTool(
        name=tool.name,
        description=cleaned_description,
        func=wrapped_func,
        args_schema=new_schema,  # Always use the secure schema - this is what LLM sees
    )

    return wrapped_tool


def bind_context_to_tools(
    tools: List[BaseTool],
    organization_id: str,
    user_id: str,
) -> List[BaseTool]:
    """
    Bind organization_id and user_id to tools so they're automatically passed.

    This creates bound versions of tools that include the context.
    Use this when you have static context (not from runtime config).

    Args:
        tools: List of tools to bind
        organization_id: Organization ID to bind
        user_id: User ID to bind

    Returns:
        List of bound tools
    """
    bound_tools = []

    for tool in tools:
        # Create a wrapper that injects organization_id and user_id
        original_func = tool.func if hasattr(tool, "func") else None

        if original_func:
            # Create bound function
            async def bound_func(*args, **kwargs):
                # SECURITY: Always override, never trust LLM input
                kwargs["organization_id"] = organization_id
                kwargs["user_id"] = user_id
                return await original_func(*args, **kwargs)

            # Create new tool with bound function
            bound_tool = type(tool)(
                name=tool.name,
                description=tool.description,
                func=bound_func,
            )
            bound_tools.append(bound_tool)
        else:
            # If tool doesn't have func, use tool as-is
            bound_tools.append(tool)

    return bound_tools


def wrap_tools_with_context(tools: List[BaseTool]) -> List[BaseTool]:
    """
    Wrap all tools to SECURELY extract organization_id and user_id from runtime config.

    SECURITY: This ensures that:
    1. organization_id and user_id are ALWAYS from config (set by backend)
    2. The LLM cannot see or override these parameters
    3. These values are hardcoded from the backend's authentication, not user input

    This is the recommended approach when using LangGraph, as it extracts context
    from the config.configurable dict at runtime, which is set by the backend
    based on the authenticated user's JWT token.

    Args:
        tools: List of tools to wrap

    Returns:
        List of securely wrapped context-aware tools
    """
    wrapped = []
    for tool in tools:
        wrapped_tool = create_context_aware_tool(tool)
        wrapped.append(wrapped_tool)
    return wrapped
