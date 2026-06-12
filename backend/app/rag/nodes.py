"""
LangGraph node implementations.
"""
from __future__ import annotations
import json
import structlog
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.rag.state import GraphState
from app.rag.prompts import ROUTER_PROMPT, RAG_SYSTEM_PROMPT
from app.vector.retriever import hybrid_search
from app.core.llm_client import get_chat_model

log = structlog.get_logger(__name__)


async def router_node(state: GraphState) -> dict:
    """Decide if retrieval is needed for this question."""
    llm = get_chat_model(streaming=False)
    prompt = ROUTER_PROMPT.format(question=state["question"])
    response = await llm.ainvoke([HumanMessage(content=prompt)])

    try:
        result = json.loads(response.content.strip())
        needs_retrieval = result.get("needs_retrieval", True)
    except Exception:
        needs_retrieval = True  # default to retrieval

    log.info("Router decision", needs_retrieval=needs_retrieval, question=state["question"][:60])
    return {"needs_retrieval": needs_retrieval}


async def retrieve_node(state: GraphState) -> dict:
    """Retrieve relevant chunks from Weaviate."""
    chunks = await hybrid_search(
        query=state["question"],
        session_id=state["session_id"],
        video_ids=state.get("video_ids"),
        top_k=8,
    )
    log.info("Retrieved chunks", count=len(chunks))
    return {"retrieved_chunks": chunks}


def _format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable context block."""
    if not chunks:
        return "No relevant transcript context found."

    parts = []
    for chunk in chunks:
        vid = chunk.get("video_id", "?")
        idx = chunk.get("chunk_index", 0)
        ts_start = chunk.get("timestamp_start", 0)
        ts_end = chunk.get("timestamp_end", 0)
        text = chunk.get("chunk_text", "")
        score = chunk.get("_score", 0)
        parts.append(
            f"[Video {vid}, Chunk {idx}] (t={ts_start:.0f}s-{ts_end:.0f}s, relevance={score:.2f})\n{text}"
        )
    return "\n\n---\n\n".join(parts)


def _format_metadata_summary(chunks: list[dict]) -> str:
    """Deduplicate and format per-video metadata from chunks."""
    seen: dict[str, dict] = {}
    for c in chunks:
        vid = c.get("video_id", "?")
        if vid not in seen:
            seen[vid] = c

    lines = []
    for vid, c in sorted(seen.items()):
        eng = c.get("engagement_rate", 0)
        lines.append(
            f"Video {vid}: '{c.get('title', 'N/A')}' by @{c.get('creator', 'N/A')} | "
            f"Views: {c.get('views', 0):,} | Likes: {c.get('likes', 0):,} | "
            f"Comments: {c.get('comments', 0):,} | Engagement: {eng:.2f}% | "
            f"Followers: {c.get('follower_count', 0):,} | Platform: {c.get('platform', 'N/A')}"
        )
    return "\n".join(lines) if lines else "No metadata available."


def _build_citations(chunks: list[dict]) -> list[dict]:
    return [
        {
            "video_id": c.get("video_id", "?"),
            "chunk_index": c.get("chunk_index", 0),
            "text": c.get("chunk_text", "")[:200],
            "timestamp_start": c.get("timestamp_start"),
            "timestamp_end": c.get("timestamp_end"),
            "platform": c.get("platform"),
        }
        for c in chunks
    ]


async def generate_node(state: GraphState) -> dict:
    """Generate the answer using the LLM + retrieved context."""
    chunks = state.get("retrieved_chunks", [])
    context = _format_context(chunks)
    metadata_summary = _format_metadata_summary(chunks)
    citations = _build_citations(chunks)

    # Format chat history (exclude the current question)
    history_msgs = state.get("messages", [])[:-1]  # all but the latest HumanMessage
    chat_history = "\n".join(
        f"{'User' if isinstance(m, HumanMessage) else 'Assistant'}: {m.content}"
        for m in history_msgs[-6:]  # last 3 exchanges = 6 messages
    )

    video_labels = sorted(set(c.get("video_id", "?") for c in chunks)) if chunks else []

    system_content = RAG_SYSTEM_PROMPT.format(
        num_videos=len(video_labels),
        video_labels=", ".join(video_labels) if video_labels else "unknown",
        context=context,
        metadata_summary=metadata_summary,
        chat_history=chat_history or "No previous conversation.",
        question=state["question"],
    )

    llm = get_chat_model(streaming=True)
    messages = [SystemMessage(content=system_content), HumanMessage(content=state["question"])]

    # Non-streaming invoke for the node (streaming happens at route level)
    response = await llm.ainvoke(messages)
    answer = response.content

    return {
        "answer": answer,
        "citations": citations,
        "messages": [AIMessage(content=answer)],
    }


async def direct_answer_node(state: GraphState) -> dict:
    """Answer without retrieval for simple questions."""
    llm = get_chat_model(streaming=True)
    messages = state.get("messages", [])
    response = await llm.ainvoke(messages)
    return {
        "answer": response.content,
        "citations": [],
        "messages": [AIMessage(content=response.content)],
    }
