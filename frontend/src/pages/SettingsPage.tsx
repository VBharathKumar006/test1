import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Sliders,
  Cpu,
  Layers,
  Shield,
  RefreshCw
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
    return <div className="py-12 text-center text-slate-500 text-xs">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-brand-400" />
            System & RAG Configuration
          </h2>
          <p className="text-sm text-slate-400">
            Tune hybrid retrieval parameters, confidence thresholds, and model providers
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Model Provider */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brand-400" />
            LLM & Embedding Models
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">LLM Provider</label>
              <select
                value={settings.llm_provider}
                onChange={(e) => setSettings({ ...settings, llm_provider: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="gemini">Google Gemini API (Free Tier)</option>
                <option value="openai">OpenAI-Compatible Provider</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">LLM Model Name</label>
              <input
                type="text"
                value={settings.llm_model}
                onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-slate-300 font-medium">Embedding Model (Local CPU)</label>
              <input
                type="text"
                value={settings.embedding_model}
                disabled
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-slate-400 font-mono"
              />
              <span className="text-[11px] text-slate-500">
                Sentence-Transformers all-MiniLM-L6-v2 (384-dim, offline, zero API latency)
              </span>
            </div>
          </div>
        </div>

        {/* Hybrid Retrieval & Reranking Tuning */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-brand-400" />
            Hybrid Retrieval & Fusion Weights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Semantic Vector Weight</span>
                <span className="font-mono font-bold text-brand-400">{settings.semantic_weight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.semantic_weight}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    semantic_weight: parseFloat(e.target.value),
                    bm25_weight: parseFloat((1 - parseFloat(e.target.value)).toFixed(2)),
                  })
                }
                className="w-full accent-brand-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>BM25 Keyword Weight</span>
                <span className="font-mono font-bold text-purple-400">{settings.bm25_weight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.bm25_weight}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bm25_weight: parseFloat(e.target.value),
                    semantic_weight: parseFloat((1 - parseFloat(e.target.value)).toFixed(2)),
                  })
                }
                className="w-full accent-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Initial Retrieval Top-K</label>
              <input
                type="number"
                min="3"
                max="30"
                value={settings.retrieval_top_k}
                onChange={(e) => setSettings({ ...settings, retrieval_top_k: parseInt(e.target.value) || 10 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-slate-500">Candidates retrieved before reranker</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Reranked Passages (Sent to LLM)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.rerank_top_k}
                onChange={(e) => setSettings({ ...settings, rerank_top_k: parseInt(e.target.value) || 5 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
              <span className="text-[11px] text-slate-500">Top passages included in evidence prompt</span>
            </div>
          </div>
        </div>

        {/* Confidence Thresholds */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-400" />
            Confidence & Fallback Thresholds
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">High Confidence Threshold</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="0.9"
                value={settings.confidence_threshold}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) || 0.5 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium">Fallback / Clarification Floor</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="0.5"
                value={settings.low_confidence_threshold}
                onChange={(e) => setSettings({ ...settings, low_confidence_threshold: parseFloat(e.target.value) || 0.3 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 text-white font-semibold text-xs transition-all shadow-md shadow-brand-500/20"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Updating...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

