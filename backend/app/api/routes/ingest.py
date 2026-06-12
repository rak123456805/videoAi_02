"""
POST /api/ingest — fetch + chunk + embed video URLs, store metadata.
"""
from __future__ import annotations
import asyncio
import structlog
from fastapi import APIRouter, HTTPException, Header
from typing import Annotated

from app.db.models import IngestRequest, IngestResponse, VideoMetadataOut
from app.db.supabase import get_supabase, create_session, upsert_video_metadata, get_video_metadata
from app.fetchers.router import fetch_video
from app.vector.embed import embed_and_store
from app.core.llm_client import get_chat_model, get_langfuse_callbacks
from app.rag.prompts import TITLE_GENERATION_PROMPT
from langchain_core.messages import HumanMessage

log = structlog.get_logger(__name__)
router = APIRouter()

VIDEO_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def _get_user_id_from_token(token: str | None) -> str | None:
    """Validate Supabase JWT and return user_id."""
    if not token:
        return None
    try:
        sb = get_supabase()
        jwt_token = token.replace("Bearer ", "")
        user = sb.auth.get_user(jwt_token)
        return str(user.user.id) if user and user.user else None
    except Exception as e:
        log.exception("JWT verification failed", error=str(e))
        return None


@router.post("/ingest", response_model=IngestResponse)
async def ingest_videos(
    body: IngestRequest,
    authorization: Annotated[str | None, Header()] = None,
):
    if not body.urls or len(body.urls) < 1:
        raise HTTPException(400, "Provide at least 1 URL")
    if len(body.urls) > 6:
        raise HTTPException(400, "Maximum 6 URLs per session")

    user_id = _get_user_id_from_token(authorization)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    log.info("Ingest request", url_count=len(body.urls), user_id=user_id)

    # Fetch all videos concurrently
    fetch_tasks = [fetch_video(url) for url in body.urls]
    results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

    videos_data = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            log.error("Fetch failed", url=body.urls[i], error=str(result))
            raise HTTPException(422, f"Failed to fetch {body.urls[i]}: {str(result)}")
        videos_data.append(result)

    # Create or reuse session
    if body.session_id:
        session_id = body.session_id
    else:
        session = create_session(user_id, body.urls)
        session_id = session["id"]

    # Embed + store all videos concurrently
    embed_tasks = [
        embed_and_store(session_id, VIDEO_LABELS[i], vd)
        for i, vd in enumerate(videos_data)
    ]
    chunk_counts = await asyncio.gather(*embed_tasks)

    # Save metadata to Supabase
    video_metas: list[VideoMetadataOut] = []
    for i, (vd, chunk_count) in enumerate(zip(videos_data, chunk_counts)):
        vid_label = VIDEO_LABELS[i]
        meta_dict = {
            "video_id": vid_label,
            "url": vd.url,
            "platform": vd.platform,
            "title": vd.title,
            "creator": vd.creator,
            "follower_count": vd.follower_count,
            "views": vd.views,
            "likes": vd.likes,
            "comments": vd.comments,
            "engagement_rate": vd.engagement_rate,
            "hashtags": vd.hashtags,
            "upload_date": vd.upload_date.isoformat() if vd.upload_date else None,
            "duration_seconds": vd.duration_seconds,
            "thumbnail_url": vd.thumbnail_url,
            "transcript_ready": chunk_count > 0,
        }
        upsert_video_metadata(session_id, meta_dict)
        video_metas.append(VideoMetadataOut(
            video_id=vid_label,
            url=vd.url,
            platform=vd.platform,
            title=vd.title,
            creator=vd.creator,
            follower_count=vd.follower_count,
            views=vd.views,
            likes=vd.likes,
            comments=vd.comments,
            engagement_rate=vd.engagement_rate,
            hashtags=vd.hashtags,
            upload_date=vd.upload_date,
            duration_seconds=vd.duration_seconds,
            thumbnail_url=vd.thumbnail_url,
            transcript_ready=chunk_count > 0,
        ))

    # Auto-generate session title
    try:
        llm = get_chat_model(streaming=False)
        title_prompt = TITLE_GENERATION_PROMPT.format(urls="\n".join(body.urls))
        title_resp = await llm.ainvoke(
            [HumanMessage(content=title_prompt)],
            config={"callbacks": get_langfuse_callbacks()}
        )
        title = title_resp.content.strip()[:60]
        get_supabase().table("sessions").update({"title": title}).eq("id", session_id).execute()
    except Exception as e:
        log.warning("Title generation failed", error=str(e))

    log.info("Ingest complete", session_id=session_id, videos=len(video_metas))
    return IngestResponse(session_id=session_id, videos=video_metas)
