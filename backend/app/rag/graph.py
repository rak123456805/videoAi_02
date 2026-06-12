"""
LangGraph StateGraph — the RAG pipeline.

Graph topology:
    START
      │
    router_node  ──── needs_retrieval=False ──► direct_answer_node ──► END
      │
   needs_retrieval=True
      │
    retrieve_node
      │
    generate_node
      │
      END
"""
from __future__ import annotations
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.rag.state import GraphState
from app.rag.nodes import router_node, retrieve_node, generate_node, direct_answer_node


def _route_after_router(state: GraphState) -> str:
    return "retrieve" if state.get("needs_retrieval", True) else "direct_answer"


def build_rag_graph() -> StateGraph:
    """Build and compile the LangGraph RAG pipeline with in-memory checkpointer."""
    builder = StateGraph(GraphState)

    # Nodes
    builder.add_node("router", router_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("generate", generate_node)
    builder.add_node("direct_answer", direct_answer_node)

    # Edges
    builder.add_edge(START, "router")
    builder.add_conditional_edges(
        "router",
        _route_after_router,
        {"retrieve": "retrieve", "direct_answer": "direct_answer"},
    )
    builder.add_edge("retrieve", "generate")
    builder.add_edge("generate", END)
    builder.add_edge("direct_answer", END)

    # MemorySaver keeps thread state across turns
    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)


# Singleton compiled graph
_graph = None


def get_rag_graph():
    global _graph
    if _graph is None:
        _graph = build_rag_graph()
    return _graph
