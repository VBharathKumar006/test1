import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles,
  FileText,
  Search,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { sendQuery, sendFeedback } from '../services/api';
import { ChatMessage, QueryResponse, Citation } from '../types';

const EXAMPLE_QUESTIONS = [
  {
    title: 'IT Access & Credentials',
    prompt: 'What is the latest IT access policy and how do I request VPN access?',
    category: 'Access Policy',
  },
  {
    title: 'Department Expense Policies',
    prompt: 'Compare the reimbursement policies across departments.',
    category: 'Finance',
  },
  {
    title: 'Password Rotation Conflicts',
    prompt: 'Are there any conflicting password requirements between policy versions?',
    category: 'Policy Conflict',
  },
  {
    title: 'Engineering Leave Rules',
    prompt: 'What is the leave policy for the Engineering team?',
    category: 'HR & Engineering',
  },
];

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [selectedCitationDetail, setSelectedCitationDetail] = useState<Citation | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'positive' | 'negative'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const response: QueryResponse = await sendQuery({ question: textToSend });
      const assistantMessage: ChatMessage = {
        id: response.query_id || `bot-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseMeta: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Query error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Unable to communicate with the knowledge retrieval engine. Please verify the FastAPI backend is operational.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleFeedback = async (queryId: string, type: 'positive' | 'negative') => {
    try {
      await sendFeedback(queryId, type);
      setFeedbackSent((prev) => ({ ...prev, [queryId]: type }));
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSelectedCitationDetail(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto font-sans">
      {/* Chat Sub-header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-app-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Knowledge Assistant</h2>
            <p className="text-[11px] text-slate-400">Strictly grounded in verified enterprise documents</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-surface hover:bg-app-surface2 border border-app-border text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 py-2">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 max-w-2xl mx-auto space-y-8">
            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/10 border border-brand-primary/30 shadow-glow-primary">
                <Sparkles className="h-8 w-8 text-brand-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-white tracking-tight">
                Your enterprise knowledge, one conversation away.
              </h3>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                Ask questions across your organization's documents and get answers backed by verifiable sources with automatic conflict detection.
              </p>
            </div>

            {/* Example Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {EXAMPLE_QUESTIONS.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(ex.prompt)}
                  className="group p-4 rounded-xl bg-app-surface hover:bg-app-surface2 border border-app-border hover:border-brand-primary/40 transition-all text-left shadow-subtle hover:shadow-glow-subtle"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-medium text-brand-highlight px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20">
                      {ex.category}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                    {ex.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    "{ex.prompt}"
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400 pt-4 border-t border-app-borderSubtle">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-status-success" />
                <span>Prompt Injection Guarded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" />
                <span>Zero Outside Hallucination</span>
              </div>
            </div>
          </div>
        ) : (
          /* Message List */
          messages.map((msg) => {
            const meta = msg.responseMeta;
            const isBot = msg.sender === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 font-medium text-xs shadow-sm ${
                    isBot
                      ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white'
                      : 'bg-app-surface2 text-slate-200 border border-app-border'
                  }`}
                >
                  {isBot ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>

                {/* Message Bubble Container */}
                <div className={`space-y-3 ${isBot ? 'flex-1 max-w-3xl' : 'max-w-xl'}`}>
                  <div
                    className={`rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                      isBot
                        ? 'bg-app-surface border border-app-border text-slate-200 shadow-subtle'
                        : 'bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30 text-white ml-auto'
                    }`}
                  >
                    {/* Bot Answer Header */}
                    {isBot && (
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-app-borderSubtle">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">Doomsday Assistant</span>
                          {meta && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                                meta.confidence >= 0.7
                                  ? 'bg-status-successBg text-status-success border border-status-success/30'
                                  : meta.confidence >= 0.4
                                  ? 'bg-status-warningBg text-status-warning border border-status-warning/30'
                                  : 'bg-status-errorBg text-status-error border border-status-error/30'
                              }`}
                            >
                              {meta.confidence >= 0.7
                                ? 'High Evidence Confidence'
                                : meta.confidence >= 0.4
                                ? 'Moderate Confidence'
                                : 'Insufficient Evidence'}
                              {' '}({(meta.confidence * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>

                        {meta && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{meta.latency_ms.toFixed(0)} ms</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Markdown Content */}
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-white prose-strong:text-brand-highlight prose-pre:bg-app-bg prose-pre:border prose-pre:border-app-border prose-ul:my-2 prose-li:my-0.5">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>

                    {/* Clarification Box */}
                    {meta?.clarification_required && meta.clarification_question && (
                      <div className="mt-4 p-3.5 rounded-xl bg-status-warningBg border border-status-warning/30 text-slate-200 text-xs flex items-start gap-3">
                        <HelpCircle className="h-4 w-4 text-status-warning flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-status-warning">
                            Clarification Required
                          </div>
                          <p className="mt-0.5 text-slate-300">{meta.clarification_question}</p>
                        </div>
                      </div>
                    )}

                    {/* Policy Contradiction Warning Panel */}
                    {meta?.conflicts && meta.conflicts.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-status-warningBg border border-status-warning/40 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-status-warning">
                          <AlertTriangle className="h-4 w-4 text-status-warning" />
                          <span>Policy Contradiction Detected ({meta.conflicts.length})</span>
                        </div>
                        <div className="space-y-2">
                          {meta.conflicts.map((conf, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3 rounded-lg bg-app-bg/80 border border-status-warning/20 text-xs space-y-2"
                            >
                              <div className="font-semibold text-white text-[11px] uppercase tracking-wider font-mono">
                                Topic: {conf.topic || conf.conflict_type}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="p-2 rounded bg-app-surface border border-app-border">
                                  <div className="text-brand-highlight font-mono font-medium">
                                    {conf.document_a} {conf.version_a ? `(${conf.version_a})` : ''}
                                  </div>
                                  <div className="text-slate-300 mt-1">{conf.statement_a}</div>
                                </div>
                                <div className="p-2 rounded bg-app-surface border border-app-border">
                                  <div className="text-slate-200 font-mono font-medium">
                                    {conf.document_b} {conf.version_b ? `(${conf.version_b})` : ''}
                                  </div>
                                  <div className="text-slate-300 mt-1">{conf.statement_b}</div>
                                </div>
                              </div>
                              {conf.explanation && (
                                <div className="text-[11px] text-status-warning/90 pt-1 border-t border-app-borderSubtle">
                                  Resolution Context: {conf.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Metadata & Feedback */}
                    {isBot && meta && (
                      <div className="mt-4 pt-3 border-t border-app-borderSubtle flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Verified against {meta.citations?.length ?? 0} document sources</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(meta.query_id, 'positive')}
                            className={`p-1.5 rounded-lg hover:bg-app-surface2 transition-colors ${
                              feedbackSent[meta.query_id] === 'positive'
                                ? 'text-status-success bg-status-successBg'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Helpful & grounded"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(meta.query_id, 'negative')}
                            className={`p-1.5 rounded-lg hover:bg-app-surface2 transition-colors ${
                              feedbackSent[meta.query_id] === 'negative'
                                ? 'text-status-error bg-status-errorBg'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title="Inaccurate or incomplete"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Compact Source Citation Chips & Expandable Drawer */}
                  {isBot && meta?.citations && meta.citations.length > 0 && (
                    <div className="space-y-2 pl-1">
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-brand-primary" />
                        <span>Source Citations ({meta.citations.length})</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {meta.citations.map((cit, cIdx) => {
                          const isExpanded = expandedCitation === `${msg.id}-${cIdx}`;
                          return (
                            <div key={cIdx} className="w-full">
                              <button
                                onClick={() =>
                                  setExpandedCitation(isExpanded ? null : `${msg.id}-${cIdx}`)
                                }
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                                  isExpanded
                                    ? 'bg-app-surface border-brand-primary/40 shadow-glow-subtle'
                                    : 'bg-app-surface/60 hover:bg-app-surface border-app-border text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="h-5 w-5 rounded-md bg-brand-primary/20 text-brand-highlight flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                                    [{cIdx + 1}]
                                  </span>
                                  <span className="font-medium text-slate-200 truncate">
                                    {cit.source_document}
                                  </span>
                                  {cit.page_number && (
                                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-app-surface2">
                                      p. {cit.page_number}
                                    </span>
                                  )}
                                  {cit.section_title && (
                                    <span className="text-[11px] text-slate-400 truncate max-w-[160px] hidden sm:inline">
                                      • § {cit.section_title}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </div>
                              </button>

                              {/* Expandable Evidence Excerpt */}
                              {isExpanded && (
                                <div className="mt-1.5 p-3.5 rounded-xl bg-app-surface2 border border-brand-primary/20 text-xs text-slate-300 space-y-2">
                                  <div className="text-[10px] font-mono text-brand-highlight uppercase tracking-wider font-semibold">
                                    Verbatim Supporting Excerpt
                                  </div>
                                  <blockquote className="border-l-2 border-brand-primary pl-3 py-0.5 text-slate-200 leading-relaxed italic">
                                    "{cit.excerpt}"
                                  </blockquote>
                                  <div className="pt-2 border-t border-app-borderSubtle flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                                    {cit.document_version && (
                                      <span>
                                        Version: <b className="text-slate-200">{cit.document_version}</b>
                                      </span>
                                    )}
                                    {cit.department && (
                                      <span>
                                        Department: <b className="text-slate-200">{cit.department}</b>
                                      </span>
                                    )}
                                    {cit.team && (
                                      <span>
                                        Team: <b className="text-slate-200">{cit.team}</b>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex gap-3.5 items-start">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex items-center justify-center">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-app-surface border border-app-border text-slate-300 text-xs flex items-center gap-3 font-mono">
              <span className="h-2 w-2 rounded-full bg-brand-primary animate-ping" />
              <span>Retrieving relevant passages and synthesizing verified answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Chat Input Area */}
      <div className="pt-3 border-t border-app-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative rounded-2xl bg-app-surface border border-app-border focus-within:border-brand-primary/50 focus-within:shadow-glow-subtle transition-all p-2"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about enterprise policies, limits, technical procedures..."
            disabled={loading}
            className="w-full bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none min-h-[38px] max-h-[160px] font-sans"
          />

          <div className="flex items-center justify-between px-2 pt-1 border-t border-app-borderSubtle">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-app-surface2 text-slate-300 text-[10px] font-mono">
                Scope: All Enterprise Documents
              </span>
              <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-subtle"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
