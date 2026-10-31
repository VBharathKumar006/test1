import React, { useEffect, useState } from 'react';
import {
  FileText,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  FileType,
  Flame,
  ShieldAlert
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
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-accent-orange font-bold">
              Team Doomsday // Command Center
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">Doomsday Enterprise Telemetry</h2>
          <p className="text-xs text-neutral-400">
            Real-time status of document ingestion, hybrid vector indices, and policy contradiction detectors
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-dark-850 hover:bg-neutral-800 border border-dark-800 text-xs font-mono font-semibold text-neutral-200 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent-orange' : ''}`} />
          SYNC TELEMETRY
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="p-4 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 font-semibold uppercase tracking-wider">Total Documents</span>
            <div className="text-3xl font-black text-white">{stats?.total_documents ?? 0}</div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
              <span className="text-accent-orange font-bold">{stats?.indexed_documents ?? 0} INDEXED</span>
              {stats?.failed_documents ? (
                <span className="text-accent-red flex items-center gap-1">
                  / {stats.failed_documents} FAILED
                </span>
              ) : null}
            </div>
          </div>
          <div className="p-3 rounded bg-black border border-dark-800 text-accent-orange">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Total Chunks */}
        <div className="p-4 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 font-semibold uppercase tracking-wider">Vector Chunks</span>
            <div className="text-3xl font-black text-white">{stats?.total_chunks ?? 0}</div>
            <div className="text-[11px] font-mono text-neutral-500">HEADING-AWARE SPLIT</div>
          </div>
          <div className="p-3 rounded bg-black border border-dark-800 text-white">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Detected Conflicts */}
        <div className="p-4 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 font-semibold uppercase tracking-wider">Policy Conflicts</span>
            <div className="text-3xl font-black text-accent-red">{stats?.detected_conflicts ?? 0}</div>
            <div className="text-[11px] font-mono text-accent-red/90 font-semibold">VERSION & SCOPE CONFLICTS</div>
          </div>
          <div className="p-3 rounded bg-accent-red/10 border border-accent-red/30 text-accent-red">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Avg Latency */}
        <div className="p-4 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-neutral-400 font-semibold uppercase tracking-wider">Retrieval Latency</span>
            <div className="text-3xl font-black text-accent-orange">
              {stats?.avg_retrieval_latency_ms ? `${stats.avg_retrieval_latency_ms}` : '320'} <span className="text-sm font-mono text-neutral-400">ms</span>
            </div>
            <div className="text-[11px] font-mono text-neutral-500">RRF FUSION + RERANK</div>
          </div>
          <div className="p-3 rounded bg-black border border-dark-800 text-accent-orange">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Two columns: Supported Formats & Pipeline Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formats Card */}
        <div className="p-5 rounded-lg bg-dark-900 border border-dark-800 space-y-4">
          <div className="border-b border-dark-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <FileType className="h-4 w-4 text-accent-orange" />
              Supported Formats (FR-01)
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1">
              Deterministic parsing preserving heading hierarchies & page references
            </p>
          </div>

          <div className="space-y-2">
            {[
              { ext: 'PDF', name: 'Document Manuals', parser: 'pdfplumber / PyMuPDF', badge: 'Page Citations' },
              { ext: 'HTML', name: 'Web Portals & Guides', parser: 'BeautifulSoup4 + LXML', badge: 'Tags Sanitized' },
              { ext: 'MD', name: 'Markdown Handbooks', parser: 'Heading Hierarchy Engine', badge: 'H1-H6 Tree' },
              { ext: 'TXT', name: 'Plain Text Policies', parser: 'Section Heuristic Extractor', badge: 'Normalized' },
            ].map((f) => (
              <div key={f.ext} className="p-2.5 rounded bg-black/60 border border-dark-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-accent-orange border border-neutral-700">
                      .{f.ext.toLowerCase()}
                    </span>
                    <span className="text-xs font-bold text-neutral-200 uppercase">{f.name}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{f.parser}</div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-dark-800">
                  {f.badge}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('upload')}
            className="w-full mt-2 py-2.5 rounded bg-accent-orange hover:bg-accent-orange-hover text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-accent-orange/20"
          >
            Upload Enterprise Documents
            <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Recent Ingestion Table */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-dark-900 border border-dark-800 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent-orange" />
                Indexed Repository Corpus
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Doomsday Enterprise policy documents and manuals
              </p>
            </div>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-mono font-bold uppercase text-accent-orange hover:underline flex items-center gap-1"
            >
              Full Library <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {stats?.recent_uploads && stats.recent_uploads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="border-b border-dark-800 text-neutral-500 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="pb-2">Document</th>
                    <th className="pb-2">Dept</th>
                    <th className="pb-2">Version</th>
                    <th className="pb-2">Chunks</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800/60 font-mono">
                  {stats.recent_uploads.map((doc) => (
                    <tr key={doc.id} className="hover:bg-dark-850 transition-colors">
                      <td className="py-2.5 font-sans font-semibold text-neutral-100 flex items-center gap-2">
                        <span className="uppercase text-[9px] font-mono px-1 py-0.2 rounded bg-black text-accent-orange border border-neutral-700">
                          {doc.file_type}
                        </span>
                        <span className="truncate max-w-[220px]" title={doc.filename}>{doc.filename}</span>
                      </td>
                      <td className="py-2.5 text-neutral-400">{doc.department || '—'}</td>
                      <td className="py-2.5 text-accent-orange font-bold">{doc.document_version || 'v1.0'}</td>
                      <td className="py-2.5">{doc.chunk_count}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          doc.processing_status === 'indexed'
                            ? 'bg-black text-white border-neutral-700'
                            : doc.processing_status === 'processing'
                            ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/30 animate-pulse'
                            : 'bg-accent-red/10 text-accent-red border-accent-red/30'
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
            <div className="py-12 text-center text-neutral-500 text-xs font-mono">
              No documents indexed. Ingest policies from <span className="text-accent-orange underline cursor-pointer" onClick={() => onNavigate('upload')}>Upload</span> to initialize the repository.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
