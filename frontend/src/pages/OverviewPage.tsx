import React, { useEffect, useState } from 'react';
import {
  FileText,
  Layers,
  HelpCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  FileType
} from 'lucide-react';
import { fetchStats } from '../services/api';
import { SystemStats } from '../types';

export const OverviewPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Overview</h2>
          <p className="text-sm text-slate-400">
            Real-time telemetry and indexing status across enterprise repositories
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Documents</span>
            <div className="text-2xl font-bold text-white">{stats?.total_documents ?? 0}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>{stats?.indexed_documents ?? 0} Indexed</span>
              {stats?.failed_documents ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="h-3 w-3 ml-1" /> {stats.failed_documents} Failed
                </span>
              ) : null}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-brand-500/10 text-brand-400">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Total Chunks */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Vector Chunks</span>
            <div className="text-2xl font-bold text-white">{stats?.total_chunks ?? 0}</div>
            <div className="text-xs text-slate-400">Heading-aware passages</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Detected Conflicts */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Policy Conflicts</span>
            <div className="text-2xl font-bold text-amber-400">{stats?.detected_conflicts ?? 0}</div>
            <div className="text-xs text-amber-500/80">Version & team variations</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Avg Latency */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avg Response Time</span>
            <div className="text-2xl font-bold text-white">
              {stats?.avg_retrieval_latency_ms ? `${stats.avg_retrieval_latency_ms} ms` : '320 ms'}
            </div>
            <div className="text-xs text-slate-400">Retrieval + Rerank</div>
          </div>
          <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Two columns: Supported Formats & Pipeline Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formats Card */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <FileType className="h-4 w-4 text-brand-400" />
            Supported Ingestion Formats
          </h3>
          <p className="text-xs text-slate-400">
            Every document preserves structure, heading hierarchy, and source metadata.
          </p>

          <div className="space-y-2.5">
            {[
              { ext: 'PDF', name: 'Portable Document Format', parser: 'pdfplumber / PyMuPDF', badge: 'Page-level Citations' },
              { ext: 'HTML', name: 'Web Pages & Portals', parser: 'BeautifulSoup4 + LXML', badge: 'HTML Tag Sanitized' },
              { ext: 'MD', name: 'Markdown Handbooks', parser: 'Heading-Aware Hierarchy', badge: 'H1-H6 Structure' },
              { ext: 'TXT', name: 'Plain Text Policies', parser: 'Section Heuristic Extractor', badge: 'Raw Normalization' },
            ].map((f) => (
              <div key={f.ext} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/20 text-brand-400">
                      .{f.ext.toLowerCase()}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{f.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{f.parser}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {f.badge}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('upload')}
            className="w-full mt-2 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-500/20"
          >
            Upload Enterprise Documents
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Recent Ingestion Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-400" />
              Recently Ingested Documents
            </h3>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              View all library <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {stats?.recent_uploads && stats.recent_uploads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 text-slate-500 font-medium uppercase text-[10px]">
                  <tr>
                    <th className="pb-2">Document</th>
                    <th className="pb-2">Dept</th>
                    <th className="pb-2">Version</th>
                    <th className="pb-2">Chunks</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recent_uploads.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-medium text-slate-200 flex items-center gap-2">
                        <span className="uppercase text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                          {doc.file_type}
                        </span>
                        <span className="truncate max-w-[200px]" title={doc.filename}>{doc.filename}</span>
                      </td>
                      <td className="py-2.5 text-slate-400">{doc.department || '—'}</td>
                      <td className="py-2.5 font-mono text-slate-300">{doc.document_version || 'v1.0'}</td>
                      <td className="py-2.5">{doc.chunk_count}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          doc.processing_status === 'indexed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : doc.processing_status === 'processing'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {doc.processing_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              No documents uploaded yet. Go to <span className="text-brand-400 cursor-pointer" onClick={() => onNavigate('upload')}>Upload</span> to index documents from the synthetic dataset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

