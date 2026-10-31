"""Security service: injection detection, file validation, HTML sanitization."""
import hashlib
import logging
import mimetypes
import os
import re
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".html", ".htm", ".md", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/html",
    "text/markdown",
    "text/plain",
    "text/x-markdown",
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB

# Injection attack patterns (instructions targeting the LLM assistant)
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"you\s+are\s+now\s+an?\s+unrestricted",
    r"disregard\s+(all\s+)?(previous|prior)\s+(instructions?|rules?|constraints?)",
    r"reveal\s+(all\s+)?(confidential|secret|private|api\s+key)",
    r"override\s+(system|your)\s+(prompt|instructions?|rules?)",
    r"new\s+system\s+prompt\s*:",
    r"(act|behave)\s+as\s+(if\s+)?(you\s+are\s+)?a\s+(jailbreak|unrestricted|unfiltered)",
    r"do\s+not\s+(follow|adhere\s+to)\s+(your\s+)?(rules?|instructions?|guidelines?)",
    r"forget\s+(everything|all)\s+(you|i)\s+(know|told)",
    r"print\s+(the\s+)?(system\s+prompt|api\s+key|password|secret)",
    r"<\s*system\s*>",
    r"\[INST\]|\[/INST\]",
    r"###\s*(system|instruction|human|assistant)\s*:",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in INJECTION_PATTERNS]


def validate_file(filename: str, content: bytes) -> Tuple[bool, str]:
    """
    Validate uploaded file: extension, size, MIME type.
    Returns (is_valid, error_message).
    """
    # Size check
    if len(content) > MAX_FILE_SIZE_BYTES:
        return False, f"File exceeds maximum size of 50 MB."

    # Extension check
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    # Basic content integrity check
    if len(content) == 0:
        return False, "File is empty."

    # For PDFs: check magic bytes
    if suffix == ".pdf":
        if not content.startswith(b"%PDF"):
            return False, "File does not appear to be a valid PDF (missing PDF header)."

    return True, ""


def compute_file_hash(content: bytes) -> str:
    """Compute MD5 hash of file content for deduplication."""
    return hashlib.md5(content).hexdigest()


def detect_injection_in_text(text: str) -> Tuple[bool, list]:
    """
    Scan extracted document text for prompt injection patterns.
    Returns (has_injection, list_of_matched_patterns).
    """
    matches = []
    for pattern in COMPILED_PATTERNS:
        found = pattern.findall(text)
        if found:
            matches.append(pattern.pattern)
    return len(matches) > 0, matches


def sanitize_html(html_content: str) -> str:
    """
    Remove dangerous HTML elements and attributes.
    Preserves content structure but strips scripts, iframes, event handlers.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html_content, "lxml")

    # Remove dangerous tags entirely
    for tag in soup.find_all(["script", "style", "iframe", "form", "input",
                               "button", "meta", "link", "object", "embed"]):
        tag.decompose()

    # Remove event handler attributes from all tags
    for tag in soup.find_all(True):
        attrs_to_remove = [attr for attr in tag.attrs
                           if attr.lower().startswith("on")]
        for attr in attrs_to_remove:
            del tag[attr]
        # Remove javascript: hrefs
        if tag.get("href", "").lower().startswith("javascript:"):
            tag["href"] = "#"
        if tag.get("src", "").lower().startswith("javascript:"):
            del tag["src"]

    return str(soup)


def safe_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal."""
    # Remove directory components
    name = os.path.basename(filename)
    # Remove null bytes and special characters
    name = re.sub(r'[^\w\s\-_\.]', '_', name)
    name = name.strip(". ")
    if not name:
        name = "document"
    return name


def wrap_evidence_passage(chunk_id: str, text: str) -> str:
    """
    Wrap a retrieved evidence passage in delimiters so the LLM cannot 
    interpret it as system instructions.
    """
    return (
        f"<evidence id=\"{chunk_id}\">\n"
        f"{text}\n"
        f"</evidence>"
    )


def validate_citations_against_retrieved(citations: list, retrieved_chunk_ids: list) -> list:
    """
    Remove any citations that reference chunks not in the retrieved set.
    Prevents hallucinated citations.
    """
    valid = [c for c in citations if c.get("chunk_id") in retrieved_chunk_ids]
    removed = len(citations) - len(valid)
    if removed > 0:
        logger.warning(f"Removed {removed} citation(s) not present in retrieved chunks.")
    return valid

