"use client";
import { motion } from "framer-motion";
import { VideoMetadata } from "@/lib/api";
import { Eye, Heart, MessageCircle, Users, Clock, Calendar } from "lucide-react";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className={`platform-badge platform-${platform}`}>
      {platform === "youtube" && "▶ YouTube"}
      {platform === "instagram" && "📸 Instagram"}
      {platform === "twitter" && "𝕏 Twitter"}
      {platform === "tiktok" && "♪ TikTok"}
      {!["youtube","instagram","twitter","tiktok"].includes(platform) && platform}
    </span>
  );
}

interface VideoCardProps {
  video: VideoMetadata;
  index: number;
  maxEngagement: number;
}

export function VideoCard({ video, index, maxEngagement }: VideoCardProps) {
  const engagementPct = maxEngagement > 0 
    ? Math.min((video.engagement_rate / maxEngagement) * 100, 100)
    : 0;

  return (
    <motion.div
      className="video-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="video-card-badge">{video.video_id}</div>

      {video.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnail_url}
          alt={video.title || "Video thumbnail"}
          className="video-card-thumbnail"
          loading="lazy"
        />
      ) : (
        <div className="video-card-thumbnail-placeholder">
          <span style={{ fontSize: 32 }}>🎬</span>
        </div>
      )}

      <div className="video-card-body">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <PlatformBadge platform={video.platform} />
          {video.transcript_ready && (
            <span className="badge badge-green" style={{ fontSize: 10 }}>
              ✓ Indexed
            </span>
          )}
        </div>

        {video.title && (
          <p className="video-card-title" title={video.title}>
            {video.title}
          </p>
        )}

        {video.creator && (
          <div className="video-card-creator">
            <Users size={11} />
            <span>@{video.creator}</span>
            {video.follower_count > 0 && (
              <span style={{ color: "var(--text-muted)" }}>
                · {formatNum(video.follower_count)} followers
              </span>
            )}
          </div>
        )}

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-value" style={{ color: "var(--blue)" }}>
              {formatNum(video.views)}
            </div>
            <div className="stat-label">
              <Eye size={9} style={{ display: "inline" }} /> Views
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: "#f43f5e" }}>
              {formatNum(video.likes)}
            </div>
            <div className="stat-label">
              <Heart size={9} style={{ display: "inline" }} /> Likes
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: "var(--yellow)" }}>
              {formatNum(video.comments)}
            </div>
            <div className="stat-label">
              <MessageCircle size={9} style={{ display: "inline" }} /> Comments
            </div>
          </div>
        </div>

        {/* Engagement Rate Bar */}
        <div className="engagement-bar-wrapper">
          <div className="engagement-bar-label">
            <span>Engagement Rate</span>
            <span style={{ color: "var(--accent-light)", fontWeight: 700 }}>
              {video.engagement_rate.toFixed(2)}%
            </span>
          </div>
          <div className="engagement-bar-track">
            <motion.div
              className="engagement-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${engagementPct}%` }}
              transition={{ delay: index * 0.1 + 0.3, duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
          {video.duration_seconds > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} />
              {formatDuration(video.duration_seconds)}
            </span>
          )}
          {video.upload_date && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Calendar size={10} />
              {new Date(video.upload_date).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Hashtags */}
        {video.hashtags.length > 0 && (
          <div className="hashtags-list">
            {video.hashtags.slice(0, 5).map((tag, i) => (
              <span key={i} className="hashtag-chip">{tag}</span>
            ))}
            {video.hashtags.length > 5 && (
              <span className="hashtag-chip" style={{ opacity: 0.6 }}>
                +{video.hashtags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function VideoGrid({ videos }: { videos: VideoMetadata[] }) {
  const maxEngagement = Math.max(...videos.map((v) => v.engagement_rate), 0.001);
  return (
    <div className="video-grid">
      {videos.map((v, i) => (
        <VideoCard key={v.video_id} video={v} index={i} maxEngagement={maxEngagement} />
      ))}
    </div>
  );
}

// Skeleton loader for video cards
export function VideoCardSkeleton() {
  return (
    <div className="video-card">
      <div className="skeleton" style={{ width: "100%", height: 160 }} />
      <div className="video-card-body" style={{ gap: 10 }}>
        <div className="skeleton" style={{ width: 80, height: 20 }} />
        <div className="skeleton" style={{ width: "100%", height: 14 }} />
        <div className="skeleton" style={{ width: "60%", height: 14 }} />
        <div className="stats-row">
          {[0,1,2].map(i => (
            <div key={i} className="skeleton" style={{ height: 48 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
