# ReelRag 🎬

AI-powered video content intelligence for creators. Compare public videos across YouTube, Instagram, Twitter/X, and TikTok with RAG-powered insights.

## Architecture

```
frontend/    → Next.js 14 + TanStack Query + Framer Motion + Supabase Auth
backend/     → FastAPI + LangGraph + Weaviate + OpenAI/Gemini
migrations/  → Supabase SQL migrations
```

## Quick Start

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the 3 migration files in `backend/migrations/` in your Supabase SQL editor (in order)
3. Enable Google OAuth in Authentication → Providers (optional)

### 2. Weaviate Cloud Setup

1. Create a free cluster at [console.weaviate.cloud](https://console.weaviate.cloud)
2. Copy the cluster URL and API key

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in your keys in .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in Supabase keys in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Primary LLM + embeddings (sk-...) |
| `GEMINI_API_KEY` | Fallback if OpenAI fails |
| `WEAVIATE_URL` | Your Weaviate Cloud cluster URL |
| `WEAVIATE_API_KEY` | Weaviate API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Backend URL (default: http://localhost:8000) |

## Features

- 🔗 **Multi-URL input** — paste 2–6 video URLs from any platform
- 📊 **Video cards** — views, likes, comments, engagement rate, hashtags
- 🤖 **RAG chat** — powered by LangGraph with streaming SSE
- 💬 **Citations** — every answer cites the video + chunk it came from
- 🧠 **Memory** — conversation history persists across turns
- 📋 **History carousel** — Framer Motion animated session history with infinite scroll
- 🔄 **AI fallback** — OpenAI → Gemini automatic failover

## Supported Platforms

| Platform | Transcript | Stats |
|---|---|---|
| YouTube | ✅ Full transcript | ✅ API + yt-dlp |
| Instagram | ✅ Caption | ✅ yt-dlp |
| Twitter/X | ✅ Tweet text | ✅ yt-dlp |
| TikTok | ✅ Caption | ✅ yt-dlp |
