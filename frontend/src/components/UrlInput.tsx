"use client";
import { useState } from "react";
import { Plus, X, Zap, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface UrlInputProps {
  onAnalyze: (urls: string[]) => void;
  loading: boolean;
}

export function UrlInput({ onAnalyze, loading }: UrlInputProps) {
  const [urls, setUrls] = useState<string[]>(["", ""]);

  const addUrl = () => {
    if (urls.length < 6) setUrls((prev) => [...prev, ""]);
  };

  const removeUrl = (idx: number) => {
    if (urls.length <= 2) return;
    setUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateUrl = (idx: number, val: string) => {
    setUrls((prev) => prev.map((u, i) => (i === idx ? val : u)));
  };

  const handleAnalyze = () => {
    const valid = urls.filter((u) => u.trim().length > 0);
    if (valid.length < 1) return;
    onAnalyze(valid);
  };

  const valid = urls.filter((u) => u.trim()).length;

  const getLabelBadgeStyle = (idx: number) => {
    if (idx === 0) {
      return {
        background: "rgba(239, 68, 68, 0.12)",
        color: "#ef4444",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "64px"
      };
    }
    if (idx === 1) {
      return {
        background: "rgba(45, 212, 191, 0.12)",
        color: "#2dd4bf",
        border: "1px solid rgba(45, 212, 191, 0.25)",
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "64px"
      };
    }
    return {
      background: "rgba(168, 85,  purple, 0.12)",
      color: "#a855f7",
      border: "1px solid rgba(168, 85, 247, 0.25)",
      fontWeight: 700,
      padding: "4px 10px",
      borderRadius: "6px",
      fontSize: "11px",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "64px"
    };
  };

  return (
    <div className="url-input-section" style={{ boxShadow: "var(--shadow-lg)" }}>
      <div className="url-input-header">
        <div
          style={{
            width: 28,
            height: 28,
            background: "var(--accent-gradient)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Zap size={14} color="white" />
        </div>
        <span className="url-input-title" style={{ fontSize: "15px", fontWeight: 700 }}>
          Compare Social Videos
        </span>
        <span
          style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}
        >
          {urls.length}/6 Videos
        </span>
      </div>

      <div className="url-inputs-list">
        <AnimatePresence initial={false}>
          {urls.map((url, idx) => (
            <motion.div
              key={idx}
              className="url-input-row"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <div style={getLabelBadgeStyle(idx) as React.CSSProperties}>
                Video {LABELS[idx]}
              </div>
              <input
                type="url"
                className="url-field"
                placeholder="Paste any social media video URL..."
                value={url}
                onChange={(e) => updateUrl(idx, e.target.value)}
                onPaste={() => {
                  // Auto-add row if pasting into last field
                  if (idx === urls.length - 1 && urls.length < 6) {
                    setTimeout(() => addUrl(), 50);
                  }
                }}
              />
              <button
                className="url-remove-btn"
                onClick={() => removeUrl(idx)}
                disabled={urls.length <= 2}
                title="Remove URL"
                style={{ opacity: urls.length <= 2 ? 0.3 : 1 }}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add row + platform pills + action button */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
        {urls.length < 6 && (
          <button 
            className="url-add-btn" 
            onClick={addUrl}
            style={{ width: "100%", justifyContent: "center", borderStyle: "dashed" }}
          >
            <Plus size={14} />
            Add Another URL ({urls.length}/6)
          </button>
        )}

        {/* Supported Platforms Pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 4 }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Supported Platforms
          </span>
          <div className="platform-pills">
            <span className="platform-pill platform-pill-youtube">▶ YouTube</span>
            <span className="platform-pill platform-pill-instagram">📸 Instagram</span>
            <span className="platform-pill platform-pill-tiktok">♪ TikTok</span>
            <span className="platform-pill platform-pill-twitter">𝕏 Twitter</span>
            <span className="platform-pill platform-pill-facebook">📘 Facebook</span>
            <span className="platform-pill platform-pill-linkedin">💼 LinkedIn</span>
            <span className="platform-pill platform-pill-threads">🧵 Threads</span>
          </div>
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={valid < 1 || loading}
          style={{ width: "100%", display: "flex", justifyContent: "center", gap: 8, height: "46px", fontSize: "14px" }}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ borderTopColor: "white" }} />
              Ingesting & Analyzing Videos...
            </>
          ) : (
            <>
              Analyze {valid > 0 ? `${valid} Video${valid > 1 ? "s" : ""}` : "Videos"}
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
