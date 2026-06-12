"""
POST /api/chat/stream — SSE streaming chat via LangGraph.
"""
from __future__ import annotations
import json
import asyncio
import structlog
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from typing import Annotated
from langchain_core.messages import HumanMessage

from app.db.models import ChatRequest
from app.db.supabase import save_message, get_messages, get_supabase
from app.rag.graph import get_rag_graph
from app.rag.state import GraphState
from app.api.routes.ingest import _get_user_id_from_token
from app.core.llm_client import get_langfuse_callbacks

log = structlog.get_logger(__name__)
router = APIRouter()


async def _stream_rag(
    session_id: str,
    question: str,
    video_ids: list[str] | None,
    thread_id: str,
):
    """
    Run the LangGraph graph and stream SSE events:
      - type: "token"    → incremental text chunks
      - type: "citation" → citation objects at end
      - type: "done"     → final signal with full answer
      - type: "error"    → error message
    """
    graph = get_rag_graph()

    # Build message history from DB
    history_rows = get_messages(session_id)
    history_messages = []
    for row in history_rows[-10:]:  # last 10 messages for context
        if row["role"] == "user":
            history_messages.append(HumanMessage(content=row["content"]))

    input_state: GraphState = {
        "messages": history_messages + [HumanMessage(content=question)],
        "question": question,
        "session_id": session_id,
        "video_ids": video_ids,
        "retrieved_chunks": [],
        "citations": [],
        "answer": "",
        "needs_retrieval": True,
    }

    callbacks = get_langfuse_callbacks()
    config = {
        "configurable": {"thread_id": thread_id},
        "callbacks": callbacks,
    }

    full_answer = ""
    citations = []

    try:
        async for event in graph.astream_events(input_state, config=config, version="v2"):
            kind = event["event"]
            name = event.get("name", "")

            # Stream LLM tokens from generate or direct_answer nodes
            if kind == "on_chat_model_stream" and name in ("ChatOpenAI", "ChatGoogleGenerativeAI", ""):
                # Skip tokens from the router node
                if event.get("metadata", {}).get("langgraph_node") == "router":
                    continue
                chunk = event["data"]["chunk"]
                token = chunk.content if hasattr(chunk, "content") else str(chunk)
                if token:
                    full_answer += token
                    yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

            # Capture citations after generate node
            elif kind == "on_chain_end" and event.get("name") == "generate":
                output = event["data"].get("output", {})
                citations = output.get("citations", [])

        # Send citations after stream completes
        if citations:
            yield f"data: {json.dumps({'type': 'citation', 'data': citations})}\n\n"

        # Persist to DB
        if full_answer:
            save_message(session_id, "assistant", full_answer, citations)

        yield f"data: {json.dumps({'type': 'done', 'data': full_answer})}\n\n"

    except Exception as e:
        log.error("Streaming error", error=str(e))
        yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    finally:
        for cb in callbacks:
            if hasattr(cb, "_langfuse_client"):
                try:
                    cb._langfuse_client.flush()
                except Exception:
                    pass


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    authorization: Annotated[str | None, Header()] = None,
):
    user_id = _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    # Persist user message
    save_message(body.session_id, "user", body.message)

    # Use session_id as thread_id for LangGraph memory
    thread_id = f"{user_id}:{body.session_id}"

    return StreamingResponse(
        _stream_rag(
            session_id=body.session_id,
            question=body.message,
            video_ids=body.video_ids,
            thread_id=thread_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
