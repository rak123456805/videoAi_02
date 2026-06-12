# Deployment Guide: ReelRag

This guide outlines step-by-step instructions to deploy the FastAPI backend on Render and the Next.js frontend on Vercel.

---

## 🚀 1. Backend Deployment (Render)

We have configured a `render.yaml` blueprint file in the root directory to make deployment simple.

### Steps:
1. Log in to [Render](https://render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository `rak123456805/videoAi_02`.
4. Render will automatically read the `render.yaml` configuration. Give your blueprint a name and click **Apply**.
5. Render will prompt you for the required environment variables:
   * `GOOGLE_API_KEY`: Your Gemini API Key (generous free tier, robust alternative to OpenAI).
   * `WEAVIATE_URL`: Your Weaviate vector cloud instance endpoint.
   * `WEAVIATE_API_KEY`: Your Weaviate instance API Key.
   * `SUPABASE_URL`: Your Supabase database endpoint.
   * `SUPABASE_SERVICE_ROLE_KEY`: Service role credential key for admin ops.
   * `SUPABASE_JWT_SECRET`: Secret token for verifying user authentication.
   * `CORS_ORIGINS`: Set this to your deployed Vercel frontend URL (e.g. `https://your-app.vercel.app`) to allow cross-origin requests.
6. Click **Deploy**. Render will build and start your FastAPI server.
7. Note down your backend URL (e.g. `https://reelrag-backend.onrender.com`).

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
   * `NEXT_PUBLIC_API_URL`: Your deployed Render backend URL (e.g. `https://reelrag-backend.onrender.com`). *Do not include a trailing slash.*
   * `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (must match the one used in the backend).
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The public Anon key of your Supabase project (for handling user login/signup inside the browser).
6. Click **Deploy**. Vercel will install dependencies, build the Next.js production bundle, and launch your site.

---

## 🛠️ Troubleshooting & Post-Deployment Checklist

1. **CORS Errors**: If the frontend console shows CORS blocking errors, verify that you updated the backend `CORS_ORIGINS` environment variable on Render to match your Vercel deployment URL (without trailing slashes).
2. **Cold Starts**: Render's free web service tier spins down after 15 minutes of inactivity. The first request after a spin-down may take up to 50 seconds to respond. (You can use cron services or upgrade Render plans to avoid this).
