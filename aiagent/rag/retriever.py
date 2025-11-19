"""
Knowted Retriever

Creates retriever tools for accessing Knowted's knowledge base.
"""

from langchain_core.retrievers import BaseRetriever
from langchain_core.tools import create_retriever_tool
from .vector_store import setup_vector_store


def create_knowted_retriever(
    collection_name: str = "knowted_knowledge_base",
    k: int = 5,
) -> create_retriever_tool:
    """
    Create a retriever tool for Knowted's knowledge base.
    
    Args:
        collection_name: Name of the vector store collection
        k: Number of documents to retrieve
    
    Returns:
        Retriever tool
    """
    vector_store = setup_vector_store(collection_name)
    retriever = vector_store.as_retriever(search_kwargs={"k": k})
    
    return create_retriever_tool(
        retriever=retriever,
        name="knowted_knowledge_base",
        description="""Search Knowted's knowledge base for:
        - Meeting transcripts and summaries
        - Reports and analytics
        - Team information and insights
        - Historical conversation data
        
        Use this tool when you need to find information about:
        - Past meetings and their content
        - Team performance and metrics
        - Report data and insights
        - Organization and team structure
        """,
    )

