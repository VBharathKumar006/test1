import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  FileType,
  Sparkles,
  ArrowRight
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
          message: 'Queued for background chunking, embedding and indexing.',
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
    onUploadSuccess();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Upload Documents</h2>
        <p className="text-sm text-slate-400">
          Ingest enterprise PDF, HTML, Markdown or TXT documents into the hybrid vector index
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop Zone */}
        <div className="md:col-span-2 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[260px] ${
              dragActive
                ? 'border-brand-400 bg-brand-500/10'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="h-12 w-12 rounded-xl bg-slate-800 text-brand-400 flex items-center justify-center mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">
              Drag & Drop your files here, or{' '}
              <label className="text-brand-400 hover:text-brand-300 cursor-pointer underline">
                browse
                <input
                  type="file"
                  multiple
                  accept=".pdf,.html,.htm,.md,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, HTML, Markdown (.md), and Plain Text (.txt) up to 50MB
            </p>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 w-full text-left bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Selected Files ({selectedFiles.length}):</span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-rose-400 hover:underline text-[11px]"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="truncate max-w-[280px]">{f.name}</span>
                      <span className="font-mono">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress & Results */}
          {uploadResults.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-200">Processing Status:</div>
              <div className="space-y-1.5">
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg flex items-start gap-2.5 ${
                      r.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                    }`}
                  >
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[11px] opacity-90">{r.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Enterprise Metadata Form */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <FileType className="h-4 w-4 text-brand-400" />
            Enterprise Metadata
          </h3>
          <p className="text-[11px] text-slate-400">
            Metadata prevents policy confusion across teams and department silos.
          </p>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="HR">HR (Human Resources)</option>
              <option value="IT">IT & Security</option>
              <option value="Finance">Finance & Billing</option>
              <option value="Engineering">Engineering</option>
              <option value="Sales">Sales & Operations</option>
            </select>
          </div>

          {/* Team */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Team Scope (Optional)</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. Core Backend, Cloud Ops"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Version */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Policy Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v2.1"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Effective Date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Access Scope */}
          <div className="space-y-1">
            <label className="text-slate-300 font-medium">Access Scope</label>
            <select
              value={accessScope}
              onChange={(e) => setAccessScope(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="internal">Internal (All Employees)</option>
              <option value="public">Public</option>
              <option value="restricted">Restricted (Privileged)</option>
            </select>
          </div>

          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-500/20"
          >
            {uploading ? 'Processing & Embedding...' : `Ingest ${selectedFiles.length} File(s)`}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

