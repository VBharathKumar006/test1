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
  Clock,
  UploadCloud,
  FileCode,
  FileSpreadsheet,
  FileType
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
    if (!window.confirm(`Delete "${name}" and remove all indexed vector embeddings?`)) return;
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

  const indexedCount = documents.filter((d) => d.processing_status === 'indexed').length;
  const processingCount = documents.filter((d) => d.processing_status === 'processing').length;
  const failedCount = documents.filter((d) => d.processing_status === 'failed').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Knowledge Library
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and explore your indexed enterprise knowledge repository.
          </p>
        </div>

        <button
          onClick={loadDocuments}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-app-surface hover:bg-app-surface2 border border-app-border text-xs font-medium text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
          <span>Refresh Library</span>
        </button>
      </div>

      {/* Top 4 KPI Metric Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-slate-400 font-medium">Total Documents</div>
          <div className="text-2xl font-semibold text-white mt-1">{total}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-status-success font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            Indexed
          </div>
          <div className="text-2xl font-semibold text-white mt-1">{indexedCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-brand-highlight font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-primary" />
            Processing
          </div>
          <div className="text-2xl font-semibold text-white mt-1">{processingCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-status-error font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-error" />
            Failed
          </div>
          <div className="text-2xl font-semibold text-white mt-1">{failedCount}</div>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="p-4 rounded-xl bg-app-surface border border-app-border flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, title, department..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-app-surface2 border border-app-border text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-brand-primary/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-xs text-slate-200 focus:outline-none focus:border-brand-primary/50"
          >
            <option value="">All Formats</option>
            <option value="pdf">PDF</option>
            <option value="html">HTML</option>
            <option value="md">Markdown (.md)</option>
            <option value="txt">Text (.txt)</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-xs text-slate-200 focus:outline-none focus:border-brand-primary/50"
          >
            <option value="">All Departments</option>
            <option value="HR">Human Resources</option>
            <option value="IT">IT Security</option>
            <option value="Finance">Finance</option>
            <option value="Engineering">Engineering</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-xs text-slate-200 focus:outline-none focus:border-brand-primary/50"
          >
            <option value="">All Statuses</option>
            <option value="indexed">Indexed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl bg-app-surface border border-app-border overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-app-border bg-app-surface2/40 text-slate-400 text-[11px] font-medium">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-3">Format</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Team</th>
                <th className="py-3 px-3">Version</th>
                <th className="py-3 px-3">Uploaded</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-borderSubtle">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-app-surface2/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-app-surface2 border border-app-border text-brand-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-200 truncate max-w-[240px]" title={doc.filename}>
                            {doc.filename}
                          </span>
                          {doc.document_title && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[240px]">
                              {doc.document_title}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          doc.file_type === 'pdf'
                            ? 'bg-status-errorBg text-status-error border-status-error/30'
                            : doc.file_type === 'html'
                            ? 'bg-status-warningBg text-status-warning border-status-warning/30'
                            : doc.file_type === 'md'
                            ? 'bg-brand-primary/15 text-brand-highlight border-brand-primary/30'
                            : 'bg-app-surface2 text-slate-300 border-app-border'
                        }`}
                      >
                        {doc.file_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-300">{doc.department || '—'}</td>
                    <td className="py-3.5 px-3 text-slate-400">{doc.team || '—'}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">{doc.document_version || 'v1.0'}</td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {doc.upload_timestamp ? new Date(doc.upload_timestamp).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                          doc.processing_status === 'indexed'
                            ? 'bg-status-successBg text-status-success border border-status-success/30'
                            : doc.processing_status === 'processing'
                            ? 'bg-brand-primary/15 text-brand-highlight border border-brand-primary/30 animate-pulse'
                            : 'bg-status-errorBg text-status-error border border-status-error/30'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            doc.processing_status === 'indexed'
                              ? 'bg-status-success'
                              : doc.processing_status === 'processing'
                              ? 'bg-brand-primary'
                              : 'bg-status-error'
                          }`}
                        />
                        {doc.processing_status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="p-1.5 rounded-lg hover:bg-app-surface2 text-slate-400 hover:text-white transition-colors"
                          title="Inspect chunks"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReindex(doc.id)}
                          className="p-1.5 rounded-lg hover:bg-app-surface2 text-slate-400 hover:text-brand-highlight transition-colors"
                          title="Re-index document"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="p-1.5 rounded-lg hover:bg-app-surface2 text-slate-400 hover:text-status-error transition-colors"
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
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    {loading ? 'Loading documents...' : 'No documents matched your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chunks Inspection Slide-Over / Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-elevated overflow-hidden">
            <div className="p-5 border-b border-app-border flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-brand-highlight uppercase tracking-wider">
                  Document Chunks Inspection
                </div>
                <h3 className="text-base font-semibold text-white mt-0.5">
                  {selectedDoc.filename} ({chunks.length} chunks)
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg hover:bg-app-surface2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingChunks ? (
                <div className="py-12 text-center text-slate-400 text-xs font-mono">
                  Loading structure-aware chunks...
                </div>
              ) : chunks.length > 0 ? (
                chunks.map((chk, idx) => (
                  <div
                    key={chk.id || idx}
                    className="p-3.5 rounded-xl bg-app-surface2 border border-app-border text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-app-borderSubtle pb-2">
                      <span className="text-brand-highlight font-semibold">
                        Chunk #{chk.chunk_index}
                      </span>
                      {chk.section_title && (
                        <span className="truncate max-w-[300px] text-slate-300">
                          § {chk.section_title}
                        </span>
                      )}
                      {chk.page_number && (
                        <span className="px-1.5 py-0.2 rounded bg-app-elevated text-slate-300">
                          p. {chk.page_number}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 leading-relaxed font-sans">{chk.original_text}</p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No chunks generated for this document.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-app-border bg-app-surface flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-lg bg-app-surface2 hover:bg-app-elevated border border-app-border text-xs text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
