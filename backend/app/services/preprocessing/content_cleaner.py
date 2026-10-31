"""
Content preprocessing: cleaning, normalization, artifact removal.
"""
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class ContentCleaner:
    """Clean and normalize extracted document text."""

    def clean(self, text: str, file_type: str = "txt") -> str:
        """Full cleaning pipeline."""
        text = self._remove_null_bytes(text)
        text = self._normalize_unicode(text)
        text = self._fix_hyphenation(text)
        text = self._remove_repeated_headers_footers(text)
        text = self._normalize_whitespace(text)
        text = self._remove_extraction_artifacts(text)
        return text.strip()

    def _remove_null_bytes(self, text: str) -> str:
        return text.replace('\x00', '').replace('\ufffd', '')

    def _normalize_unicode(self, text: str) -> str:
        import unicodedata
        return unicodedata.normalize("NFKC", text)

    def _fix_hyphenation(self, text: str) -> str:
        """Fix PDF extraction artifact: words broken across lines with hyphen."""
        return re.sub(r'(\w)-\n(\w)', r'\1\2', text)

    def _remove_repeated_headers_footers(self, text: str) -> str:
        """Remove lines that appear 3+ times (likely headers/footers)."""
        lines = text.split('\n')
        line_counts: Dict[str, int] = {}
        for line in lines:
            stripped = line.strip()
            if stripped and len(stripped) > 5:
                line_counts[stripped] = line_counts.get(stripped, 0) + 1

        # Lines appearing 3+ times across whole doc are probably headers/footers
        repeated = {line for line, count in line_counts.items() if count >= 3}
        if repeated:
            filtered = [
                line for line in lines
                if line.strip() not in repeated
            ]
            return '\n'.join(filtered)
        return text

    def _normalize_whitespace(self, text: str) -> str:
        """Collapse multiple blank lines, normalize spaces."""
        # Collapse 3+ consecutive newlines to 2
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove trailing spaces on each line
        text = '\n'.join(line.rstrip() for line in text.split('\n'))
        return text

    def _remove_extraction_artifacts(self, text: str) -> str:
        """Remove common PDF/HTML extraction artifacts."""
        # Page numbers alone on a line: "Page 4" or "4"
        text = re.sub(r'^\s*Page\s+\d+\s*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
        # Long dash separators
        text = re.sub(r'^[-─═]{10,}$', '', text, flags=re.MULTILINE)
        # Excessive dots (table of contents artifacts)
        text = re.sub(r'\.{5,}', '...', text)
        return text

    def clean_section(self, section: Dict[str, Any], file_type: str = "txt") -> Dict[str, Any]:
        """Clean a single section dict in place."""
        cleaned = section.copy()
        if cleaned.get("text"):
            cleaned["text"] = self.clean(cleaned["text"], file_type)
        if cleaned.get("heading"):
            cleaned["heading"] = cleaned["heading"].strip()
        return cleaned


content_cleaner = ContentCleaner()

