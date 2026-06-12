# Deployment Guide: ReelRag

This guide outlines step-by-step instructions to deploy the FastAPI backend on Render and the Next.js frontend on Vercel, and how to connect them.

## Deployed Service URLs
* **Backend API URL**: `https://videoai-02.onrender.com`
* **Frontend Web URL**: `https://video-ai-02.vercel.app/`

---

## 🚀 1. Backend Deployment (Render)

We have configured a `render.yaml` blueprint file in the root directory to make deployment simple.

### Steps:
1. Log in to [Render](https://render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository `rak123456805/videoAi_02`.
4. Render will automatically read the `render.yaml` configuration. Give your blueprint a name and click **Apply**.
5. Render will prompt you for the required environment variables:
   * `GOOGLE_API_KEY`: Your Gemini API Key.
   * `WEAVIATE_URL`: Your Weaviate vector cloud instance endpoint.
   * `WEAVIATE_API_KEY`: Your Weaviate instance API Key.
   * `SUPABASE_URL`: Your Supabase database endpoint.
   * `SUPABASE_SERVICE_ROLE_KEY`: Service role credential key for admin ops.
   * `SUPABASE_JWT_SECRET`: Secret token for verifying user authentication.
   * `CORS_ORIGINS`: Set this to your deployed Vercel frontend URL: `https://video-ai-02.vercel.app` (no trailing slash).
6. Click **Deploy**. Render will build and start your FastAPI server.
7. Confirm your backend is running by navigating to `https://videoai-02.onrender.com/health`.

---

## 🎨 2. Frontend Deployment (Vercel)

Vercel is pre-configured to build Next.js applications nested in subdirectories.

### Steps:
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository `rak123456805/videoAi_02`.
4. In the Project Configuration window:
   * **Root Directory**: Click *Edit* and select the `frontend` folder.
   * **Framework Preset**: Vercel will auto-detect **Next.js**.
   * **Build & Development Settings**: Standard settings are auto-configured by `vercel.json`.
5. Expand the **Environment Variables** section and add the following:
   * `NEXT_PUBLIC_API_URL`: Your deployed Render backend URL: `https://videoai-02.onrender.com` (no trailing slash).
   * `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public Anon key of your Supabase project (for browser auth).
6. Click **Deploy**. Vercel will build and launch your site.

---

## 🔗 3. Connecting Frontend and Backend (CORS & Environment Sync)

For the frontend and backend to talk to each other without security blockages, the environment variables must align:

### Backend CORS Settings (Render Dashboard):
* Log into Render, go to your Web Service **Settings** -> **Environment**.
* Check the `CORS_ORIGINS` variable.
* Ensure it is set to `https://video-ai-02.vercel.app` (do not include a trailing `/`).
* If you also test locally, you can use a comma-separated list: `http://localhost:3000,https://video-ai-02.vercel.app`.

### Frontend API URL Settings (Vercel Dashboard):
* Log into Vercel, go to your Project **Settings** -> **Environment Variables**.
* Ensure `NEXT_PUBLIC_API_URL` is set to `https://videoai-02.onrender.com` (no trailing slash `/`).
* Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match your Supabase project credentials.

---

## 🛠️ 4. Post-Deployment Verification Checklist

1. **Verify Backend Health**:
   Run a GET request to `https://videoai-02.onrender.com/health`. It should return:
   ```json
   {"status": "ok", "service": "reelrag"}
   ```
2. **Verify Frontend UI**:
   Navigate to `https://video-ai-02.vercel.app/`. Ensure the B2B landing page renders correctly.
3. **Verify CORS and Database Connection**:
   * Click **Get Started Free** and complete the log-in or registration process (handled securely via Supabase).
   * Paste valid YouTube/Instagram URLs and click **Analyze**.
   * Verify that transcription, embedding, and vector ingestion run successfully.
   * Verify that the RAG Chatbot is loaded and allows you to chat about the video.
   * Go back to the homepage and verify that your comparison cards display in the scrolling marquee.
