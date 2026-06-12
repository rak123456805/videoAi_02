from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # LLM Keys
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "openai"

    # Weaviate
    weaviate_url: str = "http://localhost:8080"
    weaviate_api_key: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # YouTube
    youtube_api_key: str = ""

    # App
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"

    # Embedding model
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    # LLM model
    openai_chat_model: str = "gpt-4o"
    gemini_chat_model: str = "gemini-2.5-flash"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 64

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def use_openai(self) -> bool:
        return self.llm_provider.lower() == "openai" and bool(self.openai_api_key and self.openai_api_key.startswith("sk-"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
