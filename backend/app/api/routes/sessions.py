"""
GET /api/sessions — paginated session list (for history carousel).
GET /api/sessions/{session_id} — single session with video metadata.
"""
from __future__ import annotations
import structlog
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Annotated

from app.db.models import SessionOut, SessionListResponse, VideoMetadataOut
from app.db.supabase import list_sessions, get_session, get_video_metadata
from app.api.routes.ingest import _get_user_id_from_token

log = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/sessions", response_model=SessionListResponse)
async def list_user_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    authorization: Annotated[str | None, Header()] = None,
):
    user_id = _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    sessions_data, total = list_sessions(user_id, page=page, page_size=page_size)
    has_more = (page * page_size) < total

    sessions_out = [
        SessionOut(
            id=s["id"],
            title=s["title"],
            video_urls=s["video_urls"],
            created_at=s["created_at"],
            updated_at=s["updated_at"],
        )
        for s in sessions_data
    ]

    return SessionListResponse(
        sessions=sessions_out,
        total=total,
        page=page,
        page_size=page_size,
        has_more=has_more,
    )


@router.get("/sessions/{session_id}", response_model=SessionOut)
async def get_session_detail(
    session_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    user_id = _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session["user_id"] != user_id:
        raise HTTPException(403, "Access denied")

    video_rows = get_video_metadata(session_id)
    videos = [
        VideoMetadataOut(
            video_id=v["video_id"],
            url=v["url"],
            platform=v["platform"],
            title=v.get("title"),
            creator=v.get("creator"),
            follower_count=v.get("follower_count", 0),
            views=v.get("views", 0),
            likes=v.get("likes", 0),
            comments=v.get("comments", 0),
            engagement_rate=float(v.get("engagement_rate", 0)),
            hashtags=v.get("hashtags", []),
            upload_date=v.get("upload_date"),
            duration_seconds=v.get("duration_seconds", 0),
            thumbnail_url=v.get("thumbnail_url"),
            transcript_ready=v.get("transcript_ready", False),
        )
        for v in video_rows
    ]

    return SessionOut(
        id=session["id"],
        title=session["title"],
        video_urls=session["video_urls"],
        created_at=session["created_at"],
        updated_at=session["updated_at"],
        videos=videos,
    )


@router.delete("/sessions/{session_id}")
async def delete_user_session(
    session_id: str,
    authorization: Annotated[str | None, Header()] = None,
):
    user_id = _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session["user_id"] != user_id:
        raise HTTPException(403, "Access denied")

    from app.db.supabase import delete_session
    delete_session(session_id)
    return {"status": "success", "message": "Session deleted"}


@router.delete("/sessions")
async def delete_all_user_sessions(
    authorization: Annotated[str | None, Header()] = None,
):
    user_id = _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    from app.db.supabase import delete_all_sessions
    delete_all_sessions(user_id)
    return {"status": "success", "message": "All sessions deleted"}
