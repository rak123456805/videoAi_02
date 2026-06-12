"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "@/hooks/useChatStream";
import { Citation } from "@/lib/api";

// ─── Citation Chip ──────────────────────────────────────────────────────────

function CitationChip({ citation }: { citation: Citation }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="citation-chip"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      Video {citation.video_id} · #{citation.chunk_index + 1}
      {show && (
        <span className="citation-tooltip">
          {citation.platform && (
            <strong style={{ display: "block", marginBottom: 4 }}>
              [{citation.platform}]
            </strong>
          )}
          {citation.text}
          {citation.timestamp_start != null && (
            <span style={{ display: "block", marginTop: 4, opacity: 0.7 }}>
              ⏱ {Math.round(citation.timestamp_start)}s – {Math.round(citation.timestamp_end ?? 0)}s
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      className={`message-bubble ${isUser ? "user" : ""}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`message-avatar ${isUser ? "user" : "assistant"}`}>
        {isUser ? "U" : <Bot size={13} />}
      </div>
      <div className="message-content-wrap">
        <div className="message-text">
          {isUser ? (
            msg.content
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              {msg.streaming && <span className="streaming-cursor" />}
            </>
          )}
        </div>
        {!isUser && msg.citations && msg.citations.length > 0 && !msg.streaming && (
          <div className="citations-row">
            {msg.citations.map((c, i) => (
              <CitationChip key={i} citation={c} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Suggestions ────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Why did Video A get more engagement than Video B?",
  "Compare the hooks in the first 30 seconds",
  "What's the engagement rate of each video?",
  "Suggest improvements for the lower-performing video",
  "Who are the creators and their follower counts?",
];

// ─── Chat Panel ─────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  onSendMessage: (text: string) => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  sessionId,
  onSendMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !sessionId) return;
    setInput("");
    onSendMessage(text);
  }, [input, isStreaming, sessionId, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-title">
          <MessageSquare
            size={14}
            style={{ display: "inline", marginRight: 6, verticalAlign: -2 }}
          />
          AI Analysis Chat
        </div>
        {sessionId && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {sessionId.slice(0, 8)}…
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="chat-messages">
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <Bot size={20} />
            </div>
            <p className="chat-empty-title">Ready to analyze</p>
            <p className="chat-empty-sub">
              {sessionId
                ? "Ask me anything about the videos you just added."
                : "Paste video URLs above and click Analyze to get started."}
            </p>
            {sessionId && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-btn"
                    onClick={() => onSendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            placeholder={
              sessionId
                ? "Ask about engagement, transcripts, hooks…"
                : "Analyze videos first to start chatting"
            }
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={!sessionId || isStreaming}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!sessionId || isStreaming || !input.trim()}
            title="Send (Enter)"
          >
            {isStreaming ? (
              <span
                className="spinner"
                style={{ width: 14, height: 14, borderTopColor: "white" }}
              />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
