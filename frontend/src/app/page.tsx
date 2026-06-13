"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { AuthPage } from "@/components/AuthPage";
import { UrlInput } from "@/components/UrlInput";
import { CompareColumn } from "@/components/CompareColumn";
import { AnalysisDetailModal } from "@/components/AnalysisDetailModal";
import { VideoCardSkeleton } from "@/components/VideoCard";
import { ChatPanel } from "@/components/ChatPanel";
import { HistoryCarousel } from "@/components/HistoryCarousel";
import { HomeHistoryCarousel } from "@/components/HomeHistoryCarousel";
import { useIngestVideos } from "@/hooks/useIngestVideos";
import { useChatStream } from "@/hooks/useChatStream";
import { fetchSessionDetail, Session, VideoMetadata } from "@/lib/api";
import { Zap, LogOut, User, ArrowLeft, Maximize2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const supabase = createClient();
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentVideos, setCurrentVideos] = useState<VideoMetadata[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"login" | "signup" | "forgot_password" | "reset_password">("login");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [detailVideos, setDetailVideos] = useState<VideoMetadata[]>([]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Check if we arrived here via a password recovery link
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setAuthInitialMode("reset_password");
      setAuthModalOpen(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
      setUserEmail(session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setToken(session?.access_token ?? null);
      setUserEmail(session?.user?.email ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setAuthInitialMode("reset_password");
        setAuthModalOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setSessionId(null);
    setCurrentSession(null);
    setCurrentVideos([]);
    chatStream.clearMessages();
  };

  // ── Ingest ─────────────────────────────────────────────────────────────────
  const ingest = useIngestVideos(token);

  const handleAnalyze = useCallback(
    async (urls: string[]) => {
      if (!token) return;
      try {
        const result = await ingest.mutateAsync({ urls });
        setSessionId(result.session_id);
        setCurrentVideos(result.videos);
        setCurrentSession({
          id: result.session_id,
          title: "New Video Comparison",
          video_urls: urls,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          videos: result.videos,
        });
        chatStream.clearMessages();
      } catch (e: unknown) {
        console.error("Ingest failed:", e);
      }
    },
    [token, ingest]
  );

  const handleReanalyze = useCallback(
    async (urls: string[]) => {
      if (!token || !sessionId) return;
      try {
        const result = await ingest.mutateAsync({ urls, sessionId });
        setCurrentVideos(result.videos);
        if (currentSession) {
          setCurrentSession({
            ...currentSession,
            videos: result.videos,
          });
        }
      } catch (e) {
        console.error("Re-analyze failed:", e);
      }
    },
    [token, sessionId, ingest, currentSession]
  );

  // ── Chat ──────────────────────────────────────────────────────────────────
  const chatStream = useChatStream(token);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!sessionId) return;
      chatStream.sendMessage(sessionId, text);
    },
    [sessionId, chatStream]
  );

  // ── Load historical session ───────────────────────────────────────────────
  const handleSelectSession = useCallback(
    async (session: Session) => {
      if (!token) return;
      setLoadingSession(true);
      try {
        const detail = await fetchSessionDetail(session.id, token);
        setSessionId(detail.id);
        setCurrentVideos(detail.videos ?? []);
        setCurrentSession(detail);
        chatStream.clearMessages();
      } catch (e) {
        console.error("Failed to load session:", e);
      } finally {
        setLoadingSession(false);
      }
    },
    [token, chatStream]
  );

  const handleOpenDetail = useCallback(
    async (session: Session) => {
      if (!token) return;
      setLoadingSession(true);
      try {
        const detail = await fetchSessionDetail(session.id, token);
        setDetailSession(detail);
        setDetailVideos(detail.videos ?? []);
        setDetailModalOpen(true);
      } catch (e) {
        console.error("Failed to load session details:", e);
      } finally {
        setLoadingSession(false);
      }
    },
    [token]
  );

  const handleReanalyzeDetail = useCallback(
    async (urls: string[]) => {
      if (!token || !detailSession?.id) return;
      try {
        const result = await ingest.mutateAsync({ urls, sessionId: detailSession.id });
        setDetailVideos(result.videos);
        setDetailSession({
          ...detailSession,
          videos: result.videos,
        });
      } catch (e) {
        console.error("Re-analyze detail failed:", e);
      }
    },
    [token, detailSession, ingest]
  );



  const isIngesting = ingest.isPending;
  const isWorkspace = !!sessionId || isIngesting || loadingSession;

  return (
    <div className="app-layout">
      {/* 1. Header (Navbar differs by view state) */}
      {!isWorkspace ? (
        <header className="topbar">
          <div className="logo">
            <div className="logo-icon">
              <Zap size={18} color="white" />
            </div>
            ReelRag
          </div>

          {!token && (
            <div className="nav-links" style={{ display: "flex", gap: 24, fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
              <button 
                onClick={() => scrollToSection("features")} 
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "inherit", 
                  cursor: "pointer", 
                  fontSize: "inherit", 
                  fontWeight: "inherit",
                  fontFamily: "var(--font-sans)",
                  transition: "color var(--transition)"
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection("how-it-works")} 
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "inherit", 
                  cursor: "pointer", 
                  fontSize: "inherit", 
                  fontWeight: "inherit",
                  fontFamily: "var(--font-sans)",
                  transition: "color var(--transition)"
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection("faq")} 
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "inherit", 
                  cursor: "pointer", 
                  fontSize: "inherit", 
                  fontWeight: "inherit",
                  fontFamily: "var(--font-sans)",
                  transition: "color var(--transition)"
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
              >
                FAQ
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            {token ? (
              <>
                {userEmail && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <User size={13} />
                    {userEmail}
                  </span>
                )}
                <button
                  onClick={handleSignOut}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <LogOut size={12} />
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setAuthInitialMode("login");
                  setAuthModalOpen(true);
                }}
                style={{
                  background: "var(--accent-gradient)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: "white",
                  fontSize: 12,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </header>
      ) : (
        <header className="workspace-navbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="new-analysis-btn"
              onClick={() => {
                setSessionId(null);
                setCurrentSession(null);
                setCurrentVideos([]);
                chatStream.clearMessages();
              }}
            >
              <ArrowLeft size={13} />
              New Analysis
            </button>
            
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {isIngesting || loadingSession ? (
                <span className="loading-pulse">Analyzing Video Comparison...</span>
              ) : (
                currentSession?.title || "Comparative Workspace"
              )}
            </h2>

            {!isIngesting && !loadingSession && currentVideos.length > 0 && (
              <button
                className="home-history-grid-btn"
                style={{ 
                  padding: "4px 10px", 
                  fontSize: "11px", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  borderRadius: "4px" 
                }}
                onClick={() => setDetailModalOpen(true)}
              >
                <Maximize2 size={10} />
                Compare Stats
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {!isIngesting && !loadingSession && currentSession && (
              <button
                className="re-analyze-btn"
                onClick={() => handleReanalyze(currentSession.video_urls)}
                disabled={isIngesting}
              >
                <RefreshCw size={12} className={isIngesting ? "spinner" : ""} />
                Re-analyze
              </button>
            )}

            {userEmail && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <User size={13} />
                {userEmail}
              </span>
            )}
            
            <button
              onClick={handleSignOut}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                fontSize: 12,
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-sans)",
              }}
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </header>
      )}

      {/* 2. Main Content Area */}
      <AnimatePresence mode="wait">
        {!token ? (
          /* Landing Page View - B2B SaaS Company Landing Page */
          <motion.div
            key="landing-view"
            className="landing-scroll-wrapper"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ width: "100%", height: "calc(100vh - 56px)", overflowY: "auto" }}
          >
            <div
              className="landing-container"
              style={{ width: "100%", maxWidth: "1000px", padding: "60px 20px 80px", display: "flex", flexDirection: "column", gap: "80px", margin: "0 auto" }}
            >
            {/* Hero Section */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
              <h1 
                style={{ 
                  fontSize: "48px", 
                  fontWeight: 800, 
                  background: "var(--accent-gradient)", 
                  WebkitBackgroundClip: "text", 
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                  maxWidth: "800px"
                }}
              >
                Comparative Video Intelligence Powered by AI RAG
              </h1>
              <p style={{ fontSize: "16px", color: "var(--text-secondary)", maxWidth: "620px", lineHeight: "1.6", margin: "0 auto" }}>
                Instantly compare social media metrics, auto-extract transcripts, and query video content using natural language. Built for modern marketing teams, creators, and brands.
              </p>
              
              <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 12 }}>
                <button
                  onClick={() => {
                    setAuthInitialMode("signup");
                    setAuthModalOpen(true);
                  }}
                  className="analyze-btn"
                  style={{ 
                    padding: "12px 28px", 
                    fontSize: "14px", 
                    height: "46px", 
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  Get Started Free
                  <Zap size={14} fill="white" />
                </button>
                <button
                  onClick={() => {
                    setAuthInitialMode("signup");
                    setAuthModalOpen(true);
                  }}
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-bright)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    fontWeight: 600,
                    padding: "0 24px",
                    cursor: "pointer",
                    transition: "all var(--transition)"
                  }}
                >
                  Watch Demo
                </button>
              </div>

              {/* Product Mockup Preview (Image 3 look-alike preview) */}
              <div 
                style={{ 
                  width: "100%", 
                  maxWidth: "800px", 
                  marginTop: "40px", 
                  background: "var(--bg-surface)", 
                  border: "1px solid var(--border-bright)", 
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-lg), var(--shadow-accent)",
                  overflow: "hidden",
                  textAlign: "left"
                }}
              >
                {/* Mock Window Header */}
                <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>
                    reelrag.com/workspace/demo
                  </span>
                </div>
                
                {/* Mock Workspace Body */}
                <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                  
                  {/* Left Side: Mock Video Comparison Cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    
                    {/* Mock Video A card */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", background: "rgba(244,63,94,0.08)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.2)", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                          VIDEO A
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Instagram Reels</span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700 }}>growth hacks for social media</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>👁️ 1.3M views</span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#f43f5e" }}>⚡ 5.79% Engage</span>
                      </div>
                    </div>

                    {/* Mock Video B card */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", background: "rgba(45,212,191,0.08)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.2)", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                          VIDEO B
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>YouTube Shorts</span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700 }}>Ubhaya Jagadgurus of Moolamnaya...</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>👁️ 82.9K views</span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#2dd4bf" }}>⚡ 1.65% Engage</span>
                      </div>
                    </div>

                  </div>

                  {/* Right Side: Mock RAG Chatbot */}
                  <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                      AI Content Assistant
                    </div>
                    <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* User message */}
                      <div style={{ alignSelf: "flex-end", background: "var(--accent)", color: "white", padding: "6px 10px", borderRadius: "8px 8px 0 8px", maxWidth: "90%" }}>
                        Which video had higher engagement?
                      </div>
                      {/* AI response */}
                      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: "8px 10px", borderRadius: "8px 8px 8px 0", maxWidth: "95%", lineHeight: 1.4, color: "var(--text-primary)" }}>
                        <strong>Video A (Instagram)</strong> leads significantly with an engagement rate of <strong>5.79%</strong> compared to Video B's 1.65%...
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Trust Bar & Stats Section */}
            <div style={{ textAlign: "center", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "40px 0" }}>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 24 }}>
                TRUSTED BY AGENCIES, CREATORS AND SOCIAL TEAMS WORLDWIDE
              </p>
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(3, 1fr)", 
                  gap: 20,
                  maxWidth: "780px",
                  margin: "0 auto"
                }}
              >
                <div>
                  <h3 style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent-light)" }}>10M+</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Videos Analyzed</p>
                </div>
                <div>
                  <h3 style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent-light)" }}>150K+</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Transcripts Indexed</p>
                </div>
                <div>
                  <h3 style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent-light)" }}>99.9%</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Uptime Accuracy</p>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div id="how-it-works" style={{ display: "flex", flexDirection: "column", gap: 32, alignItems: "center" }}>
              <h2 style={{ fontSize: "26px", fontWeight: 800 }}>How ReelRag Works</h2>
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", 
                  gap: 20, 
                  width: "100%" 
                }}
              >
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", gap: 14 }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent-light)", background: "var(--accent-glow)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: 6 }}>Paste Video Links</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      Drop URLs from YouTube, Instagram, and more into the clean comparative input dashboard.
                    </p>
                  </div>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", gap: 14 }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent-light)", background: "var(--accent-glow)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: 6 }}>Automated Ingest</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      ReelRag automatically fetches statistical metrics and indexes spoken content into Weaviate.
                    </p>
                  </div>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", gap: 14 }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent-light)", background: "var(--accent-glow)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: 6 }}>Compare & Chat</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      Inspect metrics side-by-side and chat with AI RAG to find script parts, hooks, and content suggestions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Features Grid */}
            <div id="features" style={{ display: "flex", flexDirection: "column", gap: 32, alignItems: "center" }}>
              <h2 style={{ fontSize: "26px", fontWeight: 800 }}>Core Platform Features</h2>
              <div 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
                  gap: 20, 
                  width: "100%" 
                }}
              >
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: "24px" }}>📊</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Detailed Video Metrics</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Verify views, comments, likes, upload dates, and custom engagement metrics side-by-side.
                  </p>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: "24px" }}>📝</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Transcript Indexing</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Smart extraction of public video speech contents, vectorized into vector embeddings for prompt retrieval.
                  </p>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: "24px" }}>🤖</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Contextual Chatbot</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Perform natural language queries to discover scripting outlines, compare messaging styles, or extract metrics.
                  </p>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: "24px" }}>⚡</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Multi-network support</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    Perfect support for YouTube, YouTube Shorts, Instagram Reels, and more networks.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive FAQs Accordion Section */}
            <div id="faq" style={{ display: "flex", flexDirection: "column", gap: 32, width: "100%", maxWidth: "800px", margin: "0 auto" }}>
              <h2 style={{ fontSize: "26px", fontWeight: 800, textAlign: "center" }}>Frequently Asked Questions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    q: "What social media platforms does ReelRag support?",
                    a: "ReelRag currently supports YouTube (standard videos & Shorts) and Instagram (Reels & posts). Support for TikTok and Twitter/X clips is in our active roadmap."
                  },
                  {
                    q: "How does the AI RAG Chatbot retrieve video information?",
                    a: "Upon ingestion, our engine fetches stats and indexes the video transcripts into our Weaviate vector database. When you chat with the chatbot, it uses semantic retrieval to find specific transcript chunks and metrics related to your question."
                  },
                  {
                    q: "Is a subscription required to compare videos?",
                    a: "No! ReelRag allows you to perform comparative analysis and query video libraries for free. You can sign in using your email or Google OAuth to start creating databases."
                  }
                ].map((faq, idx) => {
                  const isOpen = faqOpen === idx;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: "var(--bg-card)", 
                        border: "1px solid var(--border)", 
                        borderRadius: "var(--radius-md)", 
                        overflow: "hidden" 
                      }}
                    >
                      <button
                        onClick={() => setFaqOpen(isOpen ? null : idx)}
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          background: "transparent",
                          border: "none",
                          color: "var(--text-primary)",
                          fontSize: "14px",
                          fontWeight: 700,
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span>{faq.q}</span>
                        <span style={{ fontSize: "16px", color: "var(--text-secondary)", transition: "transform var(--transition)", transform: isOpen ? "rotate(45deg)" : "none" }}>
                          +
                        </span>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div style={{ padding: "0 20px 16px 20px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Section */}
            <footer 
              style={{ 
                borderTop: "1px solid var(--border)", 
                paddingTop: "32px", 
                marginTop: "40px", 
                display: "flex", 
                flexDirection: "column", 
                gap: 16,
                fontSize: "12px", 
                color: "var(--text-muted)",
                width: "100%"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
                <div>
                  <div className="logo" style={{ marginBottom: 6 }}>ReelRag</div>
                  <p>AI Video Comparative Analysis & Intelligence.</p>
                </div>
                <div style={{ display: "flex", gap: 32 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Product</span>
                    <span>Features</span>
                    <span>Pricing</span>
                    <span>Roadmap</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Company</span>
                    <span>About Us</span>
                    <span>Privacy</span>
                    <span>Terms</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 16, marginTop: 8 }}>
                © {new Date().getFullYear()} ReelRag Inc. All rights reserved.
              </div>
            </footer>
          </div>
          </motion.div>
        ) : !isWorkspace ? (
          /* Dashboard View */
          <motion.div
            key="dashboard-view"
            className="landing-scroll-wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ width: "100%", height: "calc(100vh - 56px)", overflowY: "auto" }}
          >
            <div
              className="landing-container"
              style={{ width: "100%", padding: "40px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px", margin: "0 auto" }}
            >
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>
                Start a New Analysis
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
                Paste video links below to compare creator performance, index spoken transcripts, and converse with video content.
              </p>
            </div>

            {/* URL Input Box */}
            <div style={{ width: "100%", maxWidth: "680px" }}>
              <UrlInput onAnalyze={handleAnalyze} loading={isIngesting} />
            </div>

            {/* Slider / Carousel below */}
            <HomeHistoryCarousel
              token={token}
              onSelectSession={handleSelectSession}
              onOpenDetail={handleOpenDetail}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          </div>
          </motion.div>
        ) : (
          /* Comparative Workspace View */
          <motion.div
            key="workspace-view"
            className="workspace-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Left Column: Video A */}
            <div className="workspace-column">
              <h3 style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Video A Column
              </h3>
              {isIngesting || loadingSession ? (
                <VideoCardSkeleton />
              ) : currentVideos.length > 0 ? (
                <CompareColumn video={currentVideos[0]} index={0} />
              ) : (
                <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                  No video A found
                </div>
              )}
            </div>

            {/* Center Column: Video B */}
            <div className="workspace-column">
              <h3 style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Video B Column
              </h3>
              {isIngesting || loadingSession ? (
                <VideoCardSkeleton />
              ) : currentVideos.length > 1 ? (
                <CompareColumn video={currentVideos[1]} index={1} />
              ) : (
                <div style={{ 
                  flex: 1, 
                  border: "1px dashed var(--border)", 
                  borderRadius: "var(--radius-lg)", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  color: "var(--text-muted)",
                  padding: 20,
                  fontSize: 13
                }}>
                  No Video B compared. Return to Home to add another video.
                </div>
              )}
            </div>

            {/* Right Column: Chat Panel */}
            <div className="chat-area">
              <ChatPanel
                messages={chatStream.messages}
                isStreaming={chatStream.isStreaming}
                sessionId={sessionId}
                onSendMessage={handleSendMessage}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. History Drawer (Always available to render drawer pop-up) */}
      {token && (
        <HistoryCarousel
          token={token}
          activeSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onOpenDetail={handleOpenDetail}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          onCloseDrawer={() => setDrawerOpen(false)}
          hideBottomBar={true}
        />
      )}

      {/* 4. Fullscreen Comparison Detail Modal */}
      <AnimatePresence>
        {detailModalOpen && (
          <AnalysisDetailModal
            session={detailSession}
            videos={detailVideos}
            onClose={() => setDetailModalOpen(false)}
            onReanalyze={handleReanalyzeDetail}
            reanalyzing={isIngesting}
          />
        )}
      </AnimatePresence>
      {/* 5. Auth Modal Overlay */}
      <AnimatePresence>
        {authModalOpen && (
          <AuthPage 
            onAuth={() => setAuthModalOpen(false)} 
            onClose={() => setAuthModalOpen(false)} 
            initialMode={authInitialMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
