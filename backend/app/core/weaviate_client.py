"""
Weaviate v4 client singleton + schema bootstrap.
"""
from __future__ import annotations
import structlog
import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.config import Configure, DataType, Property, VectorDistances

from app.core.config import get_settings

log = structlog.get_logger(__name__)

_client: weaviate.WeaviateClient | None = None

VIDEO_CHUNK_CLASS = "VideoChunk"


def get_weaviate_client() -> weaviate.WeaviateClient:
    global _client
    if _client is None or not _client.is_connected():
        settings = get_settings()
        _client = weaviate.connect_to_weaviate_cloud(
            cluster_url=settings.weaviate_url,
            auth_credentials=Auth.api_key(settings.weaviate_api_key),
            skip_init_checks=False,
        )
        log.info("Connected to Weaviate Cloud")
        _ensure_schema(_client)
    return _client


def _ensure_schema(client: weaviate.WeaviateClient) -> None:
    """Create VideoChunk collection if it doesn't exist."""
    if client.collections.exists(VIDEO_CHUNK_CLASS):
        log.info("Weaviate schema already exists", collection=VIDEO_CHUNK_CLASS)
        return

    client.collections.create(
        name=VIDEO_CHUNK_CLASS,
        description="Transcript chunks from public social media videos",
        vector_index_config=Configure.VectorIndex.hnsw(
            distance_metric=VectorDistances.COSINE,
        ),
        properties=[
            Property(name="video_id", data_type=DataType.TEXT, description="Label: A, B, C…"),
            Property(name="session_id", data_type=DataType.TEXT),
            Property(name="platform", data_type=DataType.TEXT),
            Property(name="url", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="chunk_text", data_type=DataType.TEXT),
            Property(name="chunk_index", data_type=DataType.INT),
            Property(name="timestamp_start", data_type=DataType.NUMBER),
            Property(name="timestamp_end", data_type=DataType.NUMBER),
            Property(name="views", data_type=DataType.INT),
            Property(name="likes", data_type=DataType.INT),
            Property(name="comments", data_type=DataType.INT),
            Property(name="engagement_rate", data_type=DataType.NUMBER),
            Property(name="creator", data_type=DataType.TEXT),
            Property(name="follower_count", data_type=DataType.INT),
            Property(name="hashtags", data_type=DataType.TEXT_ARRAY),
            Property(name="duration", data_type=DataType.INT),
            Property(name="title", data_type=DataType.TEXT),
            Property(name="thumbnail_url", data_type=DataType.TEXT, skip_vectorization=True),
        ],
    )
    log.info("Weaviate schema created", collection=VIDEO_CHUNK_CLASS)


def close_weaviate_client() -> None:
    global _client
    if _client and _client.is_connected():
        _client.close()
        _client = None
        log.info("Weaviate client closed")
