import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Sliders,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Database
} from 'lucide-react';
import { fetchSettings, updateSettings } from '../services/api';
import { AppSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-16 text-center text-slate-400 font-mono text-xs">
        Loading configuration parameters...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Settings & Configuration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tune hybrid weights, candidate depth, and confidence decision boundaries.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-status-success bg-status-successBg border border-status-success/30 px-3 py-1.5 rounded-lg font-medium self-start sm:self-auto">
            <CheckCircle2 className="h-4 w-4" />
            <span>Parameters Saved Successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: AI Provider & Embedding Model */}
        <div className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-4 shadow-subtle">
          <div className="flex items-center gap-2 border-b border-app-border pb-3">
            <Cpu className="h-4 w-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-white">AI Provider & Inference Engine</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">LLM Provider</label>
              <select
                value={settings.llm_provider}
                onChange={(e) => setSettings({ ...settings, llm_provider: e.target.value })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50"
              >
                <option value="gemini">Google Gemini API (Default)</option>
                <option value="openai">OpenAI-Compatible Endpoint</option>
              </select>
              <p className="text-[11px] text-slate-400">Configured via environment variable GEMINI_API_KEY</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Model Identifier</label>
              <input
                type="text"
                value={settings.llm_model}
                onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">e.g. gemini-1.5-flash or gpt-4o-mini</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Dense Embedding Model</label>
              <input
                type="text"
                value={settings.embedding_model}
                onChange={(e) => setSettings({ ...settings, embedding_model: e.target.value })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">HuggingFace Sentence-Transformers local embedding model</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Vector Store</label>
              <input
                type="text"
                disabled
                value="FAISS (Facebook AI Similarity Search) + BM25Okapi"
                className="w-full bg-app-surface2/60 border border-app-border rounded-lg p-2.5 text-slate-400 cursor-not-allowed font-mono"
              />
              <p className="text-[11px] text-slate-400">In-memory dual-index hybrid architecture</p>
            </div>
          </div>
        </div>

        {/* Section 2: Retrieval & Hybrid Weights */}
        <div className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-4 shadow-subtle">
          <div className="flex items-center gap-2 border-b border-app-border pb-3">
            <Sliders className="h-4 w-4 text-brand-secondary" />
            <h2 className="text-sm font-semibold text-white">Hybrid Retrieval & Fusion Weights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Semantic Embedding Weight</span>
                <span className="font-mono text-brand-highlight">{settings.semantic_weight}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.semantic_weight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSettings({
                    ...settings,
                    semantic_weight: val,
                    bm25_weight: parseFloat((1.0 - val).toFixed(2)),
                  });
                }}
                className="w-full accent-brand-primary"
              />
              <p className="text-[11px] text-slate-400">Controls dense vector cosine similarity weight</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Keyword BM25 Weight</span>
                <span className="font-mono text-brand-secondary">{settings.bm25_weight}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={settings.bm25_weight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSettings({
                    ...settings,
                    bm25_weight: val,
                    semantic_weight: parseFloat((1.0 - val).toFixed(2)),
                  });
                }}
                className="w-full accent-brand-secondary"
              />
              <p className="text-[11px] text-slate-400">Controls exact keyword lexical matching weight</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Retrieval Top-K (Candidate Pool)</label>
              <input
                type="number"
                min="3"
                max="50"
                value={settings.retrieval_top_k}
                onChange={(e) => setSettings({ ...settings, retrieval_top_k: parseInt(e.target.value) || 10 })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">Candidates gathered before RRF fusion</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Rerank Top-K (Final Context Window)</label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.rerank_top_k}
                onChange={(e) => setSettings({ ...settings, rerank_top_k: parseInt(e.target.value) || 5 })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">Final relevant passages presented to LLM</p>
            </div>
          </div>
        </div>

        {/* Section 3: Chunking & Confidence Thresholds */}
        <div className="p-5 rounded-2xl bg-app-surface border border-app-border space-y-4 shadow-subtle">
          <div className="flex items-center gap-2 border-b border-app-border pb-3">
            <Layers className="h-4 w-4 text-brand-highlight" />
            <h2 className="text-sm font-semibold text-white">Chunking & Confidence Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Max Chunk Size (Characters)</label>
              <input
                type="number"
                min="200"
                max="2000"
                step="50"
                value={settings.max_chunk_size}
                onChange={(e) => setSettings({ ...settings, max_chunk_size: parseInt(e.target.value) || 700 })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Chunk Overlap (Characters)</label>
              <input
                type="number"
                min="0"
                max="400"
                step="10"
                value={settings.chunk_overlap}
                onChange={(e) => setSettings({ ...settings, chunk_overlap: parseInt(e.target.value) || 100 })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Sufficient Evidence Threshold</label>
              <input
                type="number"
                min="0.1"
                max="0.99"
                step="0.05"
                value={settings.confidence_threshold}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) || 0.65 })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">Required score to consider answer fully confident</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Fallback Threshold</label>
              <input
                type="number"
                min="0.1"
                max="0.8"
                step="0.05"
                value={settings.low_confidence_threshold}
                onChange={(e) => setSettings({ ...settings, low_confidence_threshold: parseFloat(e.target.value) || 0.35 })}
                className="w-full bg-app-surface2 border border-app-border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-primary/50 font-mono"
              />
              <p className="text-[11px] text-slate-400">Scores below this trigger clarification fallback</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold shadow-glow-subtle transition-all"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Applying Parameters...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
