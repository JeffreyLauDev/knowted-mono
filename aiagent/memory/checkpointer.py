"""
Checkpointer Setup for Knowted Agents

Uses PostgreSQL for persistent conversation memory.
Falls back to in-memory checkpointer for development.
"""

import os
from typing import Optional, Union

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver


class PersistentPostgresSaver:
    """
    Wrapper to keep PostgresSaver context manager alive.
    
    PostgresSaver.from_conn_string() returns a context manager, but we need
    to keep it alive for the lifetime of the agent. This wrapper handles that.
    """
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._saver = None
        self._context = None
    
    def __enter__(self):
        if self._saver is None:
            self._context = PostgresSaver.from_conn_string(self.connection_string)
            self._saver = self._context.__enter__()
        return self._saver
    
    def __exit__(self, *args):
        if self._context:
            self._context.__exit__(*args)
    
    def __getattr__(self, name):
        if self._saver is None:
            self.__enter__()
        return getattr(self._saver, name)
    
    # Delegate all PostgresSaver methods
    def get(self, config):
        if self._saver is None:
            self.__enter__()
        return self._saver.get(config)
    
    def list(self, config, filter=None, before=None, limit=None):
        if self._saver is None:
            self.__enter__()
        return self._saver.list(config, filter=filter, before=before, limit=limit)
    
    def put(self, config, checkpoint, metadata, new_versions):
        if self._saver is None:
            self.__enter__()
        return self._saver.put(config, checkpoint, metadata, new_versions)


def get_checkpointer(use_postgres: bool = True) -> Optional[Union[PostgresSaver, PersistentPostgresSaver]]:
    """
    Get PostgreSQL checkpointer for conversation memory.

    Args:
        use_postgres: Whether to use PostgreSQL (requires connection)

    Returns:
        PostgresSaver instance or None
    """
    connection_string = os.getenv("DATABASE_URL") or os.getenv(
        "POSTGRES_CONNECTION_STRING"
    )

    if use_postgres and connection_string:
        try:
            # Return a persistent wrapper that keeps the context manager alive
            return PersistentPostgresSaver(connection_string)
        except Exception as e:
            print(f"Warning: Could not connect to PostgreSQL checkpointer: {e}")
            print("Falling back to in-memory checkpointer for development.")
            import traceback
            traceback.print_exc()
            return None

    return None


def setup_checkpointer(use_postgres: bool = True) -> Union[MemorySaver, PersistentPostgresSaver]:
    """
    Setup checkpointer for conversation memory.

    Args:
        use_postgres: Whether to use PostgreSQL

    Returns:
        Checkpointer instance (PostgresSaver or MemorySaver)
    """
    checkpointer = get_checkpointer(use_postgres)

    if checkpointer is None:
        # Use in-memory checkpointer for development
        print("⚠️  WARNING: Using in-memory checkpointer. Conversation data will be lost on restart!")
        print("   Set DATABASE_URL or POSTGRES_CONNECTION_STRING to use PostgreSQL.")
        return MemorySaver()

    print("✅ Using PostgreSQL checkpointer - conversation data will be persisted")
    return checkpointer
