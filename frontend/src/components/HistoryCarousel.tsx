"use client";
import { useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Trash2 } from "lucide-react";
import { useInfiniteHistory } from "@/hooks/useInfiniteHistory";
import { useQueryClient } from "@tanstack/react-query";
import { Session, deleteAllSessions } from "@/lib/api";
import { HomeHistoryCard } from "./HomeHistoryCarousel";

// ─── Expanded Drawer Grid ───────────────────────────────────────────────────

function HistoryDrawer({
  token,
  activeSessionId,
  onSelect,
  onOpenDetail,
  onClose,
}: {
  token: string | null;
  activeSessionId: string | null;
  onSelect: (s: Session) => void;
  onOpenDetail: (s: Session) => void;
  onClose: () => void;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteHistory(token);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("All Platforms");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to delete ALL comparison history? This action is permanent and cannot be undone.")) {
      try {
        await deleteAllSessions(token!);
        queryClient.invalidateQueries({ queryKey: ["history"] });
        queryClient.invalidateQueries({ queryKey: ["infinite-history"] });
        onClose();
      } catch (err) {
        console.error("Failed to clear history:", err);
        alert("Failed to clear history");
      }
    }
  };

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const allSessions = data?.pages.flatMap((p) => p.sessions) ?? [];
  
  const filteredSessions = allSessions.filter((s) => {
    // 1. Search Query filter
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Platform filter
    if (selectedPlatform === "All Platforms") {
      return matchesSearch;
    }
    
    const platformLower = selectedPlatform.toLowerCase();
    const matchesPlatform = s.video_urls.some((url) => {
      if (platformLower === "youtube") return url.includes("youtube") || url.includes("youtu.be");
      if (platformLower === "instagram") return url.includes("instagram");
      if (platformLower === "tiktok") return url.includes("tiktok");
      if (platformLower === "twitter/x") return url.includes("twitter") || url.includes("x.com");
      if (platformLower === "facebook") return url.includes("facebook");
      if (platformLower === "linkedin") return url.includes("linkedin");
      if (platformLower === "threads") return url.includes("threads");
      return false;
    });

    return matchesSearch && matchesPlatform;
  });

  return (
    <AnimatePresence>
      <motion.div
        className="history-drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ zIndex: 990 }}
      >
        <motion.div
          className="history-drawer"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{ height: "85vh", maxHeight: "90vh" }}
        >
          <div className="history-drawer-header" style={{ padding: "16px 20px" }}>
            <span className="history-drawer-title" style={{ fontSize: "16px", fontWeight: 700 }}>
              📋 Previous Comparison History
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button 
                onClick={handleClearAll}
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  color: "#ef4444",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "5px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all var(--transition)",
                  fontFamily: "var(--font-sans)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                }}
              >
                <Trash2 size={11} />
                Clear All
              </button>
              <button className="history-drawer-close" onClick={onClose}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Search Bar matching Image 2 */}
          <div style={{ padding: "14px 20px 8px 20px", borderBottom: "none", display: "flex", gap: 10 }}>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type="text"
                className="url-field"
                placeholder="Search previous titles, creators, or URLs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "36px" }}
              />
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>
          </div>

          {/* Platform Filters matching Image 2 */}
          <div style={{ padding: "0 20px 14px 20px", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["All Platforms", "YouTube", "Instagram", "TikTok", "Twitter/X", "Facebook", "LinkedIn", "Threads"].map((platform) => {
              const isActive = selectedPlatform === platform;
              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  style={{
                    background: isActive ? "var(--accent)" : "rgba(255,255,255,0.02)",
                    border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: "20px",
                    color: isActive ? "white" : "var(--text-secondary)",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "6px 14px",
                    cursor: "pointer",
                    transition: "all var(--transition)",
                    fontFamily: "var(--font-sans)"
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  {platform}
                </button>
              );
            })}
          </div>

          {/* Grid Layout of Cards matching Image 2 */}
          <div className="history-drawer-list" style={{ overflowY: "auto", flex: 1, padding: "20px" }}>
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", 
                gap: "20px",
                width: "100%"
              }}
            >
              {filteredSessions.map((session, i) => (
                <HomeHistoryCard
                  key={session.id}
                  session={session}
                  token={token}
                  onSelect={(s) => {
                    onSelect(s);
                    onClose();
                  }}
                  onOpenDetail={onOpenDetail}
                  index={i}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="history-load-more" style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              {isFetchingNextPage && (
                <span className="spinner" style={{ borderTopColor: "var(--accent)" }} />
              )}
              {!hasNextPage && allSessions.length > 0 && (
                <span>All comparisons loaded</span>
              )}
              {filteredSessions.length === 0 && !isFetchingNextPage && (
                <div style={{ padding: "40px 0", color: "var(--text-muted)" }}>
                  No previous comparisons matching filters.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── History Carousel (main export) ─────────────────────────────────────────

interface HistoryCarouselProps {
  token: string | null;
  activeSessionId: string | null;
  onSelectSession: (session: Session) => void;
  onOpenDetail: (session: Session) => void;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
  hideBottomBar?: boolean;
}

export function HistoryCarousel({
  token,
  activeSessionId,
  onSelectSession,
  onOpenDetail,
  drawerOpen,
  onCloseDrawer,
}: HistoryCarouselProps) {
  return (
    <>
      {drawerOpen && (
        <HistoryDrawer
          token={token}
          activeSessionId={activeSessionId}
          onSelect={onSelectSession}
          onOpenDetail={onOpenDetail}
          onClose={onCloseDrawer}
        />
      )}
    </>
  );
}
