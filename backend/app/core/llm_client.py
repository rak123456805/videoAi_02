"""
LLM client with automatic OpenAI → Gemini fallback.
"""
from __future__ import annotations

import structlog
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.language_models import BaseChatModel
from langchain_core.embeddings import Embeddings

from app.core.config import get_settings

log = structlog.get_logger(__name__)


def get_chat_model(streaming: bool = False) -> BaseChatModel:
    settings = get_settings()
    if settings.use_openai:
        log.info("Using OpenAI chat model", model=settings.openai_chat_model)
        return ChatOpenAI(
            model=settings.openai_chat_model,
            api_key=settings.openai_api_key,
            streaming=streaming,
            temperature=0.3,
        )
    log.info("Falling back to Gemini chat model", model=settings.gemini_chat_model)
    return ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        google_api_key=settings.gemini_api_key,
        streaming=streaming,
        temperature=0.3,
    )


class GoogleEmbeddingsWrapper(Embeddings):
    def __init__(self, client: GoogleGenerativeAIEmbeddings, output_dimensionality: int = 1536):
        self.client = client
        self.output_dimensionality = output_dimensionality

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.client.embed_documents(texts, output_dimensionality=self.output_dimensionality)

    def embed_query(self, text: str) -> list[float]:
        return self.client.embed_query(text, output_dimensionality=self.output_dimensionality)


def get_embeddings() -> Embeddings:
    settings = get_settings()
    if settings.use_openai:
        log.info("Using OpenAI embeddings", model=settings.embedding_model)
        return OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key,
        )
    log.info("Falling back to Gemini embeddings")
    client = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-2",
        google_api_key=settings.gemini_api_key,
    )
    return GoogleEmbeddingsWrapper(client, output_dimensionality=1536)
