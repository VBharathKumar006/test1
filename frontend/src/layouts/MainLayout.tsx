import React from 'react';
import {
  LayoutDashboard,
  MessageSquareText,
  Files,
  UploadCloud,
  AlertTriangle,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  Bot
} from 'lucide-react';

interface MainLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'Ask Assistant', icon: MessageSquareText },
    { id: 'documents', label: 'Document Library', icon: Files },
    { id: 'upload', label: 'Upload Documents', icon: UploadCloud },
    { id: 'conflicts', label: 'Conflict Analysis', icon: AlertTriangle },
    { id: 'evaluation', label: 'Evaluation Dashboard', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-white tracking-wide">Nexora DocAI</h1>
              <p className="text-xs text-brand-400 font-medium">Enterprise Assistant</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Injection Shield Active</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5">
            <div>HCLTech Hackathon 2026</div>
            <div>Multi-Format Grounded RAG</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Workspace:</span>
            <span className="font-semibold text-slate-200">Nexora Technologies Knowledge Base</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hybrid RAG Engine Online</span>
            </div>
            <div className="text-slate-400">
              Model: <span className="text-slate-200 font-mono">Gemini 1.5 Flash</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

