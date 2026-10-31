import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Files,
  UploadCloud,
  GitCompare,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  Zap,
  Layers,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Activity,
  Search,
  ExternalLink
} from 'lucide-react';

interface MainLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups = [
    {
      group: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'chat', label: 'AI Assistant', icon: Sparkles, badge: 'RAG' },
        { id: 'documents', label: 'Document Library', icon: Files },
        { id: 'upload', label: 'Upload Documents', icon: UploadCloud },
      ],
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { id: 'conflicts', label: 'Conflict Analysis', icon: GitCompare, badge: 'FR-04' },
        { id: 'evaluation', label: 'Evaluation & Analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg text-slate-100 font-sans">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-app-sidebar border-r border-app-border transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Logo & Product Brand */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-app-border flex-shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-primary via-brand-highlight to-brand-secondary p-[1px] shadow-glow-subtle flex-shrink-0">
                <div className="h-full w-full rounded-[11px] bg-app-surface flex items-center justify-center">
                  <Zap className="h-4 w-4 text-brand-primary" />
                </div>
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm tracking-tight text-white font-sans">Doomsday AI</span>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-brand-primary/10 text-brand-highlight border border-brand-primary/20">
                      v1.0
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate">
                    Enterprise Knowledge Intelligence
                  </span>
                </div>
              )}
            </div>

            {/* Collapse button on desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-app-surface border border-transparent hover:border-app-border transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Close button on mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Groups */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navGroups.map((grp) => (
              <div key={grp.group} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 pb-1 text-[11px] font-mono font-medium tracking-wider text-slate-400 uppercase">
                    {grp.group}
                  </div>
                )}
                <div className="space-y-0.5">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                          isActive
                            ? 'bg-app-surface text-white border border-brand-primary/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-app-surface/60'
                        }`}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-brand-primary shadow-glow-primary" />
                        )}

                        <Icon
                          className={`h-4 w-4 flex-shrink-0 transition-colors ${
                            isActive
                              ? 'text-brand-primary'
                              : 'text-slate-400 group-hover:text-slate-300'
                          }`}
                        />

                        {!collapsed && (
                          <span className="truncate flex-1 text-left">{item.label}</span>
                        )}

                        {!collapsed && item.badge && (
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                              isActive
                                ? 'bg-brand-primary/20 text-brand-highlight border border-brand-primary/30'
                                : 'bg-app-surface2 text-slate-400 border border-app-border'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer User & Workspace Card */}
          <div className="p-3 border-t border-app-border bg-app-sidebar/80 flex-shrink-0">
            {!collapsed ? (
              <div className="space-y-3">
                {/* Security Shield Indicator */}
                <div className="p-2.5 rounded-lg bg-app-surface border border-app-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-status-success" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-slate-200">Security Shield</span>
                      <span className="text-[10px] text-slate-400 font-mono">Multi-Layer Active</span>
                    </div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-status-success shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                </div>

                {/* Workspace Profile */}
                <div className="flex items-center gap-2.5 px-1 py-0.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-primary/40 to-brand-secondary/40 border border-brand-primary/40 flex items-center justify-center text-xs font-semibold text-white">
                    DE
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-200 truncate">Doomsday Enterprise</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate">Team Doomsday • Hackathon</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-1">
                <span className="h-2 w-2 rounded-full bg-status-success shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Shield Active" />
                <div className="h-8 w-8 rounded-full bg-app-surface border border-brand-primary/40 flex items-center justify-center text-xs font-semibold text-white">
                  DE
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-app-bg">
        {/* Top Header Bar */}
        <header className="h-16 bg-app-sidebar/60 backdrop-blur-md border-b border-app-border px-4 lg:px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg bg-app-surface border border-app-border flex items-center justify-center text-slate-300 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Context */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono">Doomsday Enterprise</span>
              <span className="text-slate-600">/</span>
              <span className="font-medium text-slate-200 capitalize">
                {currentTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Telemetry Pills on right */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-app-surface border border-app-border text-[11px] text-slate-300">
              <Activity className="h-3 w-3 text-brand-primary animate-pulse" />
              <span className="font-mono text-slate-400">RAG:</span>
              <span className="text-slate-200 font-medium">Hybrid [FAISS + BM25]</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-[11px] text-brand-highlight font-mono">
              <Zap className="h-3 w-3" />
              <span>Gemini 1.5 Flash</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-successBg border border-status-success/30 text-[11px] text-status-success font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success animate-ping" />
              <span>Connected</span>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-app-bg">
          {children}
        </main>
      </div>
    </div>
  );
};
