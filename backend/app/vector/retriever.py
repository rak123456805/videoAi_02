"""
Weaviate hybrid retriever (vector + BM25).
"""
from __future__ import annotations
import asyncio
import structlog

from weaviate.classes.query import MetadataQuery, HybridFusion
from app.core.weaviate_client import get_weaviate_client, VIDEO_CHUNK_CLASS
from app.core.llm_client import get_embeddings

log = structlog.get_logger(__name__)


async def hybrid_search(
    query: str,
    session_id: str,
    video_ids: list[str] | None = None,
    top_k: int = 6,
    alpha: float = 0.7,  # 0 = BM25 only, 1 = vector only
) -> list[dict]:
    """
    Perform hybrid search (BM25 + vector) in Weaviate.
    Filters by session_id and optionally video_ids.
    Returns list of chunk dicts with score and metadata.
    """
    embeddings_model = get_embeddings()
    query_vector = await asyncio.to_thread(embeddings_model.embed_query, query)

    client = get_weaviate_client()
    collection = client.collections.get(VIDEO_CHUNK_CLASS)

    # Build filter
    from weaviate.classes.query import Filter
    filters = Filter.by_property("session_id").equal(session_id)
    if video_ids:
        video_filter = Filter.by_property("video_id").contains_any(video_ids)
        filters = filters & video_filter

    result = collection.query.hybrid(
        query=query,
        vector=query_vector,
        alpha=alpha,
        limit=top_k,
        filters=filters,
        fusion_type=HybridFusion.RELATIVE_SCORE,
        return_metadata=MetadataQuery(score=True),
        return_properties=[
            "video_id",
            "session_id",
            "platform",
            "url",
            "chunk_text",
            "chunk_index",
            "timestamp_start",
            "timestamp_end",
            "views",
            "likes",
            "comments",
            "engagement_rate",
            "creator",
            "follower_count",
            "hashtags",
            "duration",
            "title",
        ],
    )

    chunks = []
    for obj in result.objects:
        props = dict(obj.properties)
        props["_score"] = obj.metadata.score if obj.metadata else 0.0
        props["_uuid"] = str(obj.uuid)
        chunks.append(props)

    log.info("Hybrid search done", query=query[:60], results=len(chunks))
    return chunks
