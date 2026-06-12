"""
Instagram public reel fetcher using yt-dlp (works for public profiles).
Metadata: likes, views, timestamp, hashtags, caption.
No official API needed for public content.
"""
from __future__ import annotations
import re
import asyncio
import structlog
from datetime import date, datetime

import yt_dlp

from app.fetchers.base import BaseFetcher, VideoData

log = structlog.get_logger(__name__)

_IG_RE = re.compile(r"instagram\.com/(reels?|p)/([A-Za-z0-9_-]+)")


class InstagramFetcher(BaseFetcher):
    def can_handle(self, url: str) -> bool:
        return bool(_IG_RE.search(url))

    async def fetch(self, url: str) -> VideoData:
        log.info("Fetching Instagram reel", url=url)
        info = await asyncio.to_thread(self._extract, url)
        return info

    def _extract(self, url: str) -> VideoData:
        opts = {
            "quiet": True,
            "skip_download": True,
            "writesubtitles": False,
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
        elif ud := info.get("upload_date"):
            try:
                upload_date = date(int(ud[:4]), int(ud[4:6]), int(ud[6:8]))
            except Exception:
                pass

        # Build a pseudo-transcript from caption / description since
        # Instagram doesn't provide captions for most reels
        caption_text = description.replace("\n", " ").strip()
        transcript_segments: list[tuple[float, float, str]] = []
        if caption_text:
            transcript_segments = [(0.0, float(info.get("duration", 30)), caption_text)]

        return VideoData(
            url=url,
            platform="instagram",
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
