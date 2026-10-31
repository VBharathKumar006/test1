from app.services.chunking.chunker import StructureAwareChunker

def test_structure_aware_chunking():
    chunker = StructureAwareChunker(chunk_size=100, chunk_overlap=20)
    sections = [
        {
            "heading": "Remote Work Policy",
            "level": 1,
            "text": "Employees may work remotely 3 days per week with manager approval.",
            "page": 2
        },
        {
            "heading": "Equipment Allowance",
            "level": 1,
            "text": "The company provides a laptop and $500 home office reimbursement.",
            "page": 3
        }
    ]
    doc_meta = {
        "filename": "policy.pdf",
        "document_title": "HR Policy",
        "department": "HR",
        "document_version": "v2.0",
        "effective_date": "2024-01-01"
    }

    chunks = chunker.chunk_document("doc-123", sections, doc_meta, file_type="pdf")
    assert len(chunks) == 2
    assert chunks[0].section_title == "Remote Work Policy"
    assert chunks[0].page_number == 2
    assert chunks[0].department == "HR"
    assert chunks[0].document_version == "v2.0"
    assert "[Section: Remote Work Policy]" in chunks[0].original_text
    assert chunks[1].section_title == "Equipment Allowance"

