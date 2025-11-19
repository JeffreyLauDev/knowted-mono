"""
Vector Store Setup for Knowted RAG

Uses PostgreSQL with pgvector extension for vector storage.
Falls back to in-memory store for development.
"""

import os
from typing import Optional

from langchain_community.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

# Try to import PGVector from langchain_postgres (new), fallback to langchain_community (old)
try:
    from langchain_postgres import PGVector

    # Flag to indicate we're using the new API
    USE_NEW_PGVECTOR = True
except ImportError:
    # Fallback to old implementation if langchain-postgres not installed
    from langchain_community.vectorstores import PGVector

    USE_NEW_PGVECTOR = False


def get_embeddings():
    """
    Get embeddings model.
    Uses OpenAI embeddings (can be switched to Anthropic if available).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        return OpenAIEmbeddings(openai_api_key=api_key)

    # Fallback: Use Anthropic embeddings if available
    # Note: Anthropic doesn't have separate embeddings, so we'll use OpenAI
    raise ValueError(
        "OPENAI_API_KEY not set. Required for embeddings. "
        "Set OPENAI_API_KEY in your .env file."
    )


def get_vector_store(
    collection_name: str = "knowted_knowledge_base",
    use_postgres: bool = True,
) -> Optional[PGVector]:
    """
    Get or create vector store.

    Args:
        collection_name: Name of the collection
        use_postgres: Whether to use PostgreSQL (requires pgvector)

    Returns:
        Vector store instance
    """
    connection_string = os.getenv("DATABASE_URL") or os.getenv(
        "POSTGRES_CONNECTION_STRING"
    )

    if use_postgres and connection_string:
        try:
            embeddings = get_embeddings()
            if USE_NEW_PGVECTOR:
                # New langchain-postgres API
                # Note: PGVector initialization may trigger async operations
                # This should be called lazily, not during module import
                return PGVector(
                    embeddings=embeddings,
                    connection=connection_string,
                    collection_name=collection_name,
                    use_jsonb=True,  # Use JSONB for metadata as recommended
                    pre_delete_collection=False,  # Don't delete on init
                )
            else:
                # Old langchain-community API
                return PGVector(
                    embedding_function=embeddings,
                    connection_string=connection_string,
                    collection_name=collection_name,
                )
        except Exception as e:
            print(f"Warning: Could not connect to PostgreSQL vector store: {e}")
            print("Falling back to in-memory store for development.")
            import traceback

            traceback.print_exc()
            return None

    return None


def setup_vector_store(
    collection_name: str = "knowted_knowledge_base",
) -> PGVector:
    """
    Setup and initialize vector store.

    Args:
        collection_name: Name of the collection

    Returns:
        Initialized vector store (falls back to in-memory if PostgreSQL unavailable)
    """
    try:
        vector_store = get_vector_store(collection_name)

        if vector_store is None:
            # Use in-memory store for development
            embeddings = get_embeddings()
            return InMemoryVectorStore(embeddings)

        return vector_store
    except Exception as e:
        # If anything goes wrong, fall back to in-memory store
        print(f"Warning: Could not setup vector store, using in-memory: {e}")
        try:
            embeddings = get_embeddings()
            return InMemoryVectorStore(embeddings)
        except Exception as e2:
            raise ValueError(
                f"Could not setup vector store or in-memory fallback: {e2}"
            ) from e2
