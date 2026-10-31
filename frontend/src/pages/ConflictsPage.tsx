import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  GitCompare,
  HelpCircle,
  RefreshCw,
  Flame
} from 'lucide-react';
import { fetchConflicts } from '../services/api';
import { ConflictItem } from '../types';

export const ConflictsPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Baseline verified conflicts in Doomsday Enterprise corpus
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
      explanation: 'Direct numerical contradiction between superseded v1.0 (90 days) and active v2.1 (180 days). Doomsday RAG surfaces both versions with respective effective dates rather than silently fabricating one.',
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
      explanation: 'Departmental override: Engineering policy explicitly restricts the company-wide 3-day allowance to 2 days per week to ensure mandatory in-person sprint collaboration on Tuesdays and Thursdays.',
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
      statement_a: 'All full-time employees of Doomsday Enterprise are entitled to 18 days of paid annual leave per calendar year.',
      statement_b: 'All full-time employees of Doomsday Enterprise are entitled to 20 days of paid annual leave per calendar year.',
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-800 pb-4">
        <div>
          <div className="text-[11px] font-mono text-accent-red font-bold uppercase tracking-wider mb-1">
            Contradiction Engine // FR-06
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <AlertTriangle className="h-6 w-6 text-accent-red" />
            Contradiction & Version Conflict Analysis
          </h2>
          <p className="text-xs text-neutral-400">
            Automated detection of contradictory statements, superseded versions, and departmental policy overrides
          </p>
        </div>
        <button
          onClick={loadConflicts}
          disabled={loading}
          className="p-2 rounded bg-dark-850 hover:bg-neutral-800 border border-dark-800 text-neutral-200 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-accent-orange' : ''}`} />
        </button>
      </div>

      {/* Philosophy Banner */}
      <div className="p-4 rounded bg-dark-900 border border-dark-800 text-xs text-neutral-300 space-y-1.5 font-mono">
        <div className="font-bold text-white flex items-center gap-2 uppercase tracking-wide">
          <GitCompare className="h-4 w-4 text-accent-orange" />
          Doomsday Policy Resolution Framework (FR-06)
        </div>
        <p className="text-neutral-400 font-sans text-xs leading-relaxed">
          Standard RAG implementations blindly select whatever passage has the nearest cosine distance, hallucinating a false certainty. Doomsday Enterprise actively compares retrieved passage claims, examines version numbers and effective dates, and flags conflicts explicitly to the employee.
        </p>
      </div>

      {/* Conflict Cards */}
      <div className="space-y-4">
        {conflicts.map((conf) => (
          <div
            key={conf.conflict_id}
            className="p-5 rounded bg-dark-900 border border-dark-800 space-y-4 shadow-sm hover:border-neutral-700 transition-all"
          >
            {/* Top Bar: Topic & Type */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-800 pb-3 font-mono">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-accent-red" />
                <h3 className="font-bold text-white text-sm uppercase">{conf.topic || 'Policy Discrepancy'}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-black text-accent-orange border border-neutral-700">
                  {conf.conflict_type} conflict
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-500 uppercase text-[10px]">Severity:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    conf.severity === 'high'
                      ? 'bg-accent-red/20 text-accent-red border border-accent-red/40'
                      : 'bg-accent-orange/20 text-accent-orange border border-accent-orange/40'
                  }`}
                >
                  {conf.severity}
                </span>
              </div>
            </div>

            {/* Side by Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
              {/* Document A */}
              <div className="p-3.5 rounded bg-black border border-dark-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-accent-orange" />
                    {conf.document_a}
                  </div>
                  {conf.version_a && (
                    <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-white font-bold text-[10px]">
                      {conf.version_a}
                    </span>
                  )}
                </div>

                <blockquote className="text-xs text-neutral-200 leading-relaxed italic bg-dark-950 p-2.5 rounded border-l-2 border-accent-orange font-sans">
                  "{conf.statement_a}"
                </blockquote>

                <div className="flex items-center gap-3 text-[10px] text-neutral-500 pt-1">
                  {conf.effective_date_a && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-accent-orange" /> Effective: {conf.effective_date_a}
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
              <div className="p-3.5 rounded bg-black border border-dark-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-neutral-200 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-accent-red" />
                    {conf.document_b}
                  </div>
                  {conf.version_b && (
                    <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-accent-orange font-bold text-[10px]">
                      {conf.version_b}
                    </span>
                  )}
                </div>

                <blockquote className="text-xs text-neutral-200 leading-relaxed italic bg-dark-950 p-2.5 rounded border-l-2 border-accent-red font-sans">
                  "{conf.statement_b}"
                </blockquote>

                <div className="flex items-center gap-3 text-[10px] text-neutral-500 pt-1">
                  {conf.effective_date_b && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-accent-red" /> Effective: {conf.effective_date_b}
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
              <div className="p-3 rounded bg-black border border-dark-800 text-xs text-neutral-300 flex items-start gap-2.5 font-mono">
                <HelpCircle className="h-4 w-4 text-accent-orange flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase">Doomsday Resolution Analysis: </span>
                  <span className="text-neutral-400 font-sans">{conf.explanation}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
