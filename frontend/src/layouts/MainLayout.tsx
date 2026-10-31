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
  Flame,
  Terminal,
  Activity
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
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-neutral-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-dark-900 border-r border-dark-800 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="p-5 border-b border-dark-800 flex items-center gap-3 bg-black/40">
            <div className="h-9 w-9 rounded-md bg-accent-orange text-black flex items-center justify-center font-black shadow-sm">
              <Flame className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm uppercase tracking-wider text-white">Doomsday Enterprise</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase font-mono font-bold text-accent-orange bg-accent-orange/10 px-1.5 py-0.2 rounded border border-accent-orange/30">
                  Team Doomsday
                </span>
              </div>
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white border-l-4 border-accent-orange bg-gradient-to-r from-accent-orange/15 to-transparent'
                      : 'text-neutral-400 hover:text-white hover:bg-dark-850'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-accent-orange' : 'text-neutral-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-dark-800 bg-black/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-red" />
              INJECTION SHIELD
            </span>
            <span className="text-white font-bold bg-accent-red/20 text-accent-red border border-accent-red/40 px-1.5 py-0.2 rounded text-[10px]">
              ARMED
            </span>
          </div>
          <div className="pt-2 border-t border-dark-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>HCLTECH 2026</span>
            <span className="text-accent-orange font-bold">DOOMSDAY v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-dark-900/95 border-b border-dark-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-500 uppercase font-mono font-medium">Domain:</span>
            <span className="font-bold text-white tracking-wide uppercase">Doomsday Enterprise Documentation Vault</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black border border-neutral-700 text-neutral-300">
              <Activity className="h-3 w-3 text-accent-orange animate-pulse" />
              <span>Hybrid RAG [FAISS + BM25]</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-accent-orange/10 border border-accent-orange/30 text-accent-orange font-semibold">
              ENGINE: GEMINI 1.5 FLASH
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-dark-950">
          {children}
        </main>
      </div>
    </div>
  );
};
