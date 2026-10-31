import React, { useState } from 'react';
import {
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FileType,
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
    onUploadSuccess();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="border-b border-dark-800 pb-4">
        <div className="text-[11px] font-mono text-accent-orange font-bold uppercase tracking-wider mb-1">
          Ingestion Terminal // FR-01 & FR-02
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Ingest Enterprise Documents</h2>
        <p className="text-xs text-neutral-400">
          Upload PDF, HTML, Markdown (.md), or Plain Text (.txt) files into the Doomsday Enterprise repository
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
            className={`border border-dashed rounded-lg p-8 text-center transition-all flex flex-col items-center justify-center min-h-[260px] ${
              dragActive
                ? 'border-accent-orange bg-accent-orange/10'
                : 'border-dark-800 bg-dark-900 hover:border-neutral-700'
            }`}
          >
            <div className="h-12 w-12 rounded bg-black border border-dark-800 text-accent-orange flex items-center justify-center mb-3">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Drag & Drop Files, or{' '}
              <label className="text-accent-orange hover:underline cursor-pointer">
                browse disk
                <input
                  type="file"
                  multiple
                  accept=".pdf,.html,.htm,.md,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </h4>
            <p className="text-xs text-neutral-500 font-mono mt-1">
              Supported: PDF, HTML, MD, TXT (Maximum 50MB per file)
            </p>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 w-full text-left bg-black p-3.5 rounded border border-dark-800 text-xs space-y-2 font-mono">
                <div className="font-bold text-white flex items-center justify-between uppercase">
                  <span>Selected Queue ({selectedFiles.length}):</span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-accent-red hover:underline text-[11px]"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-neutral-400 text-[11px]">
                      <span className="truncate max-w-[280px] text-neutral-200">{f.name}</span>
                      <span className="text-neutral-500">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress & Results */}
          {uploadResults.length > 0 && (
            <div className="p-4 rounded bg-dark-900 border border-dark-800 space-y-2 text-xs font-mono">
              <div className="font-bold uppercase tracking-wider text-white">Ingestion Output:</div>
              <div className="space-y-1.5">
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded flex items-start gap-2.5 border ${
                      r.success
                        ? 'bg-black border-neutral-700 text-white'
                        : 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                    }`}
                  >
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-accent-orange flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-accent-red flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">{r.name}</div>
                      <div className="text-[11px] opacity-90 font-sans">{r.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Enterprise Metadata Form */}
        <div className="p-5 rounded bg-dark-900 border border-dark-800 space-y-4 text-xs font-mono">
          <div className="border-b border-dark-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <FileType className="h-4 w-4 text-accent-orange" />
              Enterprise Metadata Tags
            </h3>
            <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
              Metadata prevents scope mismatch across departments
            </p>
          </div>

          {/* Department */}
          <div className="space-y-1">
            <label className="text-neutral-300 font-bold uppercase text-[10px]">Department Scope</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-black border border-dark-800 rounded p-2 text-neutral-200 text-xs focus:outline-none focus:border-accent-orange"
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
            <label className="text-neutral-300 font-bold uppercase text-[10px]">Team Scope (Optional)</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. Core Engineering"
              className="w-full bg-black border border-dark-800 rounded p-2 text-neutral-200 text-xs focus:outline-none focus:border-accent-orange"
            />
          </div>

          {/* Version */}
          <div className="space-y-1">
            <label className="text-neutral-300 font-bold uppercase text-[10px]">Policy Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v2.1"
              className="w-full bg-black border border-dark-800 rounded p-2 text-accent-orange font-bold text-xs focus:outline-none focus:border-accent-orange"
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-1">
            <label className="text-neutral-300 font-bold uppercase text-[10px]">Effective Date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full bg-black border border-dark-800 rounded p-2 text-neutral-200 text-xs focus:outline-none focus:border-accent-orange"
            />
          </div>

          {/* Access Scope */}
          <div className="space-y-1">
            <label className="text-neutral-300 font-bold uppercase text-[10px]">Access Scope</label>
            <select
              value={accessScope}
              onChange={(e) => setAccessScope(e.target.value)}
              className="w-full bg-black border border-dark-800 rounded p-2 text-neutral-200 text-xs focus:outline-none focus:border-accent-orange"
            >
              <option value="internal">Internal (All Employees)</option>
              <option value="public">Public</option>
              <option value="restricted">Restricted (Privileged)</option>
            </select>
          </div>

          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="w-full py-2.5 rounded bg-accent-orange hover:bg-accent-orange-hover disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow"
          >
            {uploading ? 'INGESTING & EMBEDDING...' : `COMMIT ${selectedFiles.length} FILE(S)`}
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
