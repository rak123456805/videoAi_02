"use client";
import { VideoMetadata, Session } from "@/lib/api";
import { X, RefreshCw, Eye, Heart, MessageCircle, Users, Clock, Calendar, ExternalLink } from "lucide-react";
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

interface AnalysisDetailModalProps {
  session: Session | null;
  videos: VideoMetadata[];
  onClose: () => void;
  onReanalyze?: (urls: string[]) => void;
  reanalyzing?: boolean;
}

export function AnalysisDetailModal({
  session,
  videos,
  onClose,
  onReanalyze,
  reanalyzing = false,
}: AnalysisDetailModalProps) {
  if (!session) return null;

  const handleReanalyzeClick = () => {
    if (onReanalyze && session.video_urls.length > 0) {
      onReanalyze(session.video_urls);
    }
  };

  // Determine platforms and winner
  let leaderText = "";
  let videoABadgeText = "";
  let videoBBadgeText = "";
  let comparisonBanner = null;

  if (videos.length >= 2) {
    const sorted = [...videos].sort((a, b) => b.engagement_rate - a.engagement_rate);
    const topVideo = sorted[0];
    const secondVideo = sorted[1];
    const diff = topVideo.engagement_rate - secondVideo.engagement_rate;
    
    const labelA = videos[0].video_id || "A";
    const labelB = videos[1].video_id || "B";
    const engageA = videos[0].engagement_rate.toFixed(2);
    const engageB = videos[1].engagement_rate.toFixed(2);
    
    if (diff > 0.001) {
      const topLabel = topVideo.video_id || "A";
      leaderText = `Video ${topLabel} leads with ${topVideo.engagement_rate.toFixed(2)}% engagement`;
    } else {
      leaderText = "Video A and Video B are tied";
    }

    videoABadgeText = `Video ${labelA}: ${engageA}%`;
    videoBBadgeText = `Video ${labelB}: ${engageB}%`;
  } else if (videos.length === 1) {
    leaderText = `Engagement rate is ${videos[0].engagement_rate.toFixed(2)}%`;
    videoABadgeText = `Video A: ${videos[0].engagement_rate.toFixed(2)}%`;
  }

  const getPlatformLabel = (platform: string) => {
    if (platform === "youtube") return "YouTube";
    if (platform === "instagram") return "Instagram";
    if (platform === "tiktok") return "TikTok";
    if (platform === "twitter") return "Twitter/X";
    return platform;
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === "youtube") return <span style={{ fontSize: "11px", marginRight: 4 }}>▶</span>;
    if (platform === "instagram") return <span style={{ fontSize: "11px", marginRight: 4 }}>📸</span>;
    return <span style={{ fontSize: "11px", marginRight: 4 }}>🎬</span>;
  };

  return (
    <div className="detail-modal-overlay" onClick={onClose} style={{ zIndex: 999 }}>
      <motion.div 
        className="detail-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "1050px", width: "95%" }}
      >
        {/* Modal Header matching Image 3 */}
        <div className="detail-modal-header" style={{ padding: "18px 24px" }}>
          <div className="detail-modal-header-left">
            <h2 className="detail-modal-title" style={{ fontSize: "18px", fontWeight: 700 }}>
              Analysis Detail
            </h2>
            <div className="detail-modal-meta" style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center" }}>
              <span>{new Date(session.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              <span>•</span>
              <span 
                style={{ 
                  textOverflow: "ellipsis", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  maxWidth: "500px" 
                }}
              >
                {session.video_urls.join(" vs ")}
              </span>
            </div>
          </div>

          <div className="detail-modal-header-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onReanalyze && (
              <button 
                className="re-analyze-btn" 
                onClick={handleReanalyzeClick}
                disabled={reanalyzing}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "rgba(255,255,255,0.03)" }}
              >
                <RefreshCw size={11} className={reanalyzing ? "spinner" : ""} />
                Re-analyze
              </button>
            )}
            <button className="detail-modal-close-btn" onClick={onClose}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="detail-modal-body" style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Top Platform Tabs matching Image 3 red/teal background */}
          <div className="detail-modal-tabs" style={{ display: "flex", gap: 12 }}>
            {videos.slice(0, 2).map((vid, idx) => {
              const isB = idx === 1;
              const tabColor = isB ? "#2dd4bf" : "#f43f5e";
              const tabBg = isB ? "rgba(45, 212, 191, 0.06)" : "rgba(244, 63, 94, 0.06)";
              const tabBorder = isB ? "1px solid rgba(45, 212, 191, 0.18)" : "1px solid rgba(244, 63, 94, 0.18)";
              return (
                <a 
                  key={vid.video_id || idx}
                  href={vid.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-modal-tab"
                  style={{ 
                    color: tabColor, 
                    background: tabBg, 
                    borderColor: "transparent",
                    border: tabBorder,
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textDecoration: "none"
                  }}
                >
                  <span style={{ fontWeight: 800 }}>[{getPlatformLabel(vid.platform)}]</span>
                  <span style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "280px", opacity: 0.8 }}>
                    {vid.url}
                  </span>
                  <ExternalLink size={10} style={{ opacity: 0.6 }} />
                </a>
              );
            })}
          </div>

          {/* Side-by-side video cards */}
          <div className="detail-modal-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {videos.slice(0, 2).map((vid, idx) => {
              const isB = idx === 1;
              const labelColor = isB ? "#2dd4bf" : "#f43f5e";
              const labelText = `VIDEO ${vid.video_id || (isB ? "B" : "A")}`;
              const creatorLetter = vid.creator ? vid.creator.charAt(0).toUpperCase() : "U";

              // Calculations for formula: (Likes + Comments) / Views * 100
              const viewsStr = formatNum(vid.views);
              const likesStr = formatNum(vid.likes);
              const commentsStr = formatNum(vid.comments);
              const formulaText = `(${likesStr} likes + ${commentsStr} comments) / ${viewsStr} views × 100`;

              return (
                <div 
                  key={vid.video_id || idx}
                  className="compare-column-card"
                  style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
                >
                  {/* Column Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {getPlatformIcon(vid.platform)}
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ color: labelColor, fontWeight: 800 }}>{labelText}</span>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span>{getPlatformLabel(vid.platform)}</span>
                    </span>
                  </div>

                  {/* Video Title */}
                  <h3 className="compare-video-title" style={{ fontSize: "15px", fontWeight: 700, lineHeight: 1.4 }}>
                    {vid.title || "Untitled Social Video"}
                  </h3>

                  {/* Creator details */}
                  <div className="compare-creator-profile" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div 
                      className="compare-creator-avatar"
                      style={{ 
                        width: "32px", 
                        height: "32px", 
                        borderRadius: "50%", 
                        background: "rgba(255,255,255,0.03)", 
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: labelColor,
                        fontSize: "12px"
                      }}
                    >
                      {creatorLetter}
                    </div>
                    <div>
                      <div className="compare-creator-name" style={{ fontSize: "12px", fontWeight: 600 }}>
                        {vid.creator || "unknown_creator"}
                      </div>
                      <div className="compare-creator-followers" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {vid.follower_count > 0 ? `${formatNum(vid.follower_count)} followers` : "— followers"}
                      </div>
                    </div>
                  </div>

                  {/* Giant Engagement rate card matching Image 3 */}
                  <div 
                    style={{ 
                      background: isB ? "rgba(45, 212, 191, 0.02)" : "rgba(244, 63, 94, 0.02)", 
                      border: isB ? "1px solid rgba(45, 212, 191, 0.25)" : "1px solid rgba(244, 63, 94, 0.25)",
                      borderRadius: "8px", 
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4
                    }}
                  >
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      ENGAGEMENT RATE
                    </span>
                    <span style={{ fontSize: "32px", fontWeight: 800, color: labelColor, lineHeight: 1 }}>
                      {vid.engagement_rate.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: 2 }}>
                      {formulaText}
                    </span>
                  </div>

                  {/* Grid of 6 smaller metrics cards */}
                  <div 
                    style={{ 
                      display: "grid", 
                      gridTemplateColumns: "1fr 1fr", 
                      gap: "10px" 
                    }}
                  >
                    {/* Views */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <Eye size={14} style={{ color: "var(--blue)" }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{formatNum(vid.views)}</span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Views</span>
                      </div>
                    </div>

                    {/* Likes */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <Heart size={14} style={{ color: "#f43f5e" }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{formatNum(vid.likes)}</span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Likes</span>
                      </div>
                    </div>

                    {/* Comments */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <MessageCircle size={14} style={{ color: "var(--yellow)" }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{formatNum(vid.comments)}</span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Comments</span>
                      </div>
                    </div>

                    {/* Followers */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <Users size={14} style={{ color: "var(--accent-light)" }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{vid.follower_count > 0 ? formatNum(vid.follower_count) : "—"}</span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Followers</span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <Clock size={14} style={{ color: "var(--text-secondary)" }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700 }}>{vid.duration_seconds > 0 ? formatDuration(vid.duration_seconds) : "—"}</span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Duration</span>
                      </div>
                    </div>

                    {/* Uploaded Date */}
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80px" }}>
                          {vid.upload_date ? new Date(vid.upload_date).toISOString().split("T")[0] : "—"}
                        </span>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Uploaded</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom comparison Analysis outcome row */}
          {videos.length >= 2 && (
            <div 
              className="comparison-banner" 
              style={{ 
                background: "rgba(0,0,0,0.2)", 
                border: "1px solid var(--border)", 
                borderRadius: "8px", 
                padding: "12px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div className="comparison-banner-text" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                <span>Engagement Analysis: </span>
                <strong style={{ color: "var(--text-primary)" }}>{leaderText}</strong>
                <span style={{ opacity: 0.5 }}> | Details: </span>
              </div>
              <div className="comparison-banner-badges" style={{ display: "flex", gap: 10 }}>
                <span className="comparison-badge comparison-badge-a" style={{ background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#f43f5e", fontSize: "11px", fontWeight: 700, padding: "3px 8px" }}>
                  {videoABadgeText}
                </span>
                <span className="comparison-badge comparison-badge-b" style={{ background: "rgba(45, 212, 191, 0.08)", border: "1px solid rgba(45, 212, 191, 0.3)", color: "#2dd4bf", fontSize: "11px", fontWeight: 700, padding: "3px 8px" }}>
                  {videoBBadgeText}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
