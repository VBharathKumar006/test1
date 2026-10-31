import pytest
from app.services.ingestion.document_parser import ingestion_service, PDFParser, HTMLParser, MarkdownParser, TXTParser
from app.services.security.security_service import validate_file

def test_markdown_parser():
    content = """# Company Handbook
## Section 1: Working Hours
Core hours are 10:00 AM to 3:00 PM.
## Section 2: Vacation
Employees get 20 days off.
""".encode('utf-8')
    parsed = ingestion_service.parse_document(content, "handbook.md")
    assert parsed.file_type == "md"
    assert parsed.document_title == "Company Handbook"
    assert len(parsed.sections) == 2
    assert "Working Hours" in parsed.sections[0]["heading"]
    assert "Vacation" in parsed.sections[1]["heading"]

def test_html_parser():
    content = """<!DOCTYPE html>
<html>
<head><title>IT Policy v2.1</title></head>
<body>
<h1>IT Access and Security</h1>
<h2>1. VPN Access</h2>
<p>VPN access requests must be submitted through the portal.</p>
</body>
</html>""".encode('utf-8')
    parsed = ingestion_service.parse_document(content, "it_policy.html")
    assert parsed.file_type == "html"
    assert "IT" in parsed.document_title
    assert len(parsed.sections) >= 1

def test_txt_parser():
    content = """DOOMSDAY ENTERPRISE FINANCE POLICY

1. REIMBURSEMENT LIMITS
Hotel accommodation is capped at $250 per night.

2. FLIGHT GUIDELINES
Economy class for flights under 8 hours.
""".encode('utf-8')
    parsed = ingestion_service.parse_document(content, "finance.txt")
    assert parsed.file_type == "txt"
    assert len(parsed.sections) >= 1

def test_file_validation_unsupported():
    is_valid, msg = validate_file("test.exe", b"binarycontent")
    assert not is_valid
    assert "Unsupported file type" in msg

def test_file_validation_empty():
    is_valid, msg = validate_file("empty.txt", b"")
    assert not is_valid
    assert "File is empty" in msg

