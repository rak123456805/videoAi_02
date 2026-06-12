"""
LangGraph RAG State definition.
"""
from __future__ import annotations
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage
import operator


class GraphState(TypedDict):
    # Chat history (LangGraph messages reducer appends)
    messages: Annotated[list[BaseMessage], operator.add]
    # Current user question
    question: str
    # Session + video context
    session_id: str
    video_ids: list[str] | None
    # Retrieved documents
    retrieved_chunks: list[dict]
    # Citations to attach to response
    citations: list[dict]
    # Final answer text (accumulated during streaming)
    answer: str
    # Whether retrieval was needed
    needs_retrieval: bool
