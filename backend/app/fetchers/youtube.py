"""
YouTube fetcher:
  - transcript via youtube-transcript-api
  - metadata via YouTube Data API v3
  - fallback to yt-dlp if API key unavailable
"""
from __future__ import annotations
import re
import asyncio
import httpx
import yt_dlp
import structlog
from datetime import date
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

from app.fetchers.base import BaseFetcher, VideoData
from app.core.config import get_settings

log = structlog.get_logger(__name__)

YT_API_BASE = "https://www.googleapis.com/youtube/v3"
_VIDEO_ID_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)


def _extract_video_id(url: str) -> str | None:
    m = _VIDEO_ID_RE.search(url)
    return m.group(1) if m else None


class YouTubeFetcher(BaseFetcher):
    def can_handle(self, url: str) -> bool:
        return bool(_extract_video_id(url))

    async def fetch(self, url: str) -> VideoData:
        video_id = _extract_video_id(url)
        if not video_id:
            raise ValueError(f"Cannot extract YouTube video ID from: {url}")

        log.info("Fetching YouTube video", video_id=video_id)

        # Run blocking calls in thread pool
        transcript_task = asyncio.to_thread(self._get_transcript, video_id)
        metadata_task = asyncio.to_thread(self._get_metadata_api, video_id)

        transcript_segments, meta = await asyncio.gather(transcript_task, metadata_task)

        return VideoData(
            url=url,
            platform="youtube",
            title=meta.get("title", ""),
            creator=meta.get("creator", ""),
            follower_count=meta.get("follower_count", 0),
            views=meta.get("views", 0),
            likes=meta.get("likes", 0),
            comments=meta.get("comments", 0),
            hashtags=meta.get("hashtags", []),
            upload_date=meta.get("upload_date"),
            duration_seconds=meta.get("duration_seconds", 0),
            thumbnail_url=meta.get("thumbnail_url", ""),
            transcript_segments=transcript_segments,
        )

    def _get_transcript(self, video_id: str) -> list[tuple[float, float, str]]:
        try:
            entries = YouTubeTranscriptApi().fetch(video_id, languages=["en", "en-US", "en-GB"]).to_raw_data()
            return [(e["start"], e["start"] + e["duration"], e["text"]) for e in entries]
        except (NoTranscriptFound, TranscriptsDisabled):
            log.warning("No transcript via API, falling back to yt-dlp ASR", video_id=video_id)
            return self._get_transcript_ytdlp(video_id)

    def _get_transcript_ytdlp(self, video_id: str) -> list[tuple[float, float, str]]:
        opts = {
            "quiet": True,
            "skip_download": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en"],
            "subtitlesformat": "json3",
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            # Extract subtitle segments if available
            subs = (info or {}).get("subtitles") or (info or {}).get("automatic_captions") or {}
            en_subs = subs.get("en", [])
            if en_subs:
                return [(0.0, 0.0, "Transcript not available via ASR")]
            return []

    def _get_metadata_api(self, video_id: str) -> dict:
        settings = get_settings()
        if not settings.youtube_api_key:
            log.warning("No YouTube API key, using yt-dlp for metadata")
            return self._get_metadata_ytdlp(video_id)

        with httpx.Client(timeout=15) as client:
            # Video stats + snippet
            r = client.get(f"{YT_API_BASE}/videos", params={
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
                "key": settings.youtube_api_key,
            })
            r.raise_for_status()
            items = r.json().get("items", [])
            if not items:
                return {}
            item = items[0]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            content = item.get("contentDetails", {})

            channel_id = snippet.get("channelId", "")
            follower_count = self._get_channel_subscribers(client, channel_id, settings.youtube_api_key)

            # Parse ISO 8601 duration
            duration_seconds = _parse_iso_duration(content.get("duration", "PT0S"))

            # Extract hashtags from description
            description = snippet.get("description", "")
            hashtags = re.findall(r"#\w+", description)

            upload_date = None
            if pub := snippet.get("publishedAt"):
                try:
                    upload_date = date.fromisoformat(pub[:10])
                except ValueError:
                    pass

            return {
                "title": snippet.get("title", ""),
                "creator": snippet.get("channelTitle", ""),
                "follower_count": follower_count,
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments": int(stats.get("commentCount", 0)),
                "hashtags": hashtags,
                "upload_date": upload_date,
                "duration_seconds": duration_seconds,
                "thumbnail_url": snippet.get("thumbnails", {}).get("maxres", {}).get("url")
                    or snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
            }

    def _get_channel_subscribers(self, client: httpx.Client, channel_id: str, api_key: str) -> int:
        if not channel_id:
            return 0
        try:
            r = client.get(f"{YT_API_BASE}/channels", params={
                "part": "statistics",
                "id": channel_id,
                "key": api_key,
            })
            r.raise_for_status()
            items = r.json().get("items", [])
            if items:
                return int(items[0].get("statistics", {}).get("subscriberCount", 0))
        except Exception as e:
            log.warning("Could not fetch subscriber count", error=str(e))
        return 0

    def _get_metadata_ytdlp(self, video_id: str) -> dict:
        opts = {"quiet": True, "skip_download": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False) or {}
            tags = info.get("tags") or []
            hashtags = [f"#{t}" for t in tags[:10]]
            upload = None
            if ud := info.get("upload_date"):
                try:
                    upload = date(int(ud[:4]), int(ud[4:6]), int(ud[6:8]))
                except Exception:
                    pass
            return {
                "title": info.get("title", ""),
                "creator": info.get("uploader", ""),
                "follower_count": info.get("channel_follower_count") or 0,
                "views": info.get("view_count") or 0,
                "likes": info.get("like_count") or 0,
                "comments": info.get("comment_count") or 0,
                "hashtags": hashtags,
                "upload_date": upload,
                "duration_seconds": int(info.get("duration") or 0),
                "thumbnail_url": info.get("thumbnail", ""),
            }


def _parse_iso_duration(duration: str) -> int:
    """Convert ISO 8601 duration (PT1H2M3S) to total seconds."""
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
    if not m:
        return 0
    h = int(m.group(1) or 0)
    mins = int(m.group(2) or 0)
    secs = int(m.group(3) or 0)
    return h * 3600 + mins * 60 + secs
