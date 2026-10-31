import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  GitCompare,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchConflicts } from '../services/api';
import { ConflictItem } from '../types';

export const ConflictsPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sampleConflicts: ConflictItem[] = [
    {
      conflict_id: 'conf-pwd-001',
      conflict_type: 'version',
      topic: 'Password Rotation Interval',
      document_a: 'IT_Access_Policy_v1.txt',
      document_b: 'IT_Access_Policy_v2.html',
      version_a: 'v1.0',
      version_b: 'v2.1',
      effective_date_a: '2022-07-01',
      effective_date_b: '2024-03-01',
      department_a: 'IT',
      department_b: 'IT',
      statement_a: 'All employee passwords must be changed every 90 days. Failure to comply will result in automatic account lockout.',
      statement_b: 'All employee passwords must be changed every 180 days. The system will prompt users automatically when rotation is due.',
      severity: 'high',
      resolution_status: 'unresolved',
      explanation: 'Direct numerical contradiction between superseded v1.0 (90 days) and active v2.1 (180 days). The assistant surfaces both versions and dates rather than silently hallucinating a single rule.',
    },
    {
      conflict_id: 'conf-remote-002',
      conflict_type: 'team',
      topic: 'Remote Work Entitlement',
      document_a: 'HR_Policy_v2.md',
      document_b: 'Engineering_Team_Policy.md',
      version_a: 'v2.0',
      version_b: 'v1.2',
      effective_date_a: '2024-01-01',
      effective_date_b: '2023-06-01',
      department_a: 'HR',
      department_b: 'Engineering',
      team_b: 'Engineering',
      statement_a: 'Employees are permitted to work remotely up to 3 days per week, subject to business requirements and manager approval.',
      statement_b: 'Engineering team members are permitted to work remotely up to 2 days per week. Mandatory on-site days are Tuesdays and Thursdays.',
      severity: 'medium',
      resolution_status: 'clarified',
      explanation: 'Departmental override: Engineering team policy explicitly limits remote work to 2 days per week for sprint planning collaboration.',
    },
    {
      conflict_id: 'conf-leave-003',
      conflict_type: 'version',
      topic: 'Annual Paid Leave Entitlement',
      document_a: 'HR_Policy_v1.md',
      document_b: 'HR_Policy_v2.md',
      version_a: 'v1.0',
      version_b: 'v2.0',
      effective_date_a: '2022-03-15',
      effective_date_b: '2024-01-01',
      department_a: 'HR',
      department_b: 'HR',
      statement_a: 'All full-time employees are entitled to 18 days of paid annual leave per calendar year.',
      statement_b: 'All full-time employees are entitled to 20 days of paid annual leave per calendar year.',
      severity: 'high',
      resolution_status: 'superseded',
      explanation: 'HR Policy v2.0 explicitly supersedes v1.0 as of January 1, 2024, raising leave entitlement from 18 to 20 days.',
    },
  ];

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const data = await fetchConflicts();
      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
      } else {
        setConflicts(sampleConflicts);
      }
    } catch (err) {
      console.error('Failed to load conflicts:', err);
      setConflicts(sampleConflicts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  const totalConflicts = conflicts.length;
  const directContradictions = conflicts.filter((c) => c.severity === 'high').length;
  const versionConflicts = conflicts.filter((c) => c.conflict_type === 'version').length;
  const teamVariations = conflicts.filter((c) => c.conflict_type === 'team').length;
  const dateConflicts = conflicts.filter((c) => c.effective_date_a && c.effective_date_b).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Policy Intelligence
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Discover contradictions, version differences and department-specific variations across enterprise documents.
          </p>
        </div>

        <button
          onClick={loadConflicts}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-app-surface hover:bg-app-surface2 border border-app-border text-xs font-medium text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
          <span>Rescan Matrix</span>
        </button>
      </div>

      {/* 5 Conflict Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-slate-400 font-medium">Total Conflicts</div>
          <div className="text-2xl font-semibold text-white mt-1">{totalConflicts}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-status-error font-medium">Direct Contradictions</div>
          <div className="text-2xl font-semibold text-status-error mt-1">{directContradictions}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-status-warning font-medium">Version Conflicts</div>
          <div className="text-2xl font-semibold text-status-warning mt-1">{versionConflicts}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-brand-highlight font-medium">Team Variations</div>
          <div className="text-2xl font-semibold text-brand-highlight mt-1">{teamVariations}</div>
        </div>
        <div className="p-4 rounded-xl bg-app-surface border border-app-border">
          <div className="text-xs text-slate-400 font-medium">Date Discrepancies</div>
          <div className="text-2xl font-semibold text-slate-200 mt-1">{dateConflicts}</div>
        </div>
      </div>

      {/* Conflict Cards with Side-by-Side Comparison Panels */}
      <div className="space-y-4">
        {conflicts.map((conf) => {
          const isExpanded = expandedId === conf.conflict_id || true; // Keep open for immediate visual clarity
          return (
            <div
              key={conf.conflict_id}
              className="rounded-2xl bg-app-surface border border-app-border p-5 space-y-4 shadow-subtle hover:border-brand-primary/30 transition-all"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-app-border pb-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      conf.severity === 'high'
                        ? 'bg-status-errorBg text-status-error border border-status-error/30'
                        : 'bg-status-warningBg text-status-warning border border-status-warning/30'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {conf.topic || 'Policy Discrepancy'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                      <span>Type: <b className="text-slate-200 capitalize">{conf.conflict_type}</b></span>
                      <span>•</span>
                      <span>Dept: <b className="text-slate-200">{conf.department_a || 'General'}</b></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                      conf.severity === 'high'
                        ? 'bg-status-errorBg text-status-error border border-status-error/30'
                        : 'bg-status-warningBg text-status-warning border border-status-warning/30'
                    }`}
                  >
                    {conf.severity} severity
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-300 bg-app-surface2 border border-app-border uppercase">
                    Status: {conf.resolution_status}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source A */}
                <div className="p-4 rounded-xl bg-app-surface2 border border-app-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-highlight flex items-center gap-1.5 truncate">
                      <FileText className="h-3.5 w-3.5" />
                      {conf.document_a}
                    </span>
                    {conf.version_a && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-app-elevated text-slate-300">
                        {conf.version_a}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed pt-1">
                    "{conf.statement_a}"
                  </div>
                  {conf.effective_date_a && (
                    <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-app-borderSubtle flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Effective: {conf.effective_date_a}
                    </div>
                  )}
                </div>

                {/* Source B */}
                <div className="p-4 rounded-xl bg-app-surface2 border border-app-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-secondary flex items-center gap-1.5 truncate">
                      <FileText className="h-3.5 w-3.5" />
                      {conf.document_b}
                    </span>
                    {conf.version_b && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-app-elevated text-slate-300">
                        {conf.version_b}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed pt-1">
                    "{conf.statement_b}"
                  </div>
                  {conf.effective_date_b && (
                    <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-app-borderSubtle flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Effective: {conf.effective_date_b}
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Explanation */}
              {conf.explanation && (
                <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/20 text-xs flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-brand-highlight">RAG Discrepancy Handling: </span>
                    <span className="text-slate-300 leading-relaxed">{conf.explanation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
