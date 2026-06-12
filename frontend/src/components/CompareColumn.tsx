"use client";
import { VideoMetadata } from "@/lib/api";
import { Eye, Heart, MessageCircle, Clock, ExternalLink, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";

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

interface CompareColumnProps {
  video: VideoMetadata;
  index: number;
}

export function CompareColumn({ video, index }: CompareColumnProps) {
  // engagement percentage
  const engagement = video.engagement_rate || 0;
  
  // Calculate radial progress stroke properties:
  // Radius = 36, Circumference = 2 * PI * 36 = 226.19
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  // Cap engagement visually at 15% for the circle scale, or use a relative percentage
  // If we assume a typical engagement rate runs up to 10%, let's scale it or just use the exact value capped at 100.
  // Actually, let's scale it so that 10% engagement rate shows as 100% full, or just use min(engagement * 10, 100)
  // Let's make it look dynamic:
  const fillPercentage = Math.min((engagement / 15) * 100, 100); 
  const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;

  const getPlatformName = (p: string) => {
    if (p === "youtube") return "YouTube";
    if (p === "instagram") return "Instagram";
    if (p === "twitter") return "Twitter/X";
    if (p === "tiktok") return "TikTok";
    return p;
  };

  return (
    <motion.div 
      className="compare-column-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
    >
      <div className="compare-column-header">
        <div className="compare-video-badge">
          <div className="compare-video-label-box">
            Video {video.video_id || (index === 0 ? "A" : "B")}
          </div>
          <span className={`platform-badge platform-${video.platform}`}>
            {video.platform === "youtube" && "▶ YouTube"}
            {video.platform === "instagram" && "📸 Instagram"}
            {video.platform === "twitter" && "𝕏 Twitter"}
            {video.platform === "tiktok" && "♪ TikTok"}
            {!["youtube", "instagram", "twitter", "tiktok"].includes(video.platform) && video.platform}
          </span>
        </div>
        
        <a 
          href={video.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center" }}
          title="Open video URL"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      <h3 className="compare-video-title">
        {video.title || "Untitled Video"}
      </h3>

      <div className="compare-creator-profile">
        <div className="compare-creator-avatar">
          <User size={16} />
        </div>
        <div>
          <div className="compare-creator-name">
            @{video.creator || "unknown_creator"}
          </div>
          <div className="compare-creator-followers">
            {formatNum(video.follower_count)} followers
          </div>
        </div>
      </div>

      <div className="compare-metrics-row">
        <div className="compare-metrics-grid">
          <div className="compare-metric-item">
            <span className="compare-metric-value" style={{ color: "var(--blue)" }}>
              {formatNum(video.views)}
            </span>
            <span className="compare-metric-label">
              <Eye size={9} style={{ display: "inline", marginRight: 2 }} /> Views
            </span>
          </div>

          <div className="compare-metric-item">
            <span className="compare-metric-value" style={{ color: "#f43f5e" }}>
              {formatNum(video.likes)}
            </span>
            <span className="compare-metric-label">
              <Heart size={9} style={{ display: "inline", marginRight: 2 }} /> Likes
            </span>
          </div>

          <div className="compare-metric-item">
            <span className="compare-metric-value" style={{ color: "var(--yellow)" }}>
              {formatNum(video.comments)}
            </span>
            <span className="compare-metric-label">
              <MessageCircle size={9} style={{ display: "inline", marginRight: 2 }} /> Comments
            </span>
          </div>

          <div className="compare-metric-item">
            <span className="compare-metric-value" style={{ color: "var(--text-primary)" }}>
              {video.duration_seconds > 0 ? formatDuration(video.duration_seconds) : "N/A"}
            </span>
            <span className="compare-metric-label">
              <Clock size={9} style={{ display: "inline", marginRight: 2 }} /> Duration
            </span>
          </div>
        </div>

        {/* Circular / Radial Progress Indicator */}
        <div className="radial-progress-container">
          <svg className="radial-progress-svg">
            <defs>
              <linearGradient id="engagementGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle 
              className="radial-progress-bg"
              cx="45"
              cy="45"
              r={radius}
              strokeWidth="5"
            />
            <circle 
              className="radial-progress-bar"
              cx="45"
              cy="45"
              r={radius}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="radial-progress-text-container">
            <span className="radial-progress-value">{engagement.toFixed(2)}%</span>
            <span className="radial-progress-label">Engage</span>
          </div>
        </div>
      </div>

      <div className="compare-platform-tag-row">
        {video.upload_date && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Calendar size={11} />
            Published: {new Date(video.upload_date).toLocaleDateString()}
          </span>
        )}
        {video.transcript_ready && (
          <span className="badge badge-green" style={{ marginLeft: "auto", fontSize: 10 }}>
            Smart Ingested
          </span>
        )}
      </div>

      {video.hashtags && video.hashtags.length > 0 && (
        <div className="hashtags-list" style={{ marginTop: 4 }}>
          {video.hashtags.slice(0, 5).map((tag, i) => (
            <span key={i} className="hashtag-chip">#{tag.replace(/^#/, '')}</span>
          ))}
          {video.hashtags.length > 5 && (
            <span className="hashtag-chip" style={{ opacity: 0.6 }}>
              +{video.hashtags.length - 5}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
