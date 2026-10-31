import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Sliders,
  Cpu,
  Shield
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
    return <div className="py-12 text-center text-neutral-500 font-mono text-xs">LOADING SETTINGS...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <div className="text-[11px] font-mono text-accent-orange font-bold uppercase tracking-wider mb-1">
            Engine Controls // Parameters
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-accent-orange" />
            Doomsday RAG Configuration
          </h2>
          <p className="text-xs text-neutral-400">
            Tune hybrid weights, candidate depth, and confidence decision boundaries
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-black bg-accent-orange px-3 py-1.5 rounded font-mono font-bold uppercase">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Parameters Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Model Provider */}
        <div className="p-5 rounded bg-dark-900 border border-dark-800 space-y-4 font-mono text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-accent-orange" />
            Inference & Embedding Engine
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">LLM Provider</label>
              <select
                value={settings.llm_provider}
                onChange={(e) => setSettings({ ...settings, llm_provider: e.target.value })}
                className="w-full bg-black border border-dark-800 rounded p-2.5 text-neutral-200 text-xs focus:outline-none focus:border-accent-orange"
              >
                <option value="gemini">Google Gemini API (Free Tier)</option>
                <option value="openai">OpenAI-Compatible Endpoint</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">LLM Model Identifier</label>
              <input
                type="text"
                value={settings.llm_model}
                onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
                className="w-full bg-black border border-dark-800 rounded p-2.5 text-white font-bold text-xs focus:outline-none focus:border-accent-orange"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">Dense Embedding Model (Local CPU)</label>
              <input
                type="text"
                value={settings.embedding_model}
                disabled
                className="w-full bg-black/60 border border-dark-800 rounded p-2.5 text-neutral-400 text-xs"
              />
              <span className="text-[10px] text-neutral-500 font-mono">
                Sentence-Transformers all-MiniLM-L6-v2 (384-dimensional normalized vectors, offline CPU inference)
              </span>
            </div>
          </div>
        </div>

        {/* Hybrid Retrieval & Reranking Tuning */}
        <div className="p-5 rounded bg-dark-900 border border-dark-800 space-y-4 font-mono text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-accent-orange" />
            Hybrid Fusion Ratio (RRF K=60)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-neutral-300 uppercase text-[10px] font-bold">
                <span>Dense Semantic Weight</span>
                <span className="text-accent-orange font-black text-sm">{settings.semantic_weight}</span>
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
                className="w-full accent-accent-orange bg-dark-800"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-neutral-300 uppercase text-[10px] font-bold">
                <span>BM25 Keyword Weight</span>
                <span className="text-white font-black text-sm">{settings.bm25_weight}</span>
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
                className="w-full accent-white bg-dark-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">Retrieval Candidate Depth (Top-K)</label>
              <input
                type="number"
                min="3"
                max="30"
                value={settings.retrieval_top_k}
                onChange={(e) => setSettings({ ...settings, retrieval_top_k: parseInt(e.target.value) || 10 })}
                className="w-full bg-black border border-dark-800 rounded p-2.5 text-white font-bold text-xs focus:outline-none focus:border-accent-orange"
              />
              <span className="text-[10px] text-neutral-500">First-stage combined pool</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">Reranked Passages for LLM Context</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.rerank_top_k}
                onChange={(e) => setSettings({ ...settings, rerank_top_k: parseInt(e.target.value) || 5 })}
                className="w-full bg-black border border-dark-800 rounded p-2.5 text-white font-bold text-xs focus:outline-none focus:border-accent-orange"
              />
              <span className="text-[10px] text-neutral-500">Passages delivered into evidence prompt</span>
            </div>
          </div>
        </div>

        {/* Confidence Thresholds */}
        <div className="p-5 rounded bg-dark-900 border border-dark-800 space-y-4 font-mono text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-orange" />
            Decision Thresholds // FR-07
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">High Confidence Floor</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="0.9"
                value={settings.confidence_threshold}
                onChange={(e) => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) || 0.5 })}
                className="w-full bg-black border border-dark-800 rounded p-2.5 text-white font-bold text-xs focus:outline-none focus:border-accent-orange"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-neutral-300 font-bold uppercase text-[10px]">Fallback / Rejection Floor</label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                max="0.5"
                value={settings.low_confidence_threshold}
                onChange={(e) => setSettings({ ...settings, low_confidence_threshold: parseFloat(e.target.value) || 0.3 })}
                className="w-full bg-black border border-dark-800 rounded p-2.5 text-accent-red font-bold text-xs focus:outline-none focus:border-accent-orange"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded bg-accent-orange hover:bg-accent-orange-hover disabled:bg-neutral-800 text-black font-black uppercase tracking-wider text-xs transition-all shadow"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            {saving ? 'UPDATING...' : 'COMMIT PARAMETERS'}
          </button>
        </div>
      </form>
    </div>
  );
};
