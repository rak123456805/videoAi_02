const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface VideoMetadata {
  video_id: string;
  url: string;
  platform: string;
  title: string | null;
  creator: string | null;
  follower_count: number;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
  hashtags: string[];
  upload_date: string | null;
  duration_seconds: number;
  thumbnail_url: string | null;
  transcript_ready: boolean;
}

export interface Session {
  id: string;
  title: string;
  video_urls: string[];
  created_at: string;
  updated_at: string;
  message_count?: number;
  videos?: VideoMetadata[];
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface IngestResponse {
  session_id: string;
  videos: VideoMetadata[];
}

export interface Citation {
  video_id: string;
  chunk_index: number;
  text: string;
  timestamp_start?: number;
  timestamp_end?: number;
  platform?: string;
}

async function withAuth(token: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function ingestVideos(
  urls: string[],
  token: string,
  sessionId?: string
): Promise<IngestResponse> {
  const headers = await withAuth(token);
  const res = await fetch(`${API_URL}/api/ingest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ urls, session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Ingest failed");
  }
  return res.json();
}

export async function fetchSessions(
  token: string,
  page: number = 1,
  pageSize: number = 10
): Promise<SessionListResponse> {
  const headers = await withAuth(token);
  const res = await fetch(
    `${API_URL}/api/sessions?page=${page}&page_size=${pageSize}`,
    { headers }
  );
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function fetchSessionDetail(
  sessionId: string,
  token: string
): Promise<Session> {
  const headers = await withAuth(token);
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export type StreamEvent =
  | { type: "token"; data: string }
  | { type: "citation"; data: Citation[] }
  | { type: "done"; data: string }
  | { type: "error"; data: string };

export async function* streamChat(
  sessionId: string,
  message: string,
  token: string,
  videoIds?: string[]
): AsyncGenerator<StreamEvent> {
  const headers = await withAuth(token);
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      message,
      video_ids: videoIds,
    }),
  });

  if (!res.ok) throw new Error("Chat request failed");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          yield event;
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}

export async function deleteSession(
  sessionId: string,
  token: string
): Promise<void> {
  const headers = await withAuth(token);
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete session");
}

export async function deleteAllSessions(
  token: string
): Promise<void> {
  const headers = await withAuth(token);
  const res = await fetch(`${API_URL}/api/sessions`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to clear comparison history");
}

