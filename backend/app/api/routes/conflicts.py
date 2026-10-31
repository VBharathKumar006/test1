"""Conflicts API routes."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.document_models import ConflictRecord
from app.schemas.schemas import ConflictListResponse, ConflictItem

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=ConflictListResponse)
async def list_conflicts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConflictRecord).order_by(ConflictRecord.detected_at.desc())
    )
    records = result.scalars().all()
    conflicts = [
        ConflictItem(
            conflict_id=r.id,
            conflict_type=r.conflict_type,
            topic=r.topic,
            document_a=r.doc_id_a,
            document_b=r.doc_id_b,
            version_a=None,
            version_b=None,
            effective_date_a=None,
            effective_date_b=None,
            department_a=None,
            department_b=None,
            team_a=None,
            team_b=None,
            statement_a=r.statement_a or "",
            statement_b=r.statement_b or "",
            severity=r.severity,
            resolution_status=r.resolution_status,
            explanation=r.resolution_note,
        )
        for r in records
    ]
    return ConflictListResponse(conflicts=conflicts, total=len(conflicts))


@router.get("/{conflict_id}", response_model=ConflictItem)
async def get_conflict(conflict_id: str, db: AsyncSession = Depends(get_db)):
    record = await db.get(ConflictRecord, conflict_id)
    if not record:
        raise HTTPException(status_code=404, detail="Conflict not found.")
    return ConflictItem(
        conflict_id=record.id,
        conflict_type=record.conflict_type,
        topic=record.topic,
        document_a=record.doc_id_a,
        document_b=record.doc_id_b,
        version_a=None,
        version_b=None,
        effective_date_a=None,
        effective_date_b=None,
        department_a=None,
        department_b=None,
        team_a=None,
        team_b=None,
        statement_a=record.statement_a or "",
        statement_b=record.statement_b or "",
        severity=record.severity,
        resolution_status=record.resolution_status,
        explanation=record.resolution_note,
    )

