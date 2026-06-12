"""
Transcript chunking + embedding + Weaviate upsert pipeline.
"""
from __future__ import annotations
import asyncio
import uuid
import structlog
import tiktoken

from app.fetchers.base import VideoData
from app.core.llm_client import get_embeddings
from app.core.weaviate_client import get_weaviate_client, VIDEO_CHUNK_CLASS
from app.core.config import get_settings

log = structlog.get_logger(__name__)

_enc = tiktoken.get_encoding("cl100k_base")


def _token_len(text: str) -> int:
    return len(_enc.encode(text))


def chunk_transcript(
    segments: list[tuple[float, float, str]],
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> list[dict]:
    """
    Slide a window over transcript segments, grouping into chunks by token count.
    Each chunk is a dict with: text, timestamp_start, timestamp_end, chunk_index
    """
    chunks: list[dict] = []
    buffer_tokens: list[str] = []
    buffer_start = 0.0
    buffer_end = 0.0
    chunk_idx = 0

    for seg_start, seg_end, text in segments:
        words = text.split()
        for word in words:
            buffer_tokens.append(word)
            if seg_start < buffer_start or chunk_idx == 0:
                buffer_start = seg_start
            buffer_end = seg_end

            if _token_len(" ".join(buffer_tokens)) >= chunk_size:
                chunks.append({
                    "chunk_text": " ".join(buffer_tokens),
                    "timestamp_start": buffer_start,
                    "timestamp_end": buffer_end,
                    "chunk_index": chunk_idx,
                })
                chunk_idx += 1
                # Keep overlap tokens
                overlap_tokens = buffer_tokens[-chunk_overlap:] if chunk_overlap > 0 else []
                buffer_tokens = overlap_tokens
                buffer_start = buffer_end

    # Final remaining chunk
    if buffer_tokens:
        chunks.append({
            "chunk_text": " ".join(buffer_tokens),
            "timestamp_start": buffer_start,
            "timestamp_end": buffer_end,
            "chunk_index": chunk_idx,
        })

    return chunks


async def embed_and_store(
    session_id: str,
    video_id: str,
    video_data: VideoData,
) -> int:
    """
    Chunk transcript, embed, and upsert to Weaviate.
    Returns number of chunks stored.
    """
    settings = get_settings()

    if not video_data.transcript_segments:
        log.warning("No transcript segments to embed", video_id=video_id)
        return 0

    chunks = chunk_transcript(
        video_data.transcript_segments,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )

    if not chunks:
        return 0

    log.info("Embedding chunks", video_id=video_id, count=len(chunks))

    # Embed in batches of 20 to avoid rate limits
    embeddings_model = get_embeddings()
    texts = [c["chunk_text"] for c in chunks]

    # Batch embedding
    all_embeddings: list[list[float]] = []
    batch_size = 20
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vecs = await asyncio.to_thread(embeddings_model.embed_documents, batch)
        all_embeddings.extend(vecs)

    # Upsert to Weaviate
    client = get_weaviate_client()
    collection = client.collections.get(VIDEO_CHUNK_CLASS)

    hashtags_str = video_data.hashtags or []
    upload_date_str = video_data.upload_date.isoformat() if video_data.upload_date else None

    with collection.batch.dynamic() as batch:
        for chunk, vector in zip(chunks, all_embeddings):
            props = {
                "video_id": video_id,
                "session_id": session_id,
                "platform": video_data.platform,
                "url": video_data.url,
                "chunk_text": chunk["chunk_text"],
                "chunk_index": chunk["chunk_index"],
                "timestamp_start": chunk["timestamp_start"],
                "timestamp_end": chunk["timestamp_end"],
                "views": video_data.views,
                "likes": video_data.likes,
                "comments": video_data.comments,
                "engagement_rate": video_data.engagement_rate,
                "creator": video_data.creator,
                "follower_count": video_data.follower_count,
                "hashtags": hashtags_str,
                "duration": video_data.duration_seconds,
                "title": video_data.title,
                "thumbnail_url": video_data.thumbnail_url,
            }
            # Weaviate requires RFC3339 for date properties
            # upload_date is stored in video_metadata table, not in Weaviate
            batch.add_object(properties=props, vector=vector)

    log.info("Chunks stored in Weaviate", video_id=video_id, count=len(chunks))
    return len(chunks)
