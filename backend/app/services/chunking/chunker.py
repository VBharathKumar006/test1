"""
Structure-aware intelligent chunker.
Produces chunks that preserve heading context and document structure.
"""
import re
import logging
import uuid
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)


@dataclass
class DocumentChunkData:
    """A single chunk ready for embedding and indexing."""
    chunk_id: str
    document_id: str
    chunk_index: int
    original_text: str
    cleaned_text: str
    section_title: Optional[str]
    parent_heading: Optional[str]
    page_number: Optional[int]
    source_type: str
    # Inherited from document
    document_title: Optional[str]
    source_filename: str
    department: Optional[str]
    team: Optional[str]
    document_version: Optional[str]
    effective_date: Optional[str]


class StructureAwareChunker:
    """
    Chunks documents by respecting their section/heading structure.
    Falls back to recursive character splitting when sections are too large.
    """

    def __init__(self, chunk_size: int = 700, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(
        self,
        document_id: str,
        sections: List[Dict[str, Any]],
        doc_metadata: Dict[str, Any],
        file_type: str = "txt",
    ) -> List[DocumentChunkData]:
        """
        Convert parsed document sections into chunks.
        Each chunk preserves its heading hierarchy.
        """
        chunks: List[DocumentChunkData] = []
        chunk_index = 0

        for section in sections:
            heading = section.get("heading")
            text = section.get("text", "").strip()
            page = section.get("page")
            level = section.get("level", 0)

            if not text:
                continue

            # Determine parent heading (for nested sections)
            parent = self._find_parent_heading(heading, sections, level)

            # Estimate token count (~4 chars per token)
            estimated_tokens = len(text) // 4

            if estimated_tokens <= self.chunk_size:
                # Section fits in one chunk
                chunk = self._make_chunk(
                    document_id=document_id,
                    chunk_index=chunk_index,
                    text=text,
                    heading=heading,
                    parent_heading=parent,
                    page=page,
                    doc_metadata=doc_metadata,
                    file_type=file_type,
                )
                chunks.append(chunk)
                chunk_index += 1
            else:
                # Section too large: split recursively
                sub_chunks = self._split_large_section(
                    text=text,
                    heading=heading,
                    parent_heading=parent,
                    page=page,
                )
                for sub_text in sub_chunks:
                    chunk = self._make_chunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        text=sub_text,
                        heading=heading,
                        parent_heading=parent,
                        page=page,
                        doc_metadata=doc_metadata,
                        file_type=file_type,
                    )
                    chunks.append(chunk)
                    chunk_index += 1

        logger.info(f"Document {document_id}: generated {len(chunks)} chunks.")
        return chunks

    def _make_chunk(
        self,
        document_id: str,
        chunk_index: int,
        text: str,
        heading: Optional[str],
        parent_heading: Optional[str],
        page: Optional[int],
        doc_metadata: Dict[str, Any],
        file_type: str,
    ) -> DocumentChunkData:
        # Prepend heading context so chunk is self-contained
        context_prefix = ""
        if heading:
            context_prefix = f"[Section: {heading}]\n"
        elif parent_heading:
            context_prefix = f"[Section: {parent_heading}]\n"

        full_text = context_prefix + text

        return DocumentChunkData(
            chunk_id=str(uuid.uuid4()),
            document_id=document_id,
            chunk_index=chunk_index,
            original_text=full_text,
            cleaned_text=full_text,
            section_title=heading,
            parent_heading=parent_heading,
            page_number=page,
            source_type=file_type,
            document_title=doc_metadata.get("document_title"),
            source_filename=doc_metadata.get("filename", ""),
            department=doc_metadata.get("department"),
            team=doc_metadata.get("team"),
            document_version=doc_metadata.get("document_version"),
            effective_date=doc_metadata.get("effective_date"),
        )

    def _split_large_section(
        self,
        text: str,
        heading: Optional[str],
        parent_heading: Optional[str],
        page: Optional[int],
    ) -> List[str]:
        """Split oversized text into overlapping chunks at sentence boundaries."""
        # Split at sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current_tokens = 0
        current_sentences = []

        for sentence in sentences:
            sentence_tokens = len(sentence) // 4

            if current_tokens + sentence_tokens > self.chunk_size and current_sentences:
                chunks.append(" ".join(current_sentences))
                # Overlap: keep last few sentences
                overlap_sentences = []
                overlap_tokens = 0
                for s in reversed(current_sentences):
                    st = len(s) // 4
                    if overlap_tokens + st <= self.chunk_overlap:
                        overlap_sentences.insert(0, s)
                        overlap_tokens += st
                    else:
                        break
                current_sentences = overlap_sentences
                current_tokens = overlap_tokens

            current_sentences.append(sentence)
            current_tokens += sentence_tokens

        if current_sentences:
            chunks.append(" ".join(current_sentences))

        return chunks if chunks else [text]

    def _find_parent_heading(
        self,
        heading: Optional[str],
        all_sections: List[Dict[str, Any]],
        level: int,
    ) -> Optional[str]:
        """Find parent heading of current section based on level."""
        if level <= 1:
            return None
        # Search backwards for a lower-level (higher) heading
        for section in reversed(all_sections):
            if section.get("level", 0) < level and section.get("heading"):
                return section["heading"]
        return None


chunker = StructureAwareChunker()

