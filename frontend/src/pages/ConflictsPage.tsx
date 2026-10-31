import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  GitCompare,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { fetchConflicts } from '../services/api';
import { ConflictItem } from '../types';

export const ConflictsPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fallback demo conflict items if none logged yet in backend DB
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
      explanation: 'Direct numerical conflict between superseded v1.0 (90 days) and active v2.1 (180 days). The system reports both versions with effective dates rather than silently hallucinating one.',
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
      explanation: 'Contextual variation: The Engineering policy explicitly overrides the company-wide policy for engineering team members to ensure in-person collaboration during sprint ceremonies.',
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
      statement_a: 'All full-time employees of Nexora Technologies are entitled to 18 days of paid annual leave per calendar year.',
      statement_b: 'All full-time employees of Nexora Technologies are entitled to 20 days of paid annual leave per calendar year.',
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
        setTotal(data.total);
      } else {
        setConflicts(sampleConflicts);
        setTotal(sampleConflicts.length);
      }
    } catch (err) {
      console.error('Failed to load conflicts:', err);
      setConflicts(sampleConflicts);
      setTotal(sampleConflicts.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            Contradiction & Version Conflict Analysis
          </h2>
          <p className="text-sm text-slate-400">
            Automated detection of contradictory statements, superseded versions, and departmental policy overrides
          </p>
        </div>
        <button
          onClick={loadConflicts}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
        <div className="font-semibold text-slate-100 flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-brand-400" />
          Enterprise Conflict Handling Philosophy (FR-06)
        </div>
        <p className="leading-relaxed text-slate-400">
          Standard RAG silently picks one passage based on vector distance, giving confident but potentially wrong answers. Nexora DocAI identifies conflicting claims across versions, checks effective dates and department scopes, and transparently presents both sides.
        </p>
      </div>

      {/* Conflict Cards */}
      <div className="space-y-4">
        {conflicts.map((conf) => (
          <div
            key={conf.conflict_id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition-all shadow-lg"
          >
            {/* Top Bar: Topic & Type */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="font-semibold text-white text-sm">{conf.topic || 'Policy Discrepancy'}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {conf.conflict_type} conflict
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 text-[11px]">Severity:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    conf.severity === 'high'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {conf.severity}
                </span>
              </div>
            </div>

            {/* Side by Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document A */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-brand-300 flex items-center gap-1.5 font-mono">
                    <FileText className="h-3.5 w-3.5 text-brand-400" />
                    {conf.document_a}
                  </div>
                  {conf.version_a && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {conf.version_a}
                    </span>
                  )}
                </div>

                <blockquote className="text-xs text-slate-200 leading-relaxed italic bg-slate-900/60 p-2.5 rounded border-l-2 border-brand-500">
                  "{conf.statement_a}"
                </blockquote>

                <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                  {conf.effective_date_a && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Effective: {conf.effective_date_a}
                    </span>
                  )}
                  {conf.department_a && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> Dept: {conf.department_a}
                    </span>
                  )}
                </div>
              </div>

              {/* Document B */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-purple-300 flex items-center gap-1.5 font-mono">
                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                    {conf.document_b}
                  </div>
                  {conf.version_b && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {conf.version_b}
                    </span>
                  )}
                </div>

                <blockquote className="text-xs text-slate-200 leading-relaxed italic bg-slate-900/60 p-2.5 rounded border-l-2 border-purple-500">
                  "{conf.statement_b}"
                </blockquote>

                <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                  {conf.effective_date_b && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Effective: {conf.effective_date_b}
                    </span>
                  )}
                  {conf.department_b && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> Dept: {conf.department_b}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Explanation / Resolution Analysis */}
            {conf.explanation && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">System Resolution Analysis: </span>
                  <span className="text-slate-400">{conf.explanation}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

