"""
RAG Search Tool - Vector store semantic search for meetings
Context-aware: Filters by organization_id and user_id from config
"""

from typing import Any, List, Optional

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.tools import BaseTool, tool
from rag.vector_store import setup_vector_store


class ContextAwareRetriever(BaseRetriever):
    """
    Retriever wrapper that adds metadata filtering by organization_id and user_id.
    Filters results to only include documents from the user's organization.
    """

    def __init__(
        self,
        base_retriever: BaseRetriever,
        organization_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        super().__init__()
        self.base_retriever = base_retriever
        self.organization_id = organization_id
        self.user_id = user_id

    def _get_relevant_documents(
        self, query: str, *, run_manager: Any = None
    ) -> List[Document]:
        """Retrieve documents and filter by organization_id."""
        # Get documents from base retriever
        docs = self.base_retriever.get_relevant_documents(
            query, run_manager=run_manager
        )

        # Filter by organization_id if available
        if self.organization_id:
            filtered_docs = []
            for doc in docs:
                metadata = doc.metadata if hasattr(doc, "metadata") else {}
                # Check if document belongs to the organization
                doc_org_id = metadata.get("organization_id") or metadata.get(
                    "organisation_id"
                )
                if doc_org_id == self.organization_id:
                    filtered_docs.append(doc)
            return filtered_docs

        return docs

    async def _aget_relevant_documents(
        self, query: str, *, run_manager: Any = None
    ) -> List[Document]:
        """Async retrieve documents and filter by organization_id."""
        # Get documents from base retriever
        docs = await self.base_retriever.aget_relevant_documents(
            query, run_manager=run_manager
        )

        # Filter by organization_id if available
        if self.organization_id:
            filtered_docs = []
            for doc in docs:
                metadata = doc.metadata if hasattr(doc, "metadata") else {}
                # Check if document belongs to the organization
                doc_org_id = metadata.get("organization_id") or metadata.get(
                    "organisation_id"
                )
                if doc_org_id == self.organization_id:
                    filtered_docs.append(doc)
            return filtered_docs

        return docs


@tool
async def rag_search(
    query: str,
    k: int = 5,
) -> str:
    """
    Use RAG to look up information in the meetings. It will return the data with meeting_id,
    use tool "Get Meeting by meeting Id" or "Get Transcript" to get the meeting detail.

    This tool searches meeting transcripts and summaries using semantic similarity.
    Results are automatically filtered to only include meetings from your organization.

    The tool automatically uses your organization and user context for access control.

    Args:
        query: The search query (what you're looking for)
        k: Number of results to return (default: 5)

    Returns:
        JSON string with meeting IDs and relevant snippets
    """
    # Get organization_id, user_id, and internal_service_secret from LangGraph execution context
    from ..core.api_tools import get_context_from_config

    organization_id, user_id, internal_service_secret = get_context_from_config()
    if not organization_id or not user_id or not internal_service_secret:
        return "Error: organization_id, user_id, and internal_service_secret are required but not found in execution context"

    try:
        # Setup vector store
        vector_store = setup_vector_store(collection_name="documents")

        # Create base retriever
        base_retriever = vector_store.as_retriever(
            search_kwargs={"k": k * 2}
        )  # Get more to filter

        # Wrap with context-aware retriever that filters by organization_id
        context_retriever = ContextAwareRetriever(
            base_retriever=base_retriever,
            organization_id=organization_id,
            user_id=user_id,
        )

        # Retrieve documents
        docs = await context_retriever.aget_relevant_documents(query)

        # Limit to k results
        docs = docs[:k]

        # Format results
        results = []
        for doc in docs:
            metadata = doc.metadata if hasattr(doc, "metadata") else {}
            meeting_id = metadata.get("meeting_id") or metadata.get("id")
            results.append(
                {
                    "meeting_id": meeting_id,
                    "content": doc.page_content[:500]
                    if hasattr(doc, "page_content")
                    else str(doc)[:500],
                    "metadata": {
                        k: v
                        for k, v in metadata.items()
                        if k not in ["organization_id", "organisation_id", "user_id"]
                    },
                }
            )

        import json

        return json.dumps(results, indent=2)

    except Exception as e:
        return f"Error performing RAG search: {str(e)}"


def create_rag_search_tool(
    collection_name: str = "documents",
    k: int = 5,
) -> Optional[BaseTool]:
    """
    Create RAG search tool with metadata filtering.
    Similar to the n8n RAG search2 node.

    The tool is context-aware and automatically filters by organization_id from config.

    Args:
        collection_name: Name of the vector store collection (default: "documents")
        k: Number of documents to retrieve (default: 5)

    Returns:
        RAG search tool, or None if vector store unavailable
    """
    try:
        # Verify vector store is available
        vector_store = setup_vector_store(collection_name)
        if not vector_store:
            return None

        # Return the context-aware tool
        # The tool will get organization_id/user_id from runtime config
        return rag_search
    except Exception as e:
        print(f"Warning: RAG search tool not available: {e}")
        return None
