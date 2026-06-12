"use client";
import { useState, useEffect, useRef, UIEvent, useCallback } from "react";
import { useInfiniteHistory } from "@/hooks/useInfiniteHistory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSessionDetail, Session, deleteSession, deleteAllSessions } from "@/lib/api";
import { Clock, MessageSquare, Maximize2, RefreshCw, Search, LayoutGrid, Heart, Eye, MessageCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getPlatformIcon(url: string) {
  if (url.includes("youtube") || url.includes("youtu.be")) {
    return <span style={{ marginRight: 4, color: "#ef4444" }}>▶</span>;
  }
  if (url.includes("instagram")) {
    return <span style={{ marginRight: 4, color: "#ec4899" }}>📸</span>;
  }
  if (url.includes("tiktok")) {
    return <span style={{ marginRight: 4, color: "#2dd4bf" }}>♪</span>;
  }
  return <span style={{ marginRight: 4, color: "var(--text-secondary)" }}>🎬</span>;
}

export function HomeHistoryCard({
  session,
  token,
  onSelect,
  onOpenDetail,
  index,
}: {
  session: Session;
  token: string | null;
  onSelect: (s: Session) => void;
  onOpenDetail: (s: Session) => void;
  index: number;
}) {
  const queryClient = useQueryClient();

  // Fetch detailed session for Video A/B metadata
  const { data: detail, isLoading, refetch } = useQuery<Session, Error>({
    queryKey: ["session-detail", session.id],
    queryFn: () => fetchSessionDetail(session.id, token!),
    enabled: !!token && !!session.id,
    staleTime: 60_000,
  });

  const videos = detail?.videos ?? [];

  // framer motion variants for left-to-right entry animation
  const cardVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 15,
        delay: index * 0.08
      }
    }
  };

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    refetch();
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this comparison search?")) {
      try {
        await deleteSession(session.id, token!);
        queryClient.invalidateQueries({ queryKey: ["history"] });
        queryClient.invalidateQueries({ queryKey: ["infinite-history"] });
      } catch (err) {
        console.error("Failed to delete session:", err);
        alert("Failed to delete session");
      }
    }
  };

  return (
    <motion.div
      className="history-carousel-card"
      style={{ minWidth: "310px", maxWidth: "310px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, borderColor: "var(--accent)" }}
      onClick={() => onOpenDetail(session)}
    >
      {/* Header row */}
      <div className="history-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", color: "var(--text-secondary)" }}>
          <Clock size={11} />
          {timeAgo(session.created_at)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button 
            onClick={handleRefreshClick}
            className="history-card-refresh"
            title="Refresh analysis"
            style={{ width: "22px", height: "22px" }}
          >
            <RefreshCw size={10} />
          </button>
          <button 
            onClick={handleDeleteClick}
            className="history-card-refresh"
            title="Delete analysis"
            style={{ 
              width: "22px", 
              height: "22px", 
              borderColor: "rgba(239, 68, 68, 0.25)",
              color: "rgba(239, 68, 68, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--red)";
              e.currentTarget.style.color = "var(--red)";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
              e.currentTarget.style.color = "rgba(239, 68, 68, 0.7)";
              e.currentTarget.style.background = "none";
            }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Videos comparison list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton" style={{ height: 42, width: "100%" }} />
            <div className="skeleton" style={{ height: 42, width: "100%" }} />
          </div>
        ) : videos.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "10px 0" }}>
            No video metadata. Click Continue to run.
          </div>
        ) : (
          videos.slice(0, 2).map((vid, idx) => {
            const isB = idx === 1;
            const labelColor = isB ? "#2dd4bf" : "#ef4444";
            const labelBg = isB ? "rgba(45, 212, 191, 0.08)" : "rgba(239, 68, 68, 0.08)";
            const labelBorder = isB ? "1px solid rgba(45, 212, 191, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)";
            
            return (
              <div 
                key={vid.video_id || idx} 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: 4, 
                  borderBottom: idx === 0 && videos.length > 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  paddingBottom: idx === 0 && videos.length > 1 ? 8 : 0 
                }}
              >
                {/* Platform + Video label row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span 
                    style={{ 
                      fontSize: "9px", 
                      fontWeight: 700, 
                      color: labelColor, 
                      background: labelBg, 
                      border: labelBorder,
                      padding: "1px 5px",
                      borderRadius: "3px",
                      textTransform: "uppercase"
                    }}
                  >
                    Video {vid.video_id || (isB ? "B" : "A")}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    ({vid.platform === "youtube" ? "YouTube" : vid.platform === "instagram" ? "Instagram" : vid.platform})
                  </span>
                </div>

                {/* Video Title */}
                <div 
                  className="history-card-row-title" 
                  style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", maxWidth: "100%" }}
                  title={vid.title || ""}
                >
                  {vid.title || "Untitled Social Video"}
                </div>

                {/* Stats row with metrics + engagement rate */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                  <div className="history-card-row-stats" style={{ display: "flex", gap: 8, fontSize: "10px", color: "var(--text-secondary)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                      <Heart size={9} style={{ color: "#f43f5e" }} /> {formatNum(vid.likes)}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                      <Eye size={9} style={{ color: "var(--blue)" }} /> {formatNum(vid.views)}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                      <MessageCircle size={9} style={{ color: "var(--yellow)" }} /> {formatNum(vid.comments)}
                    </span>
                  </div>
                  
                  <div className="history-card-row-engage" style={{ fontSize: "10px", padding: "1px 5px" }}>
                    ⚡ {vid.engagement_rate.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Card Actions Footer */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "auto" }}>
        <button 
          className="history-continue-btn"
          style={{ flex: 1, height: "30px", fontSize: "11px", gap: 4 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(session);
          }}
        >
          <MessageSquare size={11} />
          Continue Conversation
        </button>
        <button
          className="history-expand-btn"
          style={{ width: "30px", height: "30px", padding: 0, justifyContent: "center", display: "flex", alignItems: "center" }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(session);
          }}
          title="Fullscreen analysis details"
        >
          <Maximize2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

interface HomeHistoryCarouselProps {
  token: string | null;
  onSelectSession: (session: Session) => void;
  onOpenDetail: (session: Session) => void;
  onOpenDrawer: () => void;
}

export function HomeHistoryCarousel({
  token,
  onSelectSession,
  onOpenDetail,
  onOpenDrawer,
}: HomeHistoryCarouselProps) {
  const { data } = useInfiniteHistory(token);
  const queryClient = useQueryClient();
  
  const allSessions = data?.pages.flatMap((p) => p.sessions) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;
  
  const marqueeSessions = allSessions.slice(0, 12);

  const [marqueeWidth, setMarqueeWidth] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (trackRef.current && marqueeSessions.length > 0) {
      setMarqueeWidth(trackRef.current.scrollWidth / 2);
    }
  }, [marqueeSessions]);

  if (allSessions.length === 0) {
    return null;
  }

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to delete ALL comparison history? This action is permanent and cannot be undone.")) {
      try {
        await deleteAllSessions(token!);
        queryClient.invalidateQueries({ queryKey: ["history"] });
        queryClient.invalidateQueries({ queryKey: ["infinite-history"] });
      } catch (err) {
        console.error("Failed to clear history:", err);
        alert("Failed to clear history");
      }
    }
  };

  const isAnimated = marqueeWidth > 0 && marqueeSessions.length >= 3;

  return (
    <div className="home-history-section" style={{ width: "100%" }}>
      {isAnimated && (
        <style>{`
          @keyframes marquee-r2l {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-${marqueeWidth}px, 0, 0); }
          }
          .marquee-track-animated {
            display: flex;
            gap: 14px;
            width: max-content;
            animation: marquee-r2l ${Math.max(25, marqueeSessions.length * 8)}s linear infinite;
          }
        `}</style>
      )}

      {/* Header with Search Grid button matching Image 2 */}
      <div className="home-history-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 className="home-history-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Search size={12} style={{ color: "var(--accent-light)" }} />
          PREVIOUS SEARCHES ({totalCount})
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button 
            className="home-history-grid-btn" 
            onClick={handleClearAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              borderColor: "rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              background: "rgba(239, 68, 68, 0.04)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
              e.currentTarget.style.borderColor = "#ef4444";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.04)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            }}
          >
            <Trash2 size={12} />
            Clear All History
          </button>
          <button className="home-history-grid-btn" onClick={onOpenDrawer} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <LayoutGrid size={12} />
            Expand & Search Grid
          </button>
        </div>
      </div>

      {/* Scrollable / Marquee container */}
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          width: "100%", 
          overflow: "hidden",
          position: "relative",
          paddingBottom: "12px"
        }}
      >
        <div
          ref={trackRef}
          className={isAnimated ? "marquee-track-animated" : "history-scroll"}
          style={{
            display: "flex",
            gap: "14px",
            width: isAnimated ? "max-content" : "100%",
            animationPlayState: isHovered ? "paused" : "running",
            overflowX: isAnimated ? "visible" : "auto",
            scrollbarWidth: "thin"
          }}
        >
          {(isAnimated ? [...marqueeSessions, ...marqueeSessions] : allSessions).map((session, idx) => (
            <HomeHistoryCard
              key={`${session.id}-${idx}`}
              session={session}
              token={token}
              onSelect={onSelectSession}
              onOpenDetail={onOpenDetail}
              index={idx % (marqueeSessions.length || 1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
