"""
FastAPI application entry point.
"""
from __future__ import annotations
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.weaviate_client import get_weaviate_client, close_weaviate_client
from app.api.routes import ingest, chat, sessions

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up Weaviate connection + ensure schema
    log.info("Starting ReelRag backend")
    try:
        get_weaviate_client()
        log.info("Weaviate connected and schema ready")
    except Exception as e:
        log.error("Weaviate startup failed", error=str(e))
    yield
    # Shutdown
    close_weaviate_client()
    log.info("ReelRag backend shut down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="ReelRag API",
        description="RAG-powered video content comparison chatbot",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS — allow frontend origin
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(ingest.router, prefix="/api", tags=["ingest"])
    app.include_router(chat.router, prefix="/api", tags=["chat"])
    app.include_router(sessions.router, prefix="/api", tags=["sessions"])

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "reelrag"}

    return app


app = create_app()
