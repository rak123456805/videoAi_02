from __future__ import annotations
from datetime import date, datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel, HttpUrl, field_validator


# ─── Ingest ────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    urls: list[str]
    session_id: str | None = None  # if None, a new session is created

class IngestResponse(BaseModel):
    session_id: str
    videos: list[VideoMetadataOut]


# ─── Video Metadata ─────────────────────────────────────────────────────────

class VideoMetadataOut(BaseModel):
    video_id: str           # "A", "B", etc.
    url: str
    platform: str
    title: str | None
    creator: str | None
    follower_count: int
    views: int
    likes: int
    comments: int
    engagement_rate: float
    hashtags: list[str]
    upload_date: date | None
    duration_seconds: int
    thumbnail_url: str | None
    transcript_ready: bool


# ─── Chat ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str
    video_ids: list[str] | None = None  # filter retrieval to specific videos


class Citation(BaseModel):
    video_id: str
    chunk_index: int
    text: str
    timestamp_start: float | None = None
    timestamp_end: float | None = None
    platform: str | None = None


class ChatMessage(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: list[Citation] = []
    created_at: datetime


# ─── Session ───────────────────────────────────────────────────────────────

class SessionOut(BaseModel):
    id: str
    title: str
    video_urls: list[str]
    created_at: datetime
    updated_at: datetime
    message_count: int | None = None
    videos: list[VideoMetadataOut] | None = None


class SessionListResponse(BaseModel):
    sessions: list[SessionOut]
    total: int
    page: int
    page_size: int
    has_more: bool


# ─── Streaming SSE events ──────────────────────────────────────────────────

class StreamEvent(BaseModel):
    type: str  # "token" | "citation" | "done" | "error"
    data: Any
