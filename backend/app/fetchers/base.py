"""
Abstract base fetcher — every platform implements this interface.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date


@dataclass
class VideoData:
    url: str
    platform: str
    title: str = ""
    creator: str = ""
    follower_count: int = 0
    views: int = 0
    likes: int = 0
    comments: int = 0
    hashtags: list[str] = field(default_factory=list)
    upload_date: date | None = None
    duration_seconds: int = 0
    thumbnail_url: str = ""
    # Transcript as list of (start_sec, end_sec, text) tuples
    transcript_segments: list[tuple[float, float, str]] = field(default_factory=list)

    @property
    def engagement_rate(self) -> float:
        if self.views == 0:
            return 0.0
        return round((self.likes + self.comments) / self.views * 100, 4)

    @property
    def full_transcript(self) -> str:
        return " ".join(seg[2] for seg in self.transcript_segments)


class BaseFetcher(ABC):
    @abstractmethod
    def can_handle(self, url: str) -> bool:
        """Return True if this fetcher can handle the given URL."""

    @abstractmethod
    async def fetch(self, url: str) -> VideoData:
        """Fetch transcript + metadata for a public video URL."""
