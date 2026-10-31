"""
Enterprise Documentation Q&A Assistant — Backend
FastAPI Application Entry Point
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.core.logging_config import setup_logging
from app.api.routes import documents, chat, conflicts, evaluation, system

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("Starting Enterprise Documentation Q&A Assistant...")
    
    # Initialize directories
    for directory in [
        settings.UPLOAD_DIR,
        settings.PROCESSED_DIR,
        settings.VECTOR_STORE_PATH,
    ]:
        os.makedirs(directory, exist_ok=True)
    
    # Initialize SQLite database
    await init_db()
    logger.info("Database initialized.")
    
    # Pre-load vector and keyword indexes
    from app.services.embeddings.embedding_service import embedding_service
    from app.services.retrieval.hybrid_retriever import hybrid_retriever
    embedding_service.load_index()
    hybrid_retriever.bm25_index.load()
    logger.info(f"Loaded vector store with {embedding_service.total_vectors} chunks.")
    logger.info("Backend startup complete.")
    
    yield
    
    logger.info("Backend shutting down.")


app = FastAPI(
    title="Doomsday Enterprise — Knowledge & Documentation AI",
    description="RAG-powered knowledge assistant for Doomsday Enterprise by Team Doomsday. Features grounded answers, verifiable citations, policy conflict detection, and prompt injection defense.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(conflicts.router, prefix="/api/conflicts", tags=["Conflicts"])
app.include_router(evaluation.router, prefix="/api/evaluation", tags=["Evaluation"])
app.include_router(system.router, prefix="/api", tags=["System"])


@app.get("/")
async def root():
    return {
        "message": "Enterprise Documentation Q&A Assistant API",
        "version": "1.0.0",
        "docs": "/docs",
    }

