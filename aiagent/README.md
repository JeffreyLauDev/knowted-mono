# Knowted AI Agent

## Overview

The Knowted AI Agent is a LangGraph-based AI assistant that analyzes meetings and provides insights. It uses DeepAgents for planning, filesystem management, and subagent capabilities, integrated with Knowted's backend API for secure, context-aware meeting analysis.

## Quick Start

### Prerequisites

- Python 3.9+ (3.11 recommended)
- PostgreSQL database (for conversation memory)
- Access to Knowted backend API
- Anthropic API key

### Installation

1. **Create virtual environment:**
```bash
cd aiagent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables:**
Create a `.env` file in the `aiagent` directory:
```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database (for conversation memory)
DATABASE_URL=postgresql://user:password@localhost:5432/knowted
# OR
POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/knowted

# Backend API (for tool access)
KNOWTED_API_URL=http://localhost:3000
INTERNAL_SERVICE_SECRET=your_internal_service_secret  # Optional, for service-to-service auth
```

4. **Verify installation:**
```bash
python test_setup.py
```

5. **Start the server:**
```bash
# Option 1: Use the start script
./start_server.sh

# Option 2: Use langgraph CLI directly
langgraph dev --port 2024
```

The agent will be available at:
- **API**: http://localhost:2024
- **Docs**: http://localhost:2024/docs
- **Studio**: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
- **MCP Endpoint**: http://localhost:2024/mcp (POST only, requires JSON-RPC format)

**Note**: The MCP endpoint cannot be accessed directly in a browser (it requires POST requests with JSON-RPC payloads). Use an MCP client or make POST requests with the proper format.

## Integration with Backend

The agent integrates with the Knowted NestJS backend:

1. **Backend calls the agent** via LangGraph API at `http://localhost:2024`
2. **Backend provides context** via `config.configurable`:
   - `organization_id` - Set from authenticated user's JWT
   - `user_id` - Set from authenticated user's JWT
   - `thread_id` - Conversation thread ID for memory
   - `jwt_token` - JWT token for API authentication
   - `user_name` - User's full name (fetched from profile)
   - `organization_name` - Organization name (fetched from database)
   - `team_name` - User's team name (fetched from organization membership)
   - `accessible_meeting_types` - List of meeting types user can access (optional, fetched if needed)
   - `user_profile` - User profile data (optional, fetched if needed)

3. **Agent tools** automatically use this context via `get_context_from_config()` for secure API calls

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API (NestJS)                          │
│  - Sets config.configurable.organization_id                      │
│  - Sets config.configurable.user_id                              │
│  - Sets config.configurable.user_name                            │
│  - Sets config.configurable.organization_name                    │
│  - Sets config.configurable.team_name                            │
│  - Sets config.configurable.thread_id                            │
│  - Sets config.configurable.jwt_token                            │
│  - Sets config.configurable.accessible_meeting_types             │
│  - Authenticates via JWT                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ (config with full user context)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              knowted_agent (Main Entry Point)                    │
│  - Enriches config with user context                             │
│  - Builds dynamic system prompts                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌───────────────────────────────────────┐
        │   create_knowted_agent()              │
        │   (Base Agent Factory)                │
        └───────────────┬───────────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┬───────────────┐
        │               │               │               │               │
        ▼               ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Main       │ │   Planning   │ │ Filesystem   │ │  Subagent    │ │  Research    │
│   Agent      │ │   Agent      │ │   Agent      │ │  Coordinator │ │   Agent      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                 │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   DeepAgents Middleware       │
                    │   (Automatically Included)    │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Planning    │          │ Filesystem   │          │  SubAgent    │
│ Middleware   │          │ Middleware   │          │ Middleware   │
│              │          │              │          │              │
│ write_todos  │          │ ls           │          │ task         │
└──────────────┘          │ read_file    │          └──────┬───────┘
                          │ write_file   │                 │
                          │ edit_file    │                 │
                          └──────────────┘                 │
                                                           │
                                                           ▼
                                              ┌──────────────────────┐
                                              │   Subagents          │
                                              │   (Spawned on demand)│
                                              │                      │
                                              │ - Isolated context   │
                                              │ - Can use all tools  │
                                              │ - Parallel execution │
                                              └──────────────────────┘
```

## Tool Allocation

### DeepAgents Automatic Tools (Available to ALL Agents)

These tools are automatically provided by DeepAgents middleware:

| Tool | Source | Purpose |
|------|--------|---------|
| `write_todos` | PlanningMiddleware | Create and manage todo lists for task tracking |
| `ls` | FilesystemMiddleware | List files and directories |
| `read_file` | FilesystemMiddleware | Read file contents |
| `write_file` | FilesystemMiddleware | Write new files |
| `edit_file` | FilesystemMiddleware | Edit existing files with precise control |
| `task` | SubAgentMiddleware | Spawn subagents for parallel task execution |

### Knowted-Specific Tools (Configurable per Agent)

These tools are added based on the `include_meeting_tools` and `include_rag` parameters:

| Tool | Category | Purpose | Default |
|------|----------|---------|---------|
| `smart_search_meetings` | Meeting | Advanced meeting search with filtering | ✅ All (if meeting tools enabled) |
| `get_meeting_transcript` | Meeting | Get full transcript for a meeting | ✅ All (if meeting tools enabled) |
| `list_meetings` | Meeting | List meetings by type and date range | ✅ All (if meeting tools enabled) |
| `get_meeting_summary` | Meeting | Get summary for a specific meeting | ✅ All (if meeting tools enabled) |
| `search_meetings` | Meeting | Basic search across meetings | ✅ All (if meeting tools enabled) |
| `get_meeting_insights` | Meeting | Get insights for a specific meeting | ✅ All (if meeting tools enabled) |
| `get_user_accessible_meeting_types` | Meeting | Get user's accessible meeting types | ✅ All (if meeting tools enabled) |
| `rag_search` | RAG | Semantic search across meeting transcripts | ✅ Main, Research (if RAG enabled) |
| `calculator` | Utility | Perform mathematical calculations | ✅ All |

### Specialized Tools (Not in Main Agents)

These tools exist but are **NOT** included in the main agent configurations:

| Tool | Purpose |
|------|---------|
| `generate_report` | Generate reports for teams/organizations |
| `get_report_data` | Get data for a specific report |
| `create_report_template` | Create report templates |
| `get_team_insights` | Get insights and analytics for a team |
| `get_team_members` | Get team members |
| `get_team_meetings` | Get meetings for a team |
| `call_knowted_api` | Generic API call tool |
| `get_organization_data` | Get organization data |

## Security Model

### Context Flow

```
Backend (JWT Auth)
    │
    │ Sets: config.configurable.organization_id
    │ Sets: config.configurable.user_id
    │ Sets: config.configurable.thread_id
    │ Sets: config.configurable.jwt_token
    │ Sets: config.configurable.user_name
    │ Sets: config.configurable.organization_name
    │ Sets: config.configurable.team_name
    │ Sets: config.configurable.accessible_meeting_types (optional)
    │
    ▼
knowted_agent.invoke()
    │
    │ Enriches config with user context
    │
    ▼
Agent Execution
    │
    │ LLM decides to call tool
    │
    ▼
Tool Execution
    │
    ├─► Calls get_context_from_config()
    ├─► Extracts organization_id from config (backend)
    ├─► Extracts user_id from config (backend)
    └─► Uses secure values for API calls
```

### Security Guarantees

1. ✅ `organization_id` and `user_id` are extracted from `config.configurable` at runtime
2. ✅ Tools use `get_context_from_config()` to access context securely
3. ✅ Values **ALWAYS** come from backend config (JWT authentication)
4. ✅ LLM cannot override these values - they're not in tool parameters
5. ✅ All API calls use secure context from backend authentication
6. ✅ Additional context (user_name, organization_name, team_name) is fetched by backend from database

## Agent Configurations

### 1. Main Agent (`knowted_agent`)

**Purpose**: Default meeting analysis agent for general user queries

**Tools**:
- ✅ All DeepAgents tools (planning, filesystem, subagent)
- ✅ All meeting tools (7 tools)
- ✅ Calculator
- ✅ RAG search (if available)

**Configuration**:
```python
create_knowted_agent(
    include_meeting_tools=True,  # Default
    include_rag=True,            # Default
    use_memory=True              # Default
)
```

**Use Case**: General meeting analysis, answering user questions about meetings

---

### 2. Planning Agent (`create_planning_agent`)

**Purpose**: Task decomposition and project planning

**Tools**:
- ✅ All DeepAgents tools (planning, filesystem, subagent)
- ✅ All meeting tools (for planning context)
- ✅ Calculator
- ❌ RAG (not needed for planning)

**Use Case**: Breaking down complex projects, creating task lists, referencing past meetings for planning

---

### 3. Filesystem Agent (`create_filesystem_agent`)

**Purpose**: File and code management

**Tools**:
- ✅ All DeepAgents tools (planning, filesystem, subagent)
- ✅ All meeting tools (to find files mentioned in meetings)
- ✅ Calculator
- ❌ RAG (not needed for filesystem)

**Use Case**: Reading/writing files, code management, finding files referenced in meetings

---

### 4. Subagent Coordinator (`create_subagent_agent`)

**Purpose**: Parallel task execution via subagent delegation

**Tools**:
- ✅ All DeepAgents tools (planning, filesystem, subagent)
- ✅ All meeting tools (subagents can search meetings in parallel)
- ✅ Calculator
- ❌ RAG (subagents don't need RAG)

**Use Case**: 
- Parallel meeting searches (e.g., "Find meetings about X, Y, Z simultaneously")
- Delegating specialized tasks to isolated subagents
- Context isolation for complex tasks

**Subagent Behavior**:
- Subagents are spawned with the same tool set as the parent agent
- Each subagent has isolated context (doesn't share with parent)
- Subagents can run in parallel
- Subagents can spawn their own subagents (nested)

---

### 5. Research Agent (`create_research_agent`)

**Purpose**: Deep research with context management

**Tools**:
- ✅ All DeepAgents tools (planning, filesystem, subagent)
- ✅ All meeting tools (for research context)
- ✅ Calculator
- ✅ RAG search (for semantic research)

**Use Case**: 
- Comprehensive research tasks
- Storing findings in files (context management)
- Parallel research via subagents
- Meeting context for research topics

## Subagent Architecture

### How Subagents Work

```
Main Agent (Subagent Coordinator)
    │
    │ Uses 'task' tool
    │
    ├─► Subagent 1 (Isolated Context)
    │   │
    │   ├─► Tools: All parent tools available
    │   ├─► Context: Isolated (doesn't see parent's context)
    │   └─► Can spawn: Its own subagents (nested)
    │
    ├─► Subagent 2 (Isolated Context)
    │   │
    │   ├─► Tools: All parent tools available
    │   ├─► Context: Isolated
    │   └─► Can spawn: Its own subagents
    │
    └─► Subagent 3 (Isolated Context)
        │
        ├─► Tools: All parent tools available
        ├─► Context: Isolated
        └─► Can spawn: Its own subagents

All subagents run in PARALLEL
Results are returned to parent agent
```

### Example: Parallel Meeting Search

```
User Query: "Find all meetings about project planning, code reviews, and team standups"

Main Agent (Subagent Coordinator)
    │
    ├─► Subagent 1: Search "project planning" meetings
    │   └─► Uses: smart_search_meetings, list_meetings
    │
    ├─► Subagent 2: Search "code reviews" meetings
    │   └─► Uses: smart_search_meetings, list_meetings
    │
    └─► Subagent 3: Search "team standups" meetings
        └─► Uses: smart_search_meetings, list_meetings

All 3 subagents run in PARALLEL
Main agent combines results
```

## Best Practices

### When to Use Each Agent

1. **Main Agent**: General meeting analysis, user questions
2. **Planning Agent**: Task decomposition, project planning
3. **Filesystem Agent**: File operations, code management
4. **Subagent Coordinator**: Parallel searches, context isolation
5. **Research Agent**: Deep research, comprehensive analysis

### When to Use Subagents

- ✅ Searching for multiple types of meetings in parallel
- ✅ Complex tasks that would clutter main context
- ✅ Specialized analysis requiring focused attention
- ✅ Tasks that benefit from parallel execution

### Context Management

- ✅ Use filesystem tools to store large data (prevents context overflow)
- ✅ Use subagents for context isolation
- ✅ Use planning tools to break down large tasks
- ✅ Store intermediate results in files

## Example Workflows

### Workflow 1: Parallel Meeting Search

```
User: "Find all meetings about project planning, code reviews, and standups"

Main Agent (Subagent Coordinator)
    ├─► Subagent 1: smart_search_meetings("project planning")
    ├─► Subagent 2: smart_search_meetings("code reviews")
    └─► Subagent 3: smart_search_meetings("standups")
    
    All run in parallel → Results combined → User gets comprehensive answer
```

### Workflow 2: Research with Context Management

```
User: "Research AI agents impact on software development"

Research Agent
    1. write_todos: Break down research into sub-questions
    2. task: Spawn subagent for "current state" research
    3. task: Spawn subagent for "frameworks comparison" research
    4. write_file: Store subagent findings
    5. read_file: Read all findings
    6. Synthesize comprehensive report
```

### Workflow 3: Planning with Meeting Context

```
User: "Plan a new feature based on past meetings"

Planning Agent
    1. smart_search_meetings: Find relevant past meetings
    2. get_meeting_transcript: Read meeting details
    3. write_todos: Create plan based on meeting insights
    4. write_file: Store planning document
```

## Configuration

### langgraph.json

The agent is configured via `langgraph.json`:
```json
{
  "dependencies": ["."],
  "graphs": {
    "knowted_agent": "./knowted_agent.py:knowted_agent"
  },
  "env": ".env"
}
```

## Troubleshooting

### Port 2024 already in use
```bash
# Find and kill the process
lsof -ti :2024 | xargs kill -9
```

### Import errors
Make sure virtual environment is activated and dependencies are installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Database connection errors
Verify `DATABASE_URL` is correct and PostgreSQL is running.

### API connection errors
Verify `KNOWTED_API_URL` points to your backend and the backend is running.

### Missing context errors
Ensure the backend is passing required fields in `config.configurable`:
- `organization_id` (required)
- `user_id` (required)
- `thread_id` (required for memory)
- `jwt_token` (required for API calls)
- `user_name`, `organization_name`, `team_name` (optional, but recommended)

## Tool Allocation Summary

| Tool Category | Main | Planning | Filesystem | Subagent | Research |
|--------------|------|----------|------------|----------|----------|
| **DeepAgents Tools** |
| write_todos | ✅ | ✅ | ✅ | ✅ | ✅ |
| ls | ✅ | ✅ | ✅ | ✅ | ✅ |
| read_file | ✅ | ✅ | ✅ | ✅ | ✅ |
| write_file | ✅ | ✅ | ✅ | ✅ | ✅ |
| edit_file | ✅ | ✅ | ✅ | ✅ | ✅ |
| task (subagent) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Knowted Meeting Tools** |
| smart_search_meetings | ✅ | ✅ | ✅ | ✅ | ✅ |
| get_meeting_transcript | ✅ | ✅ | ✅ | ✅ | ✅ |
| list_meetings | ✅ | ✅ | ✅ | ✅ | ✅ |
| get_meeting_summary | ✅ | ✅ | ✅ | ✅ | ✅ |
| search_meetings | ✅ | ✅ | ✅ | ✅ | ✅ |
| get_meeting_insights | ✅ | ✅ | ✅ | ✅ | ✅ |
| get_user_accessible_meeting_types | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Other Tools** |
| calculator | ✅ | ✅ | ✅ | ✅ | ✅ |
| rag_search | ✅ | ❌ | ❌ | ❌ | ✅ |
