import axios from 'axios';
import {
  DocumentItem,
  DocumentChunk,
  QueryResponse,
  SystemStats,
  AppSettings,
  EvaluationResults,
  ConflictItem
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Document APIs
export const fetchDocuments = async (params?: { department?: string; status?: string; file_type?: string }) => {
  const res = await api.get<{ documents: DocumentItem[]; total: number }>('/documents', { params });
  return res.data;
};

export const fetchDocumentById = async (id: string) => {
  const res = await api.get<DocumentItem>(`/documents/${id}`);
  return res.data;
};

export const uploadDocument = async (formData: FormData) => {
  const res = await api.post<DocumentItem>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const deleteDocument = async (id: string) => {
  await api.delete(`/documents/${id}`);
};

export const reindexDocument = async (id: string) => {
  const res = await api.post<DocumentItem>(`/documents/${id}/reindex`);
  return res.data;
};

export const fetchDocumentChunks = async (id: string) => {
  const res = await api.get<DocumentChunk[]>(`/documents/${id}/chunks`);
  return res.data;
};

// Chat APIs
export const sendQuery = async (data: { question: string; session_id?: string; filters?: Record<string, any>; top_k?: number }) => {
  const res = await api.post<QueryResponse>('/chat/query', data);
  return res.data;
};

export const sendFeedback = async (query_id: string, feedback: 'positive' | 'negative', comment?: string) => {
  const res = await api.post('/chat/feedback', { query_id, feedback, comment });
  return res.data;
};

// Conflict APIs
export const fetchConflicts = async () => {
  const res = await api.get<{ conflicts: ConflictItem[]; total: number }>('/conflicts');
  return res.data;
};

// Evaluation APIs
export const runEvaluation = async (params?: { top_k?: number; max_questions?: number }) => {
  const res = await api.post<{ run_id: string; status: string; message: string }>('/evaluation/run', params || {});
  return res.data;
};

export const fetchEvaluationResults = async () => {
  const res = await api.get<EvaluationResults>('/evaluation/results');
  return res.data;
};

// System APIs
export const fetchStats = async () => {
  const res = await api.get<SystemStats>('/stats');
  return res.data;
};

export const fetchSettings = async () => {
  const res = await api.get<AppSettings>('/settings');
  return res.data;
};

export const updateSettings = async (settings: Partial<AppSettings>) => {
  const res = await api.patch<AppSettings>('/settings', settings);
  return res.data;
};

export default api;

