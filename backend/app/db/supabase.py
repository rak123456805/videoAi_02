"""
Supabase async client wrapper.
All DB operations go through here; we use the service role key for backend ops.
Auth token validation uses Supabase JWT verification.
"""
from __future__ import annotations
from functools import lru_cache

from supabase import create_client, Client
from app.core.config import get_settings


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


# ─── Sessions ────────────────────────────────────────────────────────────────

def create_session(user_id: str, video_urls: list[str], title: str = "New Analysis") -> dict:
    sb = get_supabase()
    result = (
        sb.table("sessions")
        .insert({"user_id": user_id, "video_urls": video_urls, "title": title})
        .execute()
    )
    return result.data[0]


def get_session(session_id: str) -> dict | None:
    sb = get_supabase()
    result = sb.table("sessions").select("*").eq("id", session_id).single().execute()
    return result.data


def list_sessions(user_id: str, page: int = 1, page_size: int = 10) -> tuple[list[dict], int]:
    sb = get_supabase()
    offset = (page - 1) * page_size
    result = (
        sb.table("sessions")
        .select("*", count="exact")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return result.data, result.count or 0


def update_session_title(session_id: str, title: str) -> dict:
    sb = get_supabase()
    result = (
        sb.table("sessions")
        .update({"title": title})
        .eq("id", session_id)
        .execute()
    )
    return result.data[0]


def delete_session(session_id: str) -> None:
    sb = get_supabase()
    sb.table("messages").delete().eq("session_id", session_id).execute()
    sb.table("video_metadata").delete().eq("session_id", session_id).execute()
    sb.table("sessions").delete().eq("id", session_id).execute()


def delete_all_sessions(user_id: str) -> None:
    sb = get_supabase()
    user_sessions = sb.table("sessions").select("id").eq("user_id", user_id).execute()
    session_ids = [s["id"] for s in user_sessions.data]
    if session_ids:
        sb.table("messages").delete().in_("session_id", session_ids).execute()
        sb.table("video_metadata").delete().in_("session_id", session_ids).execute()
    sb.table("sessions").delete().eq("user_id", user_id).execute()


# ─── Messages ─────────────────────────────────────────────────────────────────

def save_message(session_id: str, role: str, content: str, citations: list[dict] | None = None) -> dict:
    sb = get_supabase()
    result = (
        sb.table("messages")
        .insert({
            "session_id": session_id,
            "role": role,
            "content": content,
            "citations": citations or [],
        })
        .execute()
    )
    return result.data[0]


def get_messages(session_id: str) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return result.data


# ─── Video Metadata ──────────────────────────────────────────────────────────

def upsert_video_metadata(session_id: str, meta: dict) -> dict:
    sb = get_supabase()
    result = (
        sb.table("video_metadata")
        .upsert({"session_id": session_id, **meta}, on_conflict="session_id,video_id")
        .execute()
    )
    return result.data[0]


def get_video_metadata(session_id: str) -> list[dict]:
    sb = get_supabase()
    result = (
        sb.table("video_metadata")
        .select("*")
        .eq("session_id", session_id)
        .order("video_id")
        .execute()
    )
    return result.data
