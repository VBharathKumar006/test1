"""Application configuration using pydantic-settings."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

# backend/ directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
# root HCLTech/ directory
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = PROJECT_ROOT / "data"


class Settings(BaseSettings):
    # LLM Provider
    LLM_PROVIDER: str = "gemini"
    LLM_MODEL: str = "gemini-1.5-flash"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    # Embedding
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Storage paths
    UPLOAD_DIR: str = str(DATA_DIR / "uploads")
    PROCESSED_DIR: str = str(DATA_DIR / "processed")
    VECTOR_STORE_PATH: str = str(DATA_DIR / "vector_store")
    DB_PATH: str = str(DATA_DIR / "enterprise_rag.db")

    # Chunking
    MAX_CHUNK_SIZE: int = 700
    CHUNK_OVERLAP: int = 100

    # Retrieval
    RETRIEVAL_TOP_K: int = 10
    RERANK_TOP_K: int = 5
    SEMANTIC_WEIGHT: float = 0.6
    BM25_WEIGHT: float = 0.4
    RRF_K: int = 60

    # Confidence thresholds
    CONFIDENCE_THRESHOLD: float = 0.5
    LOW_CONFIDENCE_THRESHOLD: float = 0.3

    # Security
    MAX_FILE_SIZE_MB: int = 50

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
