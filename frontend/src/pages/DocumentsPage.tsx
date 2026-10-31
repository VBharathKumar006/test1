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
    if (!window.confirm(`Are you sure you want to delete "${name}" and all its vector embeddings?`)) return;
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Document Library</h2>
          <p className="text-sm text-slate-400">
            Enterprise policy corpus, version tags, and vector index health
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents or department..."
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500 w-64"
            />
          </div>
          <button
            onClick={loadDocuments}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        <span className="text-slate-400 font-medium flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-brand-400" />
          Filter:
        </span>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Departments</option>
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
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Formats</option>
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="md">Markdown (.md)</option>
          <option value="txt">Plain Text (.txt)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="indexed">Indexed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>

        <span className="ml-auto text-slate-500">
          Showing {filteredDocs.length} of {total} documents
        </span>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Chunks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100">{doc.document_title || doc.filename}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{doc.filename}</div>
                    </td>

                    {/* Format */}
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {doc.file_type}
                      </span>
                    </td>

                    {/* Dept */}
                    <td className="py-3 px-4 text-slate-300">{doc.department || '—'}</td>

                    {/* Team */}
                    <td className="py-3 px-4 text-slate-400">{doc.team || 'All'}</td>

                    {/* Version */}
                    <td className="py-3 px-4 font-mono text-brand-300">{doc.document_version || 'v1.0'}</td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-400">{doc.effective_date || '—'}</td>

                    {/* Chunks */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium">
                        {doc.chunk_count}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                          doc.processing_status === 'indexed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : doc.processing_status === 'processing'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {doc.processing_status === 'indexed' && <CheckCircle2 className="h-3 w-3" />}
                        {doc.processing_status === 'processing' && <Clock className="h-3 w-3" />}
                        {doc.processing_status === 'failed' && <AlertCircle className="h-3 w-3" />}
                        {doc.processing_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Inspect chunks & metadata"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReindex(doc.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-400 transition-colors"
                          title="Re-index document"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
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
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    {loading ? 'Loading documents...' : 'No documents match the active filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chunks Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand-400" />
                  Chunk Inspection — {selectedDoc.filename}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preserved headings, page references, and isolated chunk context
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingChunks ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Loading passages...
                </div>
              ) : chunks.length > 0 ? (
                chunks.map((chunk, idx) => (
                  <div
                    key={chunk.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        {chunk.section_title && (
                          <span className="font-semibold text-slate-200">
                            § {chunk.section_title}
                          </span>
                        )}
                        {chunk.page_number && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            Page {chunk.page_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">ID: {chunk.id.substring(0, 8)}...</span>
                    </div>

                    <p className="text-slate-300 leading-relaxed font-sans bg-slate-900/50 p-3 rounded-lg border border-slate-800/40">
                      {chunk.original_text}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                      {chunk.document_version && <span>Version: {chunk.document_version}</span>}
                      {chunk.effective_date && <span>Effective: {chunk.effective_date}</span>}
                      {chunk.department && <span>Department: {chunk.department}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No chunks generated for this document.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

