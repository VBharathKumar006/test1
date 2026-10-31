"""
Document ingestion service: multi-format parsing + metadata extraction.
Supports PDF, HTML, Markdown, TXT.
"""
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class ParsedDocument:
    """Result of parsing a document file."""
    raw_text: str
    document_title: Optional[str]
    sections: List[Dict[str, Any]]   # [{heading, level, text, page}]
    metadata: Dict[str, Any]
    file_type: str
    page_count: Optional[int] = None
    extraction_warnings: List[str] = field(default_factory=list)
    injection_detected: bool = False
    injection_patterns: List[str] = field(default_factory=list)


class PDFParser:
    """Extract text and structure from PDF files using pdfplumber."""

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        import pdfplumber
        import io

        sections = []
        full_text_parts = []
        warnings = []
        title = None
        page_count = 0

        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                page_count = len(pdf.pages)

                # Try to get title from metadata
                if pdf.metadata:
                    title = pdf.metadata.get("Title") or pdf.metadata.get("title")
                    if title:
                        title = title.strip()

                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        text = page.extract_text(x_tolerance=3, y_tolerance=3)
                        if not text:
                            warnings.append(f"Page {page_num}: no text extracted (may be scanned/image).")
                            continue

                        text = text.strip()
                        full_text_parts.append(text)

                        # Heuristic: lines in ALL CAPS or ending with specific patterns = headings
                        lines = text.split("\n")
                        current_heading = None
                        current_text_lines = []

                        for line in lines:
                            stripped = line.strip()
                            if not stripped:
                                continue
                            if self._is_heading(stripped):
                                # Save previous section
                                if current_heading and current_text_lines:
                                    sections.append({
                                        "heading": current_heading,
                                        "level": 1,
                                        "text": "\n".join(current_text_lines),
                                        "page": page_num,
                                    })
                                current_heading = stripped
                                current_text_lines = []
                            else:
                                current_text_lines.append(stripped)

                        # Save last section on page
                        if current_heading and current_text_lines:
                            sections.append({
                                "heading": current_heading,
                                "level": 1,
                                "text": "\n".join(current_text_lines),
                                "page": page_num,
                            })
                        elif current_text_lines:
                            sections.append({
                                "heading": None,
                                "level": 0,
                                "text": "\n".join(current_text_lines),
                                "page": page_num,
                            })

                    except Exception as e:
                        warnings.append(f"Page {page_num}: extraction error: {str(e)}")

        except Exception as e:
            raise ValueError(f"PDF parsing failed: {str(e)}")

        raw_text = "\n\n".join(full_text_parts)
        if not title:
            title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        return ParsedDocument(
            raw_text=raw_text,
            document_title=title,
            sections=sections,
            metadata={"page_count": page_count},
            file_type="pdf",
            page_count=page_count,
            extraction_warnings=warnings,
        )

    def _is_heading(self, line: str) -> bool:
        """Heuristic: detect PDF headings."""
        if len(line) > 120:
            return False
        # Numbered section: "1.", "1.1", "2.3.1"
        if re.match(r'^\d+(\.\d+)*\.?\s+\w', line):
            return True
        # All caps short line
        if line.isupper() and 3 < len(line) < 80:
            return True
        # Starts with Roman numeral
        if re.match(r'^(I{1,3}V?|IV|VI{0,3}|IX|X{1,3})\.\s', line):
            return True
        return False


class HTMLParser:
    """Extract text and structure from HTML files using BeautifulSoup."""

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        from bs4 import BeautifulSoup
        from app.services.security.security_service import sanitize_html

        try:
            raw_html = content.decode("utf-8", errors="replace")
        except Exception:
            raw_html = content.decode("latin-1", errors="replace")

        # Sanitize BEFORE parsing content
        sanitized_html = sanitize_html(raw_html)
        soup = BeautifulSoup(sanitized_html, "lxml")

        # Extract title
        title = None
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(strip=True)
        h1 = soup.find("h1")
        if not title and h1:
            title = h1.get_text(strip=True)
        if not title:
            title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        # Extract sections based on heading tags
        sections = []
        heading_tags = ["h1", "h2", "h3", "h4", "h5", "h6"]
        body = soup.find("body") or soup
        elements = list(body.descendants)

        current_heading = None
        current_level = 0
        current_text_parts = []

        for el in body.children:
            tag_name = getattr(el, "name", None)
            if not tag_name:
                continue
            if tag_name in heading_tags:
                # Flush previous section
                if current_text_parts:
                    sections.append({
                        "heading": current_heading,
                        "level": current_level,
                        "text": " ".join(current_text_parts),
                        "page": None,
                    })
                current_heading = el.get_text(strip=True)
                current_level = int(tag_name[1])
                current_text_parts = []
            else:
                text = el.get_text(separator=" ", strip=True)
                if text:
                    current_text_parts.append(text)

        if current_text_parts:
            sections.append({
                "heading": current_heading,
                "level": current_level,
                "text": " ".join(current_text_parts),
                "page": None,
            })

        raw_text = soup.get_text(separator="\n", strip=True)

        return ParsedDocument(
            raw_text=raw_text,
            document_title=title,
            sections=sections,
            metadata={},
            file_type="html",
        )


class MarkdownParser:
    """Extract text and structure from Markdown files."""

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        try:
            text = content.decode("utf-8", errors="replace")
        except Exception:
            text = content.decode("latin-1", errors="replace")

        sections = []
        current_heading = None
        current_level = 0
        current_lines = []
        title = None

        heading_re = re.compile(r'^(#{1,6})\s+(.+)$')

        for line in text.split("\n"):
            m = heading_re.match(line)
            if m:
                level = len(m.group(1))
                heading_text = m.group(2).strip()

                # First H1 is document title
                if level == 1 and title is None:
                    title = heading_text

                # Flush previous section
                if current_lines:
                    sections.append({
                        "heading": current_heading,
                        "level": current_level,
                        "text": "\n".join(current_lines).strip(),
                        "page": None,
                    })
                current_heading = heading_text
                current_level = level
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            sections.append({
                "heading": current_heading,
                "level": current_level,
                "text": "\n".join(current_lines).strip(),
                "page": None,
            })

        if not title:
            title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        # Strip markdown syntax from raw_text
        raw_text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        raw_text = re.sub(r'\*\*(.+?)\*\*', r'\1', raw_text)
        raw_text = re.sub(r'\*(.+?)\*', r'\1', raw_text)
        raw_text = re.sub(r'`(.+?)`', r'\1', raw_text)
        raw_text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', raw_text)

        return ParsedDocument(
            raw_text=raw_text,
            document_title=title,
            sections=sections,
            metadata={},
            file_type="md",
        )


class TXTParser:
    """Extract text and structure from plain text files."""

    def parse(self, content: bytes, filename: str) -> ParsedDocument:
        try:
            text = content.decode("utf-8", errors="replace")
        except Exception:
            text = content.decode("latin-1", errors="replace")

        sections = []
        current_heading = None
        current_lines = []
        title = None

        lines = text.split("\n")

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue

            # Heuristic heading detection for TXT files
            if self._is_txt_heading(stripped, i, lines):
                if current_lines:
                    sections.append({
                        "heading": current_heading,
                        "level": 1,
                        "text": "\n".join(current_lines).strip(),
                        "page": None,
                    })
                if title is None:
                    title = stripped
                current_heading = stripped
                current_lines = []
            else:
                current_lines.append(stripped)

        if current_lines:
            sections.append({
                "heading": current_heading,
                "level": 1,
                "text": "\n".join(current_lines).strip(),
                "page": None,
            })

        if not title:
            title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        return ParsedDocument(
            raw_text=text,
            document_title=title,
            sections=sections,
            metadata={},
            file_type="txt",
        )

    def _is_txt_heading(self, line: str, idx: int, all_lines: list) -> bool:
        """Heuristic heading detection for plain text."""
        # Very short line (< 80 chars) with no period at end
        if len(line) < 80 and not line.endswith('.') and not line.endswith(','):
            # Followed by a blank line or underline
            if idx + 1 < len(all_lines):
                next_line = all_lines[idx + 1].strip()
                if next_line == "" or re.match(r'^[-=]{3,}$', next_line):
                    return True
            # ALL CAPS
            if line.isupper() and len(line) > 3:
                return True
            # Numbered section
            if re.match(r'^\d+\.\s+\w', line):
                return True
        return False


class DocumentIngestionService:
    """Orchestrates document parsing, security scanning and metadata extraction."""

    PARSERS = {
        "pdf": PDFParser(),
        "html": HTMLParser(),
        "htm": HTMLParser(),
        "md": MarkdownParser(),
        "txt": TXTParser(),
    }

    def detect_format(self, filename: str) -> str:
        suffix = Path(filename).suffix.lower().lstrip(".")
        return suffix if suffix in self.PARSERS else "unknown"

    def parse_document(self, content: bytes, filename: str) -> ParsedDocument:
        """Parse a document and scan for injection patterns."""
        from app.services.security.security_service import detect_injection_in_text

        fmt = self.detect_format(filename)
        if fmt == "unknown":
            raise ValueError(f"Unsupported file format for '{filename}'.")

        parser = self.PARSERS[fmt]
        parsed = parser.parse(content, filename)

        # Security scan on extracted text
        has_injection, patterns = detect_injection_in_text(parsed.raw_text)
        if has_injection:
            logger.warning(
                f"SECURITY: Injection patterns detected in '{filename}': {patterns}"
            )
            parsed.injection_detected = True
            parsed.injection_patterns = patterns

        return parsed

    def extract_enterprise_metadata(self, parsed: ParsedDocument, filename: str) -> dict:
        """
        Attempt to extract enterprise metadata from document content.
        Only sets fields when evidence is found — never fabricates.
        """
        text = parsed.raw_text

        metadata = {
            "document_title": parsed.document_title,
            "file_type": parsed.file_type,
            "department": None,
            "team": None,
            "document_category": None,
            "document_version": None,
            "effective_date": None,
            "expiration_date": None,
            "access_scope": "internal",
            "document_status": "active",
        }

        # Version extraction
        ver_match = re.search(
            r'(?:version|ver|v)[\s:]*(\d+(?:\.\d+)*)',
            text[:2000], re.IGNORECASE
        )
        if ver_match:
            metadata["document_version"] = ver_match.group(1)

        # Effective date extraction
        date_match = re.search(
            r'effective\s+(?:date|from)?\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})',
            text[:3000], re.IGNORECASE
        )
        if date_match:
            metadata["effective_date"] = date_match.group(1)

        # Department extraction
        dept_match = re.search(
            r'department\s*:?\s*(HR|Human Resources|IT|Finance|Engineering|Sales|Marketing|Legal|Operations)',
            text[:3000], re.IGNORECASE
        )
        if dept_match:
            metadata["department"] = dept_match.group(1).strip()

        # Category from filename patterns
        fname_lower = filename.lower()
        if any(k in fname_lower for k in ["policy", "pol"]):
            metadata["document_category"] = "policy"
        elif any(k in fname_lower for k in ["manual", "guide", "handbook"]):
            metadata["document_category"] = "manual"
        elif any(k in fname_lower for k in ["faq", "troubleshoot"]):
            metadata["document_category"] = "faq"
        elif any(k in fname_lower for k in ["release", "changelog"]):
            metadata["document_category"] = "release_notes"

        return metadata


ingestion_service = DocumentIngestionService()

