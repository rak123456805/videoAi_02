"""
TikTok public video fetcher using yt-dlp.
"""
from __future__ import annotations
import re
import asyncio
import structlog
from datetime import date, datetime

import yt_dlp

from app.fetchers.base import BaseFetcher, VideoData

log = structlog.get_logger(__name__)

_TIKTOK_RE = re.compile(r"tiktok\.com/")


class TikTokFetcher(BaseFetcher):
    def can_handle(self, url: str) -> bool:
        return bool(_TIKTOK_RE.search(url))

    async def fetch(self, url: str) -> VideoData:
        log.info("Fetching TikTok video", url=url)
        return await asyncio.to_thread(self._extract, url)

    def _extract(self, url: str) -> VideoData:
        opts = {
            "quiet": True,
            "skip_download": True,
            "writesubtitles": True,
            "subtitleslangs": ["en"],
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False) or {}

        description = info.get("description", "") or ""
        hashtags = re.findall(r"#\w+", description)

        upload_date = None
        if ts := info.get("timestamp"):
            try:
                upload_date = datetime.fromtimestamp(ts).date()
            except Exception:
                pass

        caption_text = description.replace("\n", " ").strip()
        transcript_segments: list[tuple[float, float, str]] = []
        if caption_text:
            transcript_segments = [(0.0, float(info.get("duration", 60)), caption_text)]

        return VideoData(
            url=url,
            platform="tiktok",
            title=info.get("title", "") or description[:80],
            creator=info.get("uploader", "") or info.get("channel", ""),
            follower_count=info.get("channel_follower_count") or 0,
            views=info.get("view_count") or 0,
            likes=info.get("like_count") or 0,
            comments=info.get("comment_count") or 0,
            hashtags=hashtags,
            upload_date=upload_date,
            duration_seconds=int(info.get("duration") or 0),
            thumbnail_url=info.get("thumbnail", ""),
            transcript_segments=transcript_segments,
        )
