#!/usr/bin/env python3
"""
Command-line tool to chat with the Knowted AI agent.

Usage:
    python command/chat.py --jwt <token> --org-id <org_id> --user-id <user_id> [--thread-id <thread_id>] [--message <message>]

Example:
    python command/chat.py --jwt "eyJhbGc..." --org-id "cd273967-f15d-4397-bf9e-e547fb93a9ac" --user-id "365ac224-be4b-431c-93bd-5b501ca33b74" --message "what is my organization and who am I?"
"""

import argparse
import json
import re
import sys
import uuid
from typing import Any, Dict, Optional

import requests


def fetch_thread_state(
    thread_id: str, langgraph_url: str = "http://127.0.0.1:2024"
) -> Optional[Dict[str, Any]]:
    """
    Fetch the current state of a conversation thread from LangGraph API.

    Args:
        thread_id: The thread ID to fetch
        langgraph_url: Base URL for LangGraph API (default: http://127.0.0.1:2024)

    Returns:
        Thread state dict or None if error
    """
    url = f"{langgraph_url}/threads/{thread_id}"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error fetching thread: HTTP {response.status_code}")
            print(response.text)
            return None
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to LangGraph API at {langgraph_url}")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def display_thread_state(thread_data: Dict[str, Any]) -> None:
    """
    Display thread state in a readable format for debugging.

    Args:
        thread_data: Thread state dict from LangGraph API
    """
    print("\n" + "=" * 80)
    print("📋 THREAD STATE")
    print("=" * 80)

    # Basic info
    print(f"Thread ID:     {thread_data.get('thread_id')}")
    print(f"Status:        {thread_data.get('status')}")
    print(f"Created:       {thread_data.get('created_at')}")
    print(f"Updated:       {thread_data.get('updated_at')}")

    # Metadata
    metadata = thread_data.get("metadata", {})
    if metadata:
        print("\n📊 Metadata:")
        print(f"   Graph ID:    {metadata.get('graph_id')}")
        print(f"   Assistant ID: {metadata.get('assistant_id')}")

    # Config
    config = thread_data.get("config", {})
    configurable = config.get("configurable", {})

    # Try to extract organization_id and user_id from multiple sources
    # (LangGraph may not persist configurable values in thread state)
    organization_id = configurable.get("organization_id")
    user_id = configurable.get("user_id")

    # First, try to get from metadata (LangGraph stores them there during execution)
    if not organization_id or not user_id:
        if not organization_id:
            organization_id = metadata.get("organization_id")
        if not user_id:
            user_id = metadata.get("user_id")

    # If still not found, search in messages for these IDs (they might appear in tool error messages)
    if not organization_id or not user_id:
        values = thread_data.get("values", {})
        messages = values.get("messages", [])
        for msg in messages:
            content = msg.get("content", "")
            if isinstance(content, str):
                # Look for organization_id pattern in content
                if not organization_id:
                    org_match = re.search(r"organizations/([a-f0-9-]{36})", content)
                    if org_match:
                        organization_id = org_match.group(1)
                # Look for organization_id= pattern in URLs
                if not organization_id:
                    org_match = re.search(r"organization_id=([a-f0-9-]{36})", content)
                    if org_match:
                        organization_id = org_match.group(1)
                # Look for user_id pattern
                if not user_id:
                    user_match = re.search(r"user_id=([a-f0-9-]{36})", content)
                    if user_match:
                        user_id = user_match.group(1)

    # Display config
    if configurable:
        print("\n⚙️  Config:")
        for key, value in configurable.items():
            # Don't show JWT token in full (security)
            if key == "jwt_token" and value:
                print(f"   {key}: {value[:20]}... (truncated)")
            else:
                print(f"   {key}: {value}")
        # Show extracted values if they weren't in configurable
        if organization_id and "organization_id" not in configurable:
            source = "metadata" if metadata.get("organization_id") else "messages"
            print(f"   organization_id: {organization_id} (extracted from {source})")
        if user_id and "user_id" not in configurable:
            source = "metadata" if metadata.get("user_id") else "messages"
            print(f"   user_id: {user_id} (extracted from {source})")
    elif organization_id or user_id:
        # Config structure exists but configurable is empty, but we found values
        print("\n⚙️  Config:")
        if organization_id:
            source = "metadata" if metadata.get("organization_id") else "messages"
            print(f"   organization_id: {organization_id} (extracted from {source})")
        if user_id:
            source = "metadata" if metadata.get("user_id") else "messages"
            print(f"   user_id: {user_id} (extracted from {source})")
        print("   Note: config.configurable is empty in stored thread state")
    else:
        print("\n⚠️  Config: Empty (no organization_id or user_id found!)")

    # Messages
    values = thread_data.get("values", {})
    messages = values.get("messages", [])

    print(f"\n💬 Messages ({len(messages)}):")
    print("-" * 80)

    for i, msg in enumerate(messages, 1):
        msg_type = msg.get("type", "unknown")
        msg_id = msg.get("id", "")[:8] + "..." if msg.get("id") else "N/A"

        print(f"\n{i}. [{msg_type.upper()}] (ID: {msg_id})")

        if msg_type == "human":
            content = msg.get("content", "")
            print(f"   {content}")

        elif msg_type == "ai":
            content = msg.get("content", "")

            # Handle structured content
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict):
                        item_type = item.get("type", "")
                        if item_type == "text":
                            text = item.get("text", "")
                            # Truncate long text
                            if len(text) > 300:
                                text = text[:300] + "..."
                            print(f"   {text}")
                        elif item_type == "tool_use":
                            tool_name = item.get("name", "unknown")
                            tool_input = item.get("input", {})
                            print(f"\n   🔧 Tool Call: {tool_name}")
                            print(f"      Input: {json.dumps(tool_input, indent=6)}")
            elif isinstance(content, str):
                if len(content) > 300:
                    content = content[:300] + "..."
                print(f"   {content}")

            # Show tool calls if present
            tool_calls = msg.get("tool_calls", [])
            if tool_calls:
                print(f"\n   🔧 Tool Calls ({len(tool_calls)}):")
                for tool_call in tool_calls:
                    tool_name = tool_call.get("name", "unknown")
                    tool_args = tool_call.get("args", {})
                    print(f"      - {tool_name}: {json.dumps(tool_args)}")

            # Show usage metadata
            usage = msg.get("usage_metadata", {})
            if usage:
                total_tokens = usage.get("total_tokens", 0)
                input_tokens = usage.get("input_tokens", 0)
                output_tokens = usage.get("output_tokens", 0)
                print(
                    f"   📊 Tokens: {total_tokens} total ({input_tokens} in, {output_tokens} out)"
                )

        elif msg_type == "tool":
            tool_name = msg.get("name", "unknown")
            content = msg.get("content", "")
            status = msg.get("status", "unknown")

            print(f"   Tool: {tool_name} (Status: {status})")

            # Handle content that might be a string or list
            content_str = ""
            if isinstance(content, list):
                # Convert list to string representation
                content_str = json.dumps(content)
            elif isinstance(content, str):
                content_str = content
            else:
                content_str = str(content)

            # Check for errors
            if "Error" in content_str or "error" in content_str.lower():
                print("   ⚠️  ERROR:")
                # Truncate long errors
                if len(content_str) > 500:
                    content_str = content_str[:500] + "..."
                print(f"   {content_str}")
            else:
                # Truncate long content
                if len(content_str) > 300:
                    content_str = content_str[:300] + "..."
                print(f"   {content_str}")

    # Errors
    error = thread_data.get("error")
    if error:
        print("\n❌ Thread Error:")
        print(f"   {error}")

    print("\n" + "=" * 80)


def chat_with_agent(
    jwt_token: str,
    organization_id: str,
    user_id: str,
    message: str,
    thread_id: Optional[str] = None,
    base_url: str = "http://localhost:3000",
) -> None:
    """
    Chat with the Knowted AI agent via the backend proxy.

    Args:
        jwt_token: JWT authentication token
        organization_id: Organization ID
        user_id: User ID
        message: Message to send to the agent
        thread_id: Optional thread ID for conversation continuity (auto-generated if not provided)
        base_url: Backend base URL (default: http://localhost:3000)
    """
    # Generate thread ID if not provided
    generated_thread_id = None
    if not thread_id:
        thread_id = str(uuid.uuid4())
        generated_thread_id = thread_id
        print(f"📝 New conversation thread: {thread_id}")

    url = f"{base_url}/api/v1/langgraph/threads/{thread_id}/runs/stream"
    headers = {
        "accept": "*/*",
        "authorization": f"Bearer {jwt_token}",
        "content-type": "application/json",
    }

    body = {
        "input": {"messages": [{"type": "human", "content": message}]},
        "config": {
            "configurable": {
                "organization_id": organization_id,
                "user_id": user_id,
            }
        },
        "stream_mode": ["messages-tuple", "values"],
        "stream_resumable": False,
        "assistant_id": "knowted_agent",
        "on_disconnect": "cancel",
    }

    print("\n" + "=" * 80)
    print("🤖 KNOWTED AI AGENT CHAT")
    print("=" * 80)
    print(f"📝 Thread ID:     {thread_id}")
    print(f"🏢 Organization:  {organization_id}")
    print(f"👤 User ID:       {user_id}")
    print(f"💬 Message:       {message}")
    print("=" * 80)
    print("\n📤 Sending request...")
    print("-" * 80)

    try:
        response = requests.post(
            url, headers=headers, json=body, stream=True, timeout=120
        )

        if response.status_code == 401:
            print("\n❌ Authentication failed. Please check your JWT token.")
            sys.exit(1)
        elif response.status_code not in [200, 201]:
            print(f"\n❌ Error: HTTP {response.status_code}")
            print("-" * 80)
            print(response.text)
            print("-" * 80)
            sys.exit(1)

        print("✅ Connected! Streaming response...\n")
        print("=" * 80)
        print("📥 AGENT RESPONSE")
        print("=" * 80)
        print()

        # Stream the response
        full_response = ""
        tool_calls = []
        errors = []
        step_count = 0
        current_event = None

        for line in response.iter_lines():
            if line:
                decoded = line.decode("utf-8")

                # Handle Server-Sent Events format
                if decoded.startswith("event: "):
                    current_event = decoded[7:].strip()
                    continue
                elif decoded.startswith("data: "):
                    data_str = decoded[6:]  # Remove 'data: ' prefix
                    try:
                        data = json.loads(data_str)

                        # Handle different response formats based on event type
                        # We primarily care about "messages" events for the agent response
                        if current_event == "messages":
                            # Data is an array of message objects
                            if isinstance(data, list):
                                for msg_obj in data:
                                    msg_type = msg_obj.get("type", "")
                                    content = msg_obj.get("content", "")

                                    # Handle AIMessageChunk - streaming text
                                    if msg_type == "AIMessageChunk":
                                        if isinstance(content, list):
                                            for item in content:
                                                if isinstance(item, dict):
                                                    item_type = item.get("type", "")

                                                    # Handle text content
                                                    if item_type == "text":
                                                        text = item.get("text", "")
                                                        if text:
                                                            print(
                                                                text, end="", flush=True
                                                            )
                                                            full_response += text

                                                    # Handle tool calls
                                                    elif item_type == "tool_use":
                                                        tool_name = item.get(
                                                            "name", "unknown"
                                                        )
                                                        tool_id = item.get("id", "")
                                                        tool_input = item.get(
                                                            "input", {}
                                                        )
                                                        tool_calls.append(
                                                            {
                                                                "name": tool_name,
                                                                "id": tool_id,
                                                                "input": tool_input,
                                                            }
                                                        )
                                                        print(
                                                            f"\n\n🔧 TOOL CALL: {tool_name}"
                                                        )
                                                        print(
                                                            f"   Input: {json.dumps(tool_input, indent=2)}"
                                                        )

                                        # Also check tool_calls array
                                        tool_calls_array = msg_obj.get("tool_calls", [])
                                        for tool_call in tool_calls_array:
                                            tool_name = tool_call.get("name", "unknown")
                                            tool_id = tool_call.get("id", "")
                                            tool_input = tool_call.get("args", {})
                                            tool_calls.append(
                                                {
                                                    "name": tool_name,
                                                    "id": tool_id,
                                                    "input": tool_input,
                                                }
                                            )
                                            print(f"\n\n🔧 TOOL CALL: {tool_name}")
                                            print(
                                                f"   Input: {json.dumps(tool_input, indent=2)}"
                                            )

                                    # Handle tool messages (errors)
                                    elif msg_type == "tool":
                                        if isinstance(content, str):
                                            if (
                                                "Error" in content
                                                or "error" in content.lower()
                                            ):
                                                errors.append(content)
                                                print(f"\n⚠️  TOOL ERROR:\n{content}\n")

                                    # Handle AI messages (final response)
                                    elif msg_type == "ai" or msg_type == "AIMessage":
                                        if isinstance(content, list):
                                            for item in content:
                                                if (
                                                    isinstance(item, dict)
                                                    and item.get("type") == "text"
                                                ):
                                                    text = item.get("text", "")
                                                    if text:
                                                        print(text, end="", flush=True)
                                                        full_response += text
                                        elif isinstance(content, str):
                                            print(content, end="", flush=True)
                                            full_response += content

                        # Also handle "values" event which contains the full message list
                        elif (
                            current_event == "values"
                            and isinstance(data, dict)
                            and "messages" in data
                        ):
                            for msg in data["messages"]:
                                if isinstance(msg, dict):
                                    msg_type = msg.get("type", "")
                                    content = msg.get("content", "")

                                    if msg_type == "ai" or msg_type == "AIMessage":
                                        if isinstance(content, list):
                                            for item in content:
                                                if isinstance(item, dict):
                                                    if item.get("type") == "text":
                                                        text = item.get("text", "")
                                                        if (
                                                            text
                                                            and text
                                                            not in full_response
                                                        ):
                                                            print(
                                                                text, end="", flush=True
                                                            )
                                                            full_response += text
                                        elif (
                                            isinstance(content, str)
                                            and content not in full_response
                                        ):
                                            print(content, end="", flush=True)
                                            full_response += content

                                    elif msg_type == "tool":
                                        if isinstance(content, str) and (
                                            "Error" in content
                                            or "error" in content.lower()
                                        ):
                                            errors.append(content)
                                            print(f"\n⚠️  TOOL ERROR:\n{content}\n")

                        # Fallback: handle dict with messages key
                        elif isinstance(data, dict) and "messages" in data:
                            for msg in data["messages"]:
                                if isinstance(msg, list) and len(msg) >= 2:
                                    role, content = msg[0], msg[1]

                                    # Handle tool messages (errors)
                                    if role == "tool":
                                        if isinstance(content, str):
                                            if (
                                                "Error" in content
                                                or "error" in content.lower()
                                            ):
                                                errors.append(content)
                                                print(f"\n⚠️  TOOL ERROR:\n{content}\n")

                                    # Handle assistant messages
                                    if role == "assistant" or role == "ai":
                                        if isinstance(content, str):
                                            print(content, end="", flush=True)
                                            full_response += content
                                        elif isinstance(content, list):
                                            # Handle structured content (text, tool_use, etc.)
                                            for item in content:
                                                if isinstance(item, dict):
                                                    item_type = item.get("type")

                                                    # Handle text content
                                                    if item_type == "text":
                                                        text = item.get("text", "")
                                                        print(text, end="", flush=True)
                                                        full_response += text

                                                    # Handle tool calls
                                                    elif item_type == "tool_use":
                                                        tool_name = item.get(
                                                            "name", "unknown"
                                                        )
                                                        tool_id = item.get("id", "")
                                                        tool_input = item.get(
                                                            "input", {}
                                                        )
                                                        tool_calls.append(
                                                            {
                                                                "name": tool_name,
                                                                "id": tool_id,
                                                                "input": tool_input,
                                                            }
                                                        )
                                                        print(
                                                            f"\n\n🔧 TOOL CALL: {tool_name}"
                                                        )
                                                        print(
                                                            f"   Input: {json.dumps(tool_input, indent=2)}"
                                                        )

                        elif isinstance(data, dict) and "content" in data:
                            content = data["content"]
                            if isinstance(content, str):
                                print(content, end="", flush=True)
                                full_response += content
                            elif isinstance(content, list):
                                for item in content:
                                    if isinstance(item, dict):
                                        if item.get("type") == "text":
                                            text = item.get("text", "")
                                            print(text, end="", flush=True)
                                            full_response += text
                                        elif item.get("type") == "tool_use":
                                            tool_name = item.get("name", "unknown")
                                            tool_input = item.get("input", {})
                                            tool_calls.append(
                                                {"name": tool_name, "input": tool_input}
                                            )
                                            print(f"\n\n🔧 TOOL CALL: {tool_name}")
                                            print(
                                                f"   Input: {json.dumps(tool_input, indent=2)}"
                                            )

                        elif isinstance(data, dict) and "output" in data:
                            output = data["output"]
                            if isinstance(output, dict) and "messages" in output:
                                for msg in output["messages"]:
                                    if isinstance(msg, list) and len(msg) >= 2:
                                        role, content = msg[0], msg[1]
                                        if role == "assistant" or role == "ai":
                                            if isinstance(content, str):
                                                print(content, end="", flush=True)
                                                full_response += content
                                            elif isinstance(content, list):
                                                for item in content:
                                                    if isinstance(item, dict):
                                                        if item.get("type") == "text":
                                                            text = item.get("text", "")
                                                            print(
                                                                text, end="", flush=True
                                                            )
                                                            full_response += text
                                                        elif (
                                                            item.get("type")
                                                            == "tool_use"
                                                        ):
                                                            tool_name = item.get(
                                                                "name", "unknown"
                                                            )
                                                            tool_input = item.get(
                                                                "input", {}
                                                            )
                                                            tool_calls.append(
                                                                {
                                                                    "name": tool_name,
                                                                    "input": tool_input,
                                                                }
                                                            )
                                                            print(
                                                                f"\n\n🔧 TOOL CALL: {tool_name}"
                                                            )
                                                            print(
                                                                f"   Input: {json.dumps(tool_input, indent=2)}"
                                                            )
                    except json.JSONDecodeError:
                        # Not JSON, print as-is
                        if data_str.strip() and not data_str.startswith(":"):
                            print(f"\n[Raw data: {data_str[:100]}...]")

        print("\n")
        print("=" * 80)
        print("📊 SUMMARY")
        print("=" * 80)
        print(f"✅ Conversation saved to thread: {thread_id}")

        if tool_calls:
            print(f"\n🔧 Tool calls made: {len(tool_calls)}")
            for i, tool_call in enumerate(tool_calls, 1):
                print(f"   {i}. {tool_call['name']}")
                if tool_call.get("input"):
                    # Show input but truncate if too long
                    input_str = json.dumps(tool_call["input"])
                    if len(input_str) > 100:
                        input_str = input_str[:100] + "..."
                    print(f"      Input: {input_str}")

        if errors:
            print(f"\n⚠️  Errors encountered: {len(errors)}")
            for i, error in enumerate(errors, 1):
                error_preview = error[:200] + "..." if len(error) > 200 else error
                print(f"   {i}. {error_preview}")

        print("\n💡 Continue this conversation:")
        print(
            f'   python command/chat.py --jwt <token> --org-id {organization_id} --user-id {user_id} --thread-id {thread_id} --message "your message"'
        )
        print("\n💡 View thread state:")
        print(f"   python command/chat.py --show-state --thread-id {thread_id}")
        print("=" * 80)

        return thread_id  # Return thread_id so caller can use it

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend server.")
        print(f"   Make sure the server is running at {base_url}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Chat with the Knowted AI agent or read thread state",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Read thread state (simplest - just provide thread ID)
  python command/chat.py d138f78b-753d-4f1c-b636-8e86f95f4621

  # Start a new conversation
  python command/chat.py --jwt "token" --org-id "org-id" --user-id "user-id" --message "Hello"

  # Continue an existing conversation
  python command/chat.py --jwt "token" --org-id "org-id" --user-id "user-id" --thread-id "thread-id" --message "What did we discuss?"

  # Interactive mode (if message not provided)
  python command/chat.py --jwt "token" --org-id "org-id" --user-id "user-id"
        """,
    )

    # Positional argument for thread ID (for reading thread state)
    parser.add_argument(
        "thread_id_positional",
        nargs="?",
        help="Thread ID to read (if provided without other args, will just display thread state)",
    )

    parser.add_argument("--jwt", required=False, help="JWT authentication token")

    parser.add_argument(
        "--org-id",
        "--organization-id",
        dest="organization_id",
        required=False,
        help="Organization ID",
    )

    parser.add_argument("--user-id", required=False, help="User ID")

    parser.add_argument(
        "--thread-id",
        help="Thread ID for conversation continuity (auto-generated if not provided)",
    )

    parser.add_argument(
        "--message",
        "-m",
        help="Message to send to the agent (if not provided, will prompt interactively)",
    )

    parser.add_argument(
        "--url",
        default="http://localhost:3000",
        help="Backend base URL (default: http://localhost:3000)",
    )

    parser.add_argument(
        "--langgraph-url",
        default="http://127.0.0.1:2024",
        help="LangGraph API base URL (default: http://127.0.0.1:2024)",
    )

    parser.add_argument(
        "--show-state",
        action="store_true",
        help="Show thread state after chatting (fetches from LangGraph API)",
    )

    args = parser.parse_args()

    # Determine thread_id: use positional arg, then --thread-id, then None
    thread_id = args.thread_id_positional or args.thread_id

    # If only thread_id is provided (no JWT, no message, no other args), just read the thread
    if (
        thread_id
        and not args.jwt
        and not args.message
        and not args.organization_id
        and not args.user_id
    ):
        print(f"📖 Reading thread state for: {thread_id}")
        thread_data = fetch_thread_state(thread_id, args.langgraph_url)
        if thread_data:
            display_thread_state(thread_data)
        else:
            print(f"❌ Could not fetch thread state for {thread_id}")
            sys.exit(1)
        sys.exit(0)

    # If --show-state is provided without a message, just show the state
    if args.show_state and not args.message:
        if not thread_id:
            print("❌ Thread ID is required when using --show-state without a message")
            sys.exit(1)

        thread_data = fetch_thread_state(thread_id, args.langgraph_url)
        if thread_data:
            display_thread_state(thread_data)
        sys.exit(0)

    # Validate required arguments for chatting
    if not args.jwt:
        print("❌ --jwt is required for chatting")
        sys.exit(1)
    if not args.organization_id:
        print("❌ --org-id is required for chatting")
        sys.exit(1)
    if not args.user_id:
        print("❌ --user-id is required for chatting")
        sys.exit(1)

    # Get message from argument or prompt
    message = args.message
    if not message:
        print("Enter your message (press Ctrl+D or Ctrl+C to exit):")
        try:
            message = sys.stdin.read().strip()
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            sys.exit(0)
        except EOFError:
            print("\n👋 Goodbye!")
            sys.exit(0)

        if not message:
            print("❌ No message provided")
            sys.exit(1)

    returned_thread_id = chat_with_agent(
        jwt_token=args.jwt,
        organization_id=args.organization_id,
        user_id=args.user_id,
        message=message,
        thread_id=thread_id,  # Use the determined thread_id
        base_url=args.url,
    )

    # Show thread state if requested
    if args.show_state:
        # Use returned thread_id or the provided one
        final_thread_id = returned_thread_id or thread_id
        if not final_thread_id:
            print("\n⚠️  Cannot show state: thread_id not available.")
        else:
            print("\n" + "=" * 80)
            print("📥 Fetching thread state from LangGraph API...")
            print("=" * 80)
            thread_data = fetch_thread_state(final_thread_id, args.langgraph_url)
            if thread_data:
                display_thread_state(thread_data)


if __name__ == "__main__":
    main()
