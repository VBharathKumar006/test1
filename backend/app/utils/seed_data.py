"""
Utility script to seed the database and vector store with sample enterprise documents.
"""
import asyncio
import os
import shutil
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.models.document_models import Document, ConflictRecord
from app.api.routes.documents import process_document_task
from app.services.security.security_service import compute_file_hash, safe_filename

SAMPLE_METADATA = {
    "HR_Policy_v2.md": {
        "department": "HR",
        "team": None,
        "version": "v2.0",
        "effective_date": "2024-01-01",
        "category": "policy",
        "scope": "internal",
    },
    "HR_Policy_v1.md": {
        "department": "HR",
        "team": None,
        "version": "v1.0",
        "effective_date": "2022-03-15",
        "category": "policy",
        "scope": "internal",
    },
    "IT_Access_Policy_v2.html": {
        "department": "IT",
        "team": None,
        "version": "v2.1",
        "effective_date": "2024-03-01",
        "category": "policy",
        "scope": "internal",
    },
    "IT_Access_Policy_v1.txt": {
        "department": "IT",
        "team": None,
        "version": "v1.0",
        "effective_date": "2022-07-01",
        "category": "policy",
        "scope": "internal",
    },
    "Engineering_Team_Policy.md": {
        "department": "Engineering",
        "team": "Engineering",
        "version": "v1.2",
        "effective_date": "2023-06-01",
        "category": "policy",
        "scope": "internal",
    },
    "Finance_Reimbursement_Policy.txt": {
        "department": "Finance",
        "team": None,
        "version": "v3.0",
        "effective_date": "2024-01-01",
        "category": "policy",
        "scope": "internal",
    },
    "Product_Config_Guide.html": {
        "department": "Engineering",
        "team": None,
        "version": "v4.2",
        "effective_date": "2024-10-01",
        "category": "manual",
        "scope": "internal",
    },
    "Security_Policy_InjectionTest.md": {
        "department": "IT",
        "team": None,
        "version": "v1.0",
        "effective_date": "2023-09-01",
        "category": "policy",
        "scope": "restricted",
    },
}

async def seed_samples():
    print("Initializing database...")
    await init_db()

    samples_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "samples"
    uploads_dir = Path(settings.UPLOAD_DIR)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    if not samples_dir.exists():
        print(f"Samples directory {samples_dir} not found.")
        return

    sample_files = list(samples_dir.glob("*.*"))
    print(f"Found {len(sample_files)} sample files in {samples_dir}")

    doc_records = {}

    for sfile in sample_files:
        filename = sfile.name
        content = sfile.read_bytes()
        file_hash = compute_file_hash(content)
        meta = SAMPLE_METADATA.get(filename, {})

        document_id = str(uuid.uuid4())
        dest_filename = f"{document_id}_{safe_filename(filename)}"
        dest_path = uploads_dir / dest_filename
        shutil.copy(sfile, dest_path)

        suffix = sfile.suffix.lower().lstrip(".")

        async with AsyncSessionLocal() as db:
            doc = Document(
                id=document_id,
                filename=filename,
                document_title=meta.get("title") or sfile.stem.replace("_", " ").title(),
                file_type=suffix,
                file_size=len(content),
                file_hash=file_hash,
                department=meta.get("department"),
                team=meta.get("team"),
                document_version=meta.get("version"),
                effective_date=meta.get("effective_date"),
                access_scope=meta.get("scope", "internal"),
                document_status="active",
                processing_status="pending",
            )
            db.add(doc)
            await db.commit()
            doc_records[filename] = document_id

        # Run ingestion synchronously for seeding
        print(f"Indexing: {filename}...")
        await process_document_task(document_id, str(dest_path), filename)

    # Pre-seed verified enterprise conflict records for audit trail
    async with AsyncSessionLocal() as db:
        if "IT_Access_Policy_v1.txt" in doc_records and "IT_Access_Policy_v2.html" in doc_records:
            conf1 = ConflictRecord(
                id=str(uuid.uuid4()),
                conflict_type="version",
                topic="Password Rotation Frequency",
                doc_id_a=doc_records["IT_Access_Policy_v1.txt"],
                doc_id_b=doc_records["IT_Access_Policy_v2.html"],
                statement_a="All passwords must be changed every 90 days. Failure to comply will result in automatic account lockout.",
                statement_b="All employee passwords must be changed every 180 days. The system will prompt users automatically when rotation is due.",
                severity="high",
                resolution_status="unresolved",
                resolution_note="Conflict between older v1.0 and current v2.1. Version and effective dates should be verified.",
            )
            db.add(conf1)

        if "HR_Policy_v2.md" in doc_records and "Engineering_Team_Policy.md" in doc_records:
            conf2 = ConflictRecord(
                id=str(uuid.uuid4()),
                conflict_type="team",
                topic="Remote Work Entitlement",
                doc_id_a=doc_records["HR_Policy_v2.md"],
                doc_id_b=doc_records["Engineering_Team_Policy.md"],
                statement_a="Employees are permitted to work remotely up to 3 days per week, subject to business requirements and manager approval.",
                statement_b="Engineering team members are permitted to work remotely up to 2 days per week. Mandatory on-site days are Tuesdays and Thursdays.",
                severity="medium",
                resolution_status="clarified",
                resolution_note="Contextual variation: Engineering department specific constraint to ensure sprint collaboration.",
            )
            db.add(conf2)

        await db.commit()

    print("Sample enterprise documents successfully seeded and indexed!")

if __name__ == "__main__":
    asyncio.run(seed_samples())

