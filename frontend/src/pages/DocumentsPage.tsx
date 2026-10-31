import React, { useEffect, useState } from 'react';
import {
  FileText,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { fetchDocuments, deleteDocument, reindexDocument, fetchDocumentChunks } from '../services/api';
import { DocumentItem, DocumentChunk } from '../types';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Chunks Modal State
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await fetchDocuments({
        department: deptFilter || undefined,
        status: statusFilter || undefined,
        file_type: typeFilter || undefined,
      });
      setDocuments(data.documents);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [deptFilter, statusFilter, typeFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and purge all vector embeddings?`)) return;
    try {
      await deleteDocument(id);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  const handleReindex = async (id: string) => {
    try {
      await reindexDocument(id);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to reindex doc:', err);
    }
  };

  const handleInspectChunks = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const data = await fetchDocumentChunks(doc.id);
      setChunks(data);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(search.toLowerCase()) ||
    (doc.department && doc.department.toLowerCase().includes(search.toLowerCase())) ||
    (doc.document_title && doc.document_title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 font-sans">
      {/* Title & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-800 pb-4">
        <div>
          <div className="text-[11px] font-mono text-accent-orange font-bold uppercase tracking-wider mb-1">
            Repository Management // FR-01
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Doomsday Document Library</h2>
          <p className="text-xs text-neutral-400">
            Multi-format policy repository, version index tracking, and vector partitions
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or department..."
              className="pl-9 pr-3 py-1.5 rounded bg-dark-900 border border-dark-800 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-accent-orange w-64 font-mono"
            />
          </div>
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="p-2 rounded bg-dark-850 hover:bg-neutral-800 border border-dark-800 text-neutral-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-accent-orange' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-dark-900 p-3 rounded border border-dark-800">
        <span className="text-neutral-400 font-mono font-bold flex items-center gap-1.5 uppercase text-[11px]">
          <Filter className="h-3.5 w-3.5 text-accent-orange" />
          Filter:
        </span>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-black border border-dark-800 rounded px-2.5 py-1 text-neutral-200 text-xs font-mono focus:outline-none focus:border-accent-orange"
        >
          <option value="">ALL DEPARTMENTS</option>
          <option value="HR">HR / Human Resources</option>
          <option value="IT">IT & Security</option>
          <option value="Finance">Finance</option>
          <option value="Engineering">Engineering</option>
          <option value="Sales">Sales</option>
        </select>

        {/* Format Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-black border border-dark-800 rounded px-2.5 py-1 text-neutral-200 text-xs font-mono focus:outline-none focus:border-accent-orange"
        >
          <option value="">ALL FORMATS</option>
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="md">MARKDOWN (.md)</option>
          <option value="txt">PLAIN TEXT (.txt)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black border border-dark-800 rounded px-2.5 py-1 text-neutral-200 text-xs font-mono focus:outline-none focus:border-accent-orange"
        >
          <option value="">ALL STATUSES</option>
          <option value="indexed">INDEXED</option>
          <option value="processing">PROCESSING</option>
          <option value="failed">FAILED</option>
        </select>

        <span className="ml-auto text-neutral-400 font-mono text-[11px]">
          SHOWING {filteredDocs.length} OF {total} DOCS
        </span>
      </div>

      {/* Documents Table */}
      <div className="rounded bg-dark-900 border border-dark-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-black border-b border-dark-800 text-neutral-400 uppercase text-[10px] tracking-wider font-mono font-bold">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Effective</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/60 font-mono">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-dark-850 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white">{doc.document_title || doc.filename}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{doc.filename}</div>
                    </td>

                    {/* Format */}
                    <td className="py-3 px-4">
                      <span className="uppercase text-[9px] font-mono px-1.5 py-0.5 rounded bg-black text-accent-orange border border-neutral-700 font-bold">
                        {doc.file_type}
                      </span>
                    </td>

                    {/* Dept */}
                    <td className="py-3 px-4 text-neutral-300">{doc.department || '—'}</td>

                    {/* Team */}
                    <td className="py-3 px-4 text-neutral-400">{doc.team || 'All'}</td>

                    {/* Version */}
                    <td className="py-3 px-4 text-accent-orange font-bold">{doc.document_version || 'v1.0'}</td>

                    {/* Date */}
                    <td className="py-3 px-4 text-neutral-400">{doc.effective_date || '—'}</td>

                    {/* Chunks */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-black text-white border border-dark-800 font-bold">
                        {doc.chunk_count}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 border ${
                          doc.processing_status === 'indexed'
                            ? 'bg-black text-white border-neutral-700'
                            : doc.processing_status === 'processing'
                            ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/30 animate-pulse'
                            : 'bg-accent-red/10 text-accent-red border-accent-red/30'
                        }`}
                      >
                        {doc.processing_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                          title="Inspect chunks"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReindex(doc.id)}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-accent-orange transition-colors"
                          title="Re-index document"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-accent-red transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500 font-mono">
                    {loading ? 'SYNCING REPOSITORY...' : 'NO DOCUMENTS MATCH QUERY.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chunks Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-dark-800 flex items-center justify-between bg-black/40">
              <div>
                <h3 className="font-bold text-white text-sm uppercase flex items-center gap-2 font-mono">
                  <Layers className="h-4 w-4 text-accent-orange" />
                  Chunk Decomposition — {selectedDoc.filename}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Heading trace, boundary overlap & isolate metadata
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
              {loadingChunks ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  LOADING PASSAGES...
                </div>
              ) : chunks.length > 0 ? (
                chunks.map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    className="p-3.5 rounded bg-black border border-dark-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded bg-accent-orange text-black flex items-center justify-center font-black text-[10px]">
                          {idx + 1}
                        </span>
                        {chunk.section_title && (
                          <span className="font-bold text-white font-sans">
                            § {chunk.section_title}
                          </span>
                        )}
                        {chunk.page_number && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                            Page {chunk.page_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500">ID: {chunk.id.substring(0, 8)}</span>
                    </div>

                    <p className="text-neutral-200 leading-relaxed font-sans bg-dark-950 p-3 rounded border border-dark-800">
                      {chunk.original_text}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-neutral-500 pt-1">
                      {chunk.document_version && <span>Version: <b className="text-accent-orange">{chunk.document_version}</b></span>}
                      {chunk.effective_date && <span>Effective: <b>{chunk.effective_date}</b></span>}
                      {chunk.department && <span>Dept: <b>{chunk.department}</b></span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  NO CHUNKS RECORDED.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
