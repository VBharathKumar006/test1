import React, { useState } from 'react';
import {
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FileType,
  ArrowRight,
  FileText,
  X,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { uploadDocument } from '../services/api';

export const UploadPage: React.FC<{ onUploadSuccess: () => void }> = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [department, setDepartment] = useState('HR');
  const [team, setTeam] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [accessScope, setAccessScope] = useState('internal');

  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{ name: string; success: boolean; message: string }>>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return;

    setUploading(true);
    setUploadResults([]);
    const results: Array<{ name: string; success: boolean; message: string }> = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('department', department);
      if (team) formData.append('team', team);
      formData.append('document_version', version);
      formData.append('effective_date', effectiveDate);
      formData.append('access_scope', accessScope);

      try {
        await uploadDocument(formData);
        results.push({
          name: file.name,
          success: true,
          message: 'Ingestion verified. Chunks generated and committed to vector index.',
        });
      } catch (err: any) {
        const errorDetail = err.response?.data?.detail || err.message || 'Upload failed.';
        results.push({
          name: file.name,
          success: false,
          message: errorDetail,
        });
      }
    }

    setUploadResults(results);
    setUploading(false);
    setSelectedFiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-app-border pb-5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Bring your enterprise knowledge together.
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload PDF, HTML, Markdown and TXT documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Drag & Drop Zone (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all flex flex-col items-center justify-center min-h-[260px] ${
              dragActive
                ? 'border-brand-primary bg-brand-primary/10 shadow-glow-primary'
                : 'border-app-border bg-app-surface hover:border-brand-primary/40'
            }`}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.html,.htm,.md,.markdown,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />

            <div className="h-12 w-12 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary flex items-center justify-center mb-4">
              <UploadCloud className="h-6 w-6" />
            </div>

            <h3 className="text-sm font-semibold text-white">
              Drop files here or click to browse
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Supports PDF, HTML, Markdown (.md), and TXT files up to 25MB.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-status-errorBg text-status-error border border-status-error/30">
                .pdf
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-status-warningBg text-status-warning border border-status-warning/30">
                .html
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-brand-primary/15 text-brand-highlight border border-brand-primary/30">
                .md
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-app-surface2 text-slate-300 border border-app-border">
                .txt
              </span>
            </div>
          </div>

          {/* Selected Files Staging List */}
          {selectedFiles.length > 0 && (
            <div className="rounded-xl bg-app-surface border border-app-border p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>Staged for Ingestion ({selectedFiles.length})</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="divide-y divide-app-borderSubtle max-h-48 overflow-y-auto">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
                      <span className="text-slate-200 truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      disabled={uploading}
                      className="text-slate-400 hover:text-status-error p-1 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Feedback */}
          {uploadResults.length > 0 && (
            <div className="rounded-xl bg-app-surface border border-app-border p-4 space-y-2.5">
              <div className="text-xs font-semibold text-white">Ingestion Results</div>
              <div className="space-y-1.5">
                {uploadResults.map((res, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
                      res.success
                        ? 'bg-status-successBg border-status-success/30 text-status-success'
                        : 'bg-status-errorBg border-status-error/30 text-status-error'
                    }`}
                  >
                    {res.success ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{res.name}</div>
                      <div className="text-[11px] opacity-90 mt-0.5">{res.message}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={onUploadSuccess}
                className="w-full mt-2 py-2 rounded-lg bg-app-surface2 hover:bg-app-elevated border border-app-border text-xs text-slate-200 font-medium transition-colors"
              >
                Go to Document Library
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Metadata Form (5 cols) */}
        <div className="md:col-span-5 space-y-5">
          <div className="rounded-2xl bg-app-surface border border-app-border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Enterprise Metadata</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Attach governance attributes to preserve provenance during RAG retrieval
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-slate-200 focus:outline-none focus:border-brand-primary/50"
                >
                  <option value="HR">Human Resources (HR)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="Finance">Finance & Billing</option>
                  <option value="Engineering">Engineering & DevOps</option>
                  <option value="Sales">Sales & Operations</option>
                  <option value="Legal">Legal & Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Team (Optional)
                </label>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. Infrastructure, Backend, Security"
                  className="w-full px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-primary/50"
                >
                </input>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v1.0"
                    className="w-full px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-primary/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-slate-200 focus:outline-none focus:border-brand-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Access Scope
                </label>
                <select
                  value={accessScope}
                  onChange={(e) => setAccessScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-app-surface2 border border-app-border text-slate-200 focus:outline-none focus:border-brand-primary/50"
                >
                  <option value="internal">Internal (All Employees)</option>
                  <option value="restricted">Restricted (Department Only)</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-glow-subtle"
            >
              {uploading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Chunking & Indexing...</span>
                </>
              ) : (
                <>
                  <span>Ingest {selectedFiles.length > 0 ? `${selectedFiles.length} Document(s)` : 'Documents'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Ingestion Steps Explainer */}
          <div className="rounded-xl bg-app-surface/60 border border-app-border p-4 space-y-2.5 text-xs">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Pipeline Guarantees
            </div>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                <span>Deterministic Heading-Aware Chunking</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                <span>Dual FAISS Vector + BM25Okapi Indexing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                <span>Strict Provenance Metadata Persistence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
