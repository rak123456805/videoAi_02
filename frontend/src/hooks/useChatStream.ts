"use client";
import { useState, useCallback } from "react";
import { streamChat, Citation } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

export function useChatStream(token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (sessionId: string, text: string, videoIds?: string[]) => {
      if (!token || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setError(null);

      try {
        let accumulated = "";
        let finalCitations: Citation[] = [];

        for await (const event of streamChat(sessionId, text, token, videoIds)) {
          if (event.type === "token") {
            accumulated += event.data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: accumulated }
                  : m
              )
            );
          } else if (event.type === "citation") {
            finalCitations = event.data;
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: accumulated, citations: finalCitations, streaming: false }
                  : m
              )
            );
          } else if (event.type === "error") {
            setError(event.data);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: "⚠ An error occurred. Please try again.", streaming: false }
                  : m
              )
            );
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
      } finally {
        setIsStreaming(false);
      }
    },
    [token, isStreaming]
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
}
