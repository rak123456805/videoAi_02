"""
Router that picks the right fetcher for a URL.
"""
from __future__ import annotations
import structlog

from app.fetchers.base import BaseFetcher, VideoData
from app.fetchers.youtube import YouTubeFetcher
from app.fetchers.instagram import InstagramFetcher
from app.fetchers.twitter import TwitterFetcher
from app.fetchers.tiktok import TikTokFetcher

log = structlog.get_logger(__name__)

_FETCHERS: list[BaseFetcher] = [
    YouTubeFetcher(),
    InstagramFetcher(),
    TwitterFetcher(),
    TikTokFetcher(),
]


async def fetch_video(url: str) -> VideoData:
    """Dispatch to the appropriate platform fetcher."""
    for fetcher in _FETCHERS:
        if fetcher.can_handle(url):
            return await fetcher.fetch(url)
    raise ValueError(f"No fetcher available for URL: {url}")
