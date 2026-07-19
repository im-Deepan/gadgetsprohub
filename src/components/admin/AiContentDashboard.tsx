import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Wand2, Languages, BookOpen, History, BarChart3, Database, 
  Check, X, Send, RefreshCw, Play, Pause, Ban, List, AlertTriangle, 
  Settings, Key, Trash2, ChevronRight, Save, Copy, FileText, ArrowRight, Eye
} from 'lucide-react';
import { apiFetch } from '../../utils/apiClient';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, Legend
} from 'recharts';

interface AiContentDashboardProps {
  showNotice: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function AiContentDashboard({ showNotice }: AiContentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'assistant' | 'prompts' | 'queue' | 'analytics' | 'settings'>('assistant');

  // Loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Live Gen selection
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('product_long_description');
  const [customVars, setCustomVars] = useState<string>('{}');
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [evaluationReport, setEvaluationReport] = useState<any>(null);
  const [latestResponseId, setLatestResponseId] = useState<string>('');

  // Side-by-Side editing / translation / rewrite
  const [originalDraft, setOriginalDraft] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [rewriteTone, setRewriteTone] = useState<string>('professional');
  const [targetLang, setTargetLang] = useState<string>('Spanish');

  // Prompt Library Form
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [showPromptForm, setShowPromptForm] = useState<boolean>(false);

  // Provider Settings state
  const [activeProviderDetails, setActiveProviderDetails] = useState<any>({});

  // Batch trigger state
  const [batchProductIds, setBatchProductIds] = useState<string[]>([]);
  const [batchPromptKey, setBatchPromptKey] = useState<string>('product_long_description');

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'assistant') {
        const pRes = await apiFetch('/api/products');
        if (pRes.ok) {
          const pData = await pRes.json();
          const resolvedProducts = Array.isArray(pData) ? pData : (pData?.products || []);
          setProducts(resolvedProducts);
          if (resolvedProducts.length > 0 && !selectedProductId) {
            setSelectedProductId(resolvedProducts[0]._id);
          }
        }
        const prRes = await apiFetch('/api/admin/ai/prompts');
        if (prRes.ok) {
          const prData = await prRes.json();
          setPrompts(prData.data);
        }
      } else if (activeTab === 'prompts') {
        const res = await apiFetch('/api/admin/ai/prompts');
        if (res.ok) {
          const data = await res.json();
          setPrompts(data.data);
        }
      } else if (activeTab === 'queue') {
        const pRes = await apiFetch('/api/products');
        if (pRes.ok) {
          const pData = await pRes.json();
          const resolvedProducts = Array.isArray(pData) ? pData : (pData?.products || []);
          setProducts(resolvedProducts);
        }
        const res = await apiFetch('/api/admin/ai/queue');
        if (res.ok) {
          const data = await res.json();
          setQueue(data.data);
        }
        const prRes = await apiFetch('/api/admin/ai/prompts');
        if (prRes.ok) {
          const prData = await prRes.json();
          setPrompts(prData.data);
        }
      } else if (activeTab === 'analytics') {
        const res = await apiFetch('/api/admin/ai/analytics');
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data.data);
        }
      } else if (activeTab === 'settings') {
        const res = await apiFetch('/api/admin/ai/providers');
        if (res.ok) {
          const data = await res.json();
          setProviders(data.data);
        }
      }
    } catch (err) {
      showNotice('error', 'Failed to retrieve AI administrative details.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  const handleGenerate = async () => {
    if (!selectedProductId) return showNotice('error', 'Select a target product first.');
    
    setGenerating(true);
    setGeneratedContent('');
    setEvaluationReport(null);
    setLatestResponseId('');

    let parsedVars = {};
    try {
      parsedVars = JSON.parse(customVars);
    } catch {
      showNotice('error', 'Variables field must be valid JSON.');
      setGenerating(false);
      return;
    }

    if (useStreaming) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/ai/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: selectedProductId,
            promptKey: selectedPromptKey,
            customVars: parsedVars,
            stream: true
          })
        });

        if (!response.ok) {
          throw new Error('Streaming connection failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No reader found on response body');

        let chunkBuffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          chunkBuffer += decoder.decode(value, { stream: true });
          
          const lines = chunkBuffer.split('\n\n');
          chunkBuffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') {
                showNotice('success', 'AI Generation completed successfully!');
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  showNotice('error', parsed.error);
                } else if (parsed.chunk) {
                  setGeneratedContent(prev => prev + parsed.chunk);
                  setDraftContent(prev => prev + parsed.chunk);
                }
              } catch {
                // Ignore parsing errors of partial chunks
              }
            }
          }
        }
        
        // After streaming is done, fetch history to get quality report
        fetchProductAiHistory(selectedProductId);
      } catch (err: any) {
        showNotice('error', err.message || 'Streaming generation failed.');
      } finally {
        setGenerating(false);
      }
    } else {
      try {
        const res = await apiFetch('/api/admin/ai/generate', {
          method: 'POST',
          body: JSON.stringify({
            productId: selectedProductId,
            promptKey: selectedPromptKey,
            customVars: parsedVars,
            stream: false
          })
        });

        if (res.ok) {
          const data = await res.json();
          setGeneratedContent(data.data.generatedText);
          setDraftContent(data.data.generatedText);
          setLatestResponseId(data.data._id);
          
          if (data.data.qualityScore !== undefined) {
            setEvaluationReport({
              overallScore: data.data.qualityScore,
              readability: data.data.qualityMetrics?.readability,
              uniqueness: data.data.qualityMetrics?.uniqueness,
              keywordCoverage: data.data.qualityMetrics?.keywordCoverage,
              safetyValidation: data.data.safetyValidation
            });
          }
          showNotice('success', 'AI Generation completed!');
        } else {
          const errData = await res.json();
          showNotice('error', errData.error || 'Failed to generate content.');
        }
      } catch {
        showNotice('error', 'Failed to communicate with generator.');
      } finally {
        setGenerating(false);
      }
    }
  };

  const fetchProductAiHistory = async (prodId: string) => {
    try {
      const res = await apiFetch(`/api/admin/ai/responses/${prodId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const latest = json.data[0];
          setLatestResponseId(latest._id);
          setEvaluationReport({
            overallScore: latest.qualityScore,
            readability: latest.qualityMetrics?.readability,
            uniqueness: latest.qualityMetrics?.uniqueness,
            keywordCoverage: latest.qualityMetrics?.keywordCoverage,
            safetyValidation: latest.safetyValidation
          });
        }
      }
    } catch {
      // safe fallback
    }
  };

  const handleRewrite = async () => {
    if (!draftContent) return showNotice('error', 'Draft content is empty.');
    setGenerating(true);
    try {
      const res = await apiFetch('/api/admin/ai/rewrite', {
        method: 'POST',
        body: JSON.stringify({
          text: draftContent,
          tone: rewriteTone
        })
      });
      if (res.ok) {
        const json = await res.json();
        setOriginalDraft(draftContent);
        setDraftContent(json.rewrittenText);
        showNotice('success', `Content rewritten in ${rewriteTone} tone.`);
      } else {
        const err = await res.json();
        showNotice('error', err.error || 'Rewrite failed.');
      }
    } catch {
      showNotice('error', 'Failed to rewrite draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!draftContent) return showNotice('error', 'Draft content is empty.');
    setGenerating(true);
    try {
      const res = await apiFetch('/api/admin/ai/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: draftContent,
          language: targetLang
        })
      });
      if (res.ok) {
        const json = await res.json();
        setOriginalDraft(draftContent);
        setDraftContent(json.translatedText);
        showNotice('success', `Translated draft to ${targetLang}.`);
      } else {
        const err = await res.json();
        showNotice('error', err.error || 'Translation failed.');
      }
    } catch {
      showNotice('error', 'Failed to translate draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (status: 'approved' | 'rejected' | 'published') => {
    if (!latestResponseId) return showNotice('error', 'No active generated response to evaluate.');
    try {
      const res = await apiFetch(`/api/admin/ai/responses/${latestResponseId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes: 'Admin review action'
        })
      });
      if (res.ok) {
        showNotice('success', `AI generation status updated to ${status}!`);
        loadAllData();
      } else {
        showNotice('error', 'Failed to approve/reject content.');
      }
    } catch {
      showNotice('error', 'Error in workflow review submission.');
    }
  };

  // Prompt Library actions
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/ai/prompts', {
        method: 'POST',
        body: JSON.stringify(editingPrompt)
      });
      if (res.ok) {
        showNotice('success', 'Prompt template saved successfully!');
        setEditingPrompt(null);
        setShowPromptForm(false);
        loadAllData();
      } else {
        showNotice('error', 'Failed to save template.');
      }
    } catch {
      showNotice('error', 'Error sending prompt data.');
    }
  };

  const handleRollbackPrompt = async (key: string, version: number) => {
    try {
      const res = await apiFetch('/api/admin/ai/prompts/rollback', {
        method: 'POST',
        body: JSON.stringify({ key, version })
      });
      if (res.ok) {
        showNotice('success', `Rolled back to version ${version} successfully!`);
        loadAllData();
      } else {
        showNotice('error', 'Rollback failed.');
      }
    } catch {
      showNotice('error', 'Failed to rollback.');
    }
  };

  // Provider Settings action
  const handleSaveProvider = async (pKey: string, payload: any) => {
    try {
      const res = await apiFetch('/api/admin/ai/providers', {
        method: 'POST',
        body: JSON.stringify({
          provider: pKey,
          ...payload
        })
      });
      if (res.ok) {
        showNotice('success', 'Provider configuration updated successfully!');
        loadAllData();
      } else {
        showNotice('error', 'Failed to save provider settings.');
      }
    } catch {
      showNotice('error', 'Error communicating provider config.');
    }
  };

  // Queue Batch launch
  const handleLaunchBatch = async () => {
    if (batchProductIds.length === 0) return showNotice('error', 'Select at least one product.');
    try {
      const res = await apiFetch('/api/admin/ai/queue/batch-enrich', {
        method: 'POST',
        body: JSON.stringify({
          productIds: batchProductIds,
          promptKey: batchPromptKey
        })
      });
      if (res.ok) {
        showNotice('success', 'Bulk AI enrichment job spawned successfully!');
        setBatchProductIds([]);
        loadAllData();
      } else {
        showNotice('error', 'Failed to trigger bulk job.');
      }
    } catch {
      showNotice('error', 'Error launching bulk run.');
    }
  };

  const handleJobControl = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      const res = await apiFetch(`/api/admin/ai/queue/${jobId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        showNotice('success', `Job state set to ${action}.`);
        loadAllData();
      } else {
        showNotice('error', 'Failed to execute job control action.');
      }
    } catch {
      showNotice('error', 'Error dispatching job control.');
    }
  };

  const handleClearCache = async () => {
    try {
      const res = await apiFetch('/api/admin/ai/cache/clear', {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (res.ok) {
        showNotice('success', 'AI response cache cleared successfully!');
      } else {
        showNotice('error', 'Failed to flush cache.');
      }
    } catch {
      showNotice('error', 'Error purging cache.');
    }
  };

  // Color mappings for provider tags
  const getProviderColor = (p: string) => {
    switch (p) {
      case 'gemini': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300';
      case 'openai': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300';
      case 'anthropic': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  // ==========================================
  // RENDER INTERFACE
  // ==========================================

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6 max-w-7xl mx-auto" id="ai-content-dashboard">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-100">AI Content Generation & Smart Intelligence</h1>
          </div>
          <p className="text-xs text-slate-400">
            Unified content orchestration hub using multiple state-of-the-art LLMs with integrated quality audits.
          </p>
        </div>
        
        {/* Top bar controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearCache}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            Clear AI Cache
          </button>
          <button 
            onClick={loadAllData}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Hub
          </button>
        </div>
      </div>

      {/* Primary tab switcher */}
      <div className="flex border-b border-slate-800 pb-0.5 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('assistant')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${activeTab === 'assistant' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          AI Copywriter
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${activeTab === 'prompts' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Prompt Library
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${activeTab === 'queue' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Bulk Runner
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${activeTab === 'analytics' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Cost & Stats
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${activeTab === 'settings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Engine Config
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Orchestrating model parameters, please wait...</p>
        </div>
      ) : (
        <div className="min-h-[450px]">
          {/* TAB 1: AI COPYWRITER (ASSISTANT) */}
          {activeTab === 'assistant' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Controls Column */}
              <div className="lg:col-span-4 bg-slate-950/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      fetchProductAiHistory(e.target.value);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-2 px-3 text-xs outline-none"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Prompt Template</label>
                  <select
                    value={selectedPromptKey}
                    onChange={(e) => setSelectedPromptKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-2 px-3 text-xs outline-none"
                  >
                    {prompts.map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Variables (JSON)</label>
                  <textarea
                    value={customVars}
                    onChange={(e) => setCustomVars(e.target.value)}
                    rows={3}
                    placeholder='{"key": "value"}'
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs font-mono outline-none"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                  <span className="text-xs text-slate-400">Stream Output in Real-Time</span>
                  <input
                    type="checkbox"
                    checked={useStreaming}
                    onChange={(e) => setUseStreaming(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-800 bg-slate-900 rounded outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-lg cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  {generating ? 'Processing Engine...' : 'Run Generation'}
                </button>

                {/* Live Quality Report panel */}
                {evaluationReport && (
                  <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Audited Quality Score</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${evaluationReport.overallScore >= 80 ? 'bg-green-950/80 text-green-400 border border-green-900' : 'bg-amber-950/80 text-amber-400 border border-amber-900'}`}>
                        {evaluationReport.overallScore} / 100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div>
                        <p className="text-slate-400">Readability</p>
                        <p className="font-semibold text-slate-200">{evaluationReport.readability?.gradeLevel || 'Excellent'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Density</p>
                        <p className="font-semibold text-slate-200">{evaluationReport.keywordCoverage?.densityPercentage || 0}%</p>
                      </div>
                    </div>

                    {!evaluationReport.safetyValidation?.passed && (
                      <div className="bg-amber-950/30 border border-amber-900/40 p-2.5 rounded-lg text-[10px] text-amber-400 space-y-1">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="font-bold uppercase tracking-wider">Quality Violations</span>
                        </div>
                        <ul className="list-disc pl-3.5">
                          {evaluationReport.safetyValidation?.issues?.map((issue: string, idx: number) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Output & Workspace panel */}
              <div className="lg:col-span-8 flex flex-col space-y-4">
                <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-200">Editor Playground</span>
                  </div>
                  {latestResponseId && (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleApprove('approved')}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-900 hover:bg-green-800 text-white rounded-md cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button 
                        onClick={() => handleApprove('rejected')}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-950 hover:bg-red-900 text-white rounded-md cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Main draft display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      <span>Source Model Output</span>
                      {generatedContent && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(generatedContent);
                            showNotice('success', 'Copied generated output!');
                          }}
                          className="hover:text-slate-200 text-slate-500 cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      )}
                    </div>
                    <textarea
                      value={generatedContent}
                      readOnly
                      placeholder="Your generated content will steam here..."
                      className="w-full h-80 bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-xs rounded-xl p-4 resize-none outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      <span>Draft Playpen & Side Editor</span>
                      {draftContent && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(draftContent);
                            showNotice('success', 'Copied active draft!');
                          }}
                          className="hover:text-slate-200 text-slate-500 cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      )}
                    </div>
                    <textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder="You can edit the draft here before saving..."
                      className="w-full h-80 bg-slate-950/80 border border-slate-800 text-slate-200 font-mono text-xs rounded-xl p-4 resize-none outline-none"
                    />
                  </div>
                </div>

                {/* Smart rewrite & translation actions bar */}
                <div className="bg-slate-950/55 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Smart Rewrite block */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Smart Rewrite Engine
                    </h3>
                    <div className="flex gap-2">
                      <select
                        value={rewriteTone}
                        onChange={(e) => setRewriteTone(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none flex-1"
                      >
                        <option value="shorter">Shorter (Condense)</option>
                        <option value="longer">Longer (Expand)</option>
                        <option value="professional">Professional Tone</option>
                        <option value="friendly">Friendly Copy</option>
                        <option value="technical">Technical Breakdown</option>
                        <option value="marketing">Sales Marketing</option>
                        <option value="humanized">Humanized Style</option>
                        <option value="seo">SEO Optimized</option>
                        <option value="beginner">Beginner Friendly</option>
                      </select>
                      <button
                        onClick={handleRewrite}
                        disabled={generating || !draftContent}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                      >
                        Rewrite
                      </button>
                    </div>
                  </div>

                  {/* Multi-Language Translation block */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-blue-400" />
                      Multi-Language Translation
                    </h3>
                    <div className="flex gap-2">
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none flex-1"
                      >
                        <option value="English">English</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Hindi">Hindi</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Spanish">Spanish</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Arabic">Arabic</option>
                      </select>
                      <button
                        onClick={handleTranslate}
                        disabled={generating || !draftContent}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-40"
                      >
                        Translate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROMPT LIBRARY */}
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                <div>
                  <h2 className="text-sm font-bold text-slate-200">Library Prompts Templates</h2>
                  <p className="text-xs text-slate-400">Create, edit, version control and rollback prompt variables dynamically.</p>
                </div>
                {!showPromptForm && (
                  <button
                    onClick={() => {
                      setEditingPrompt({
                        name: '',
                        key: '',
                        category: 'Descriptions',
                        systemInstruction: '',
                        promptText: '',
                        variables: ['productName']
                      });
                      setShowPromptForm(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-all"
                  >
                    + Create Template
                  </button>
                )}
              </div>

              {showPromptForm && editingPrompt && (
                <form onSubmit={handleSavePrompt} className="bg-slate-950/30 border border-slate-800 p-5 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">Configure AI Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Name</label>
                      <input
                        type="text"
                        value={editingPrompt.name}
                        onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unique Key Identifier</label>
                      <input
                        type="text"
                        value={editingPrompt.key}
                        onChange={(e) => setEditingPrompt({ ...editingPrompt, key: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                      <select
                        value={editingPrompt.category}
                        onChange={(e) => setEditingPrompt({ ...editingPrompt, category: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                      >
                        <option value="Descriptions">Descriptions</option>
                        <option value="Guides">Guides</option>
                        <option value="Reviews">Reviews</option>
                        <option value="Metadata">Metadata</option>
                        <option value="Comparison">Comparison</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Instructions</label>
                    <textarea
                      value={editingPrompt.systemInstruction || ''}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, systemInstruction: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prompt Template Text (Use curly brackets for params: {"{productName}"})</label>
                    <textarea
                      value={editingPrompt.promptText}
                      onChange={(e) => setEditingPrompt({ ...editingPrompt, promptText: e.target.value })}
                      rows={6}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs font-mono outline-none"
                      required
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPromptForm(false);
                        setEditingPrompt(null);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
                    >
                      Save Template
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 gap-4">
                {prompts.map(p => (
                  <div key={p._id} className="bg-slate-950/20 border border-slate-800/80 p-5 rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">{p.name}</span>
                          <span className="text-[9px] font-extrabold uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            {p.category}
                          </span>
                          <span className="text-[9px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-900 px-1.5 py-0.5 rounded">
                            v{p.version}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">Key: {p.key}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPrompt(p);
                            setShowPromptForm(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900/65 border border-slate-800/60 rounded-lg p-3 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                      {p.promptText}
                    </div>

                    {p.history && p.history.length > 1 && (
                      <div className="border-t border-slate-800/60 pt-3 mt-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Version History & Rollbacks</span>
                        <div className="space-y-1.5 max-h-24 overflow-y-auto">
                          {p.history.slice(0, -1).reverse().map((hist: any, hIdx: number) => (
                            <div key={hIdx} className="flex justify-between items-center text-[10px] bg-slate-900/40 p-1.5 rounded border border-slate-800/40">
                              <span className="text-slate-300">v{hist.version} - updated by {hist.updatedBy}</span>
                              <button
                                onClick={() => handleRollbackPrompt(p.key, hist.version)}
                                className="text-[9px] font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                              >
                                <History className="w-3 h-3" /> Rollback to this
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BULK RUNNER (BATCH QUEUE) */}
          {activeTab === 'queue' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Launcher */}
              <div className="lg:col-span-4 bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Launch Bulk Generation</h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select AI Prompt Template</label>
                  <select
                    value={batchPromptKey}
                    onChange={(e) => setBatchPromptKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-2 px-3 text-xs outline-none"
                  >
                    {prompts.map(pr => (
                      <option key={pr.key} value={pr.key}>{pr.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Products</label>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-56 overflow-y-auto space-y-2">
                    {products.map(p => (
                      <div key={p._id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchProductIds.includes(p._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBatchProductIds([...batchProductIds, p._id]);
                            } else {
                              setBatchProductIds(batchProductIds.filter(id => id !== p._id));
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 border-slate-800 bg-slate-900 rounded outline-none cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-300 truncate max-w-[200px]">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleLaunchBatch}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-2.5 rounded-lg cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  Launch Bulk Enrichment
                </button>
              </div>

              {/* Status table */}
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Background Job Execution Log</h3>
                <div className="bg-slate-950/20 border border-slate-800/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400">
                      <tr>
                        <th className="p-3">Job ID / Type</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Progress</th>
                        <th className="p-3">Processed</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {queue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">No active background AI jobs running.</td>
                        </tr>
                      ) : (
                        queue.map(job => (
                          <tr key={job._id} className="hover:bg-slate-900/40">
                            <td className="p-3">
                              <p className="font-semibold text-slate-200 truncate max-w-[150px]">{job._id}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Template: {job.promptKey}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                job.status === 'completed' ? 'bg-green-950/60 text-green-400' :
                                job.status === 'running' ? 'bg-blue-950/60 text-blue-400 animate-pulse' :
                                job.status === 'paused' ? 'bg-amber-950/60 text-amber-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="w-24 bg-slate-800 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }}></div>
                              </div>
                              <span className="text-[10px] text-slate-400">{job.progress}%</span>
                            </td>
                            <td className="p-3">
                              {job.processed} / {job.total}
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {job.status === 'running' && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'pause')}
                                  className="p-1 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded cursor-pointer transition-all"
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {job.status === 'paused' && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'resume')}
                                  className="p-1 hover:bg-slate-800 text-green-400 hover:text-green-300 rounded cursor-pointer transition-all"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {['waiting', 'running', 'paused'].includes(job.status) && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'cancel')}
                                  className="p-1 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded cursor-pointer transition-all"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {['completed', 'failed', 'cancelled'].includes(job.status) && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'retry')}
                                  className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded cursor-pointer transition-all"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COST & ANALYTICS */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              {/* Analytics grid cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Requests</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{analytics.totalRequests}</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Success Rate</p>
                  <p className="text-xl font-bold text-green-400 mt-1">{analytics.successRate}%</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Tokens</p>
                  <p className="text-xl font-bold text-indigo-400 mt-1">{analytics.totalTokens}</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Estimated Cost</p>
                  <p className="text-xl font-bold text-purple-400 mt-1">${Number(analytics.estimatedCost).toFixed(4)}</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Avg Latency</p>
                  <p className="text-xl font-bold text-amber-400 mt-1">{analytics.averageResponseTime}ms</p>
                </div>
              </div>

              {/* Charts block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Provider Breakdown (Request Share)</h3>
                  <div className="h-64">
                    {analytics.providerUsage && analytics.providerUsage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.providerUsage}>
                          <XAxis dataKey="_id" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                            {analytics.providerUsage.map((entry: any, index: number) => {
                              const colors = ['#818cf8', '#34d399', '#f87171', '#fbbf24', '#c084fc'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">Not enough telemetry data.</div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estimated Cost Usage (by Model)</h3>
                  <div className="h-64">
                    {analytics.providerUsage && analytics.providerUsage.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.providerUsage}>
                          <XAxis dataKey="_id" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                          <Bar dataKey="cost" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">Not enough telemetry data.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ENGINE CONFIG (SETTINGS) */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                <h2 className="text-sm font-bold text-slate-200">AI LLM Model Providers Configuration</h2>
                <p className="text-xs text-slate-400">Manage credentials and temperature parameters securely. API Keys are fully encrypted at rest.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {providers.map(prov => (
                  <div key={prov.provider} className="bg-slate-950/20 border border-slate-800/80 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${getProviderColor(prov.provider)}`}>
                          {prov.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Active</span>
                        <input
                          type="checkbox"
                          checked={prov.isActive}
                          onChange={(e) => {
                            const updated = providers.map(p => p.provider === prov.provider ? { ...p, isActive: e.target.checked } : p);
                            setProviders(updated);
                            handleSaveProvider(prov.provider, { ...prov, isActive: e.target.checked });
                          }}
                          className="w-4 h-4 text-indigo-600 border-slate-800 bg-slate-900 rounded outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Model Name</label>
                          <input
                            type="text"
                            value={prov.model}
                            onChange={(e) => {
                              const updated = providers.map(p => p.provider === prov.provider ? { ...p, model: e.target.value } : p);
                              setProviders(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Temperature</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={prov.temperature}
                            onChange={(e) => {
                              const updated = providers.map(p => p.provider === prov.provider ? { ...p, temperature: Number(e.target.value) } : p);
                              setProviders(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                          />
                        </div>
                      </div>

                      {prov.provider !== 'gemini' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Base URL Endpoints</label>
                          <input
                            type="text"
                            value={prov.baseUrl || ''}
                            onChange={(e) => {
                              const updated = providers.map(p => p.provider === prov.provider ? { ...p, baseUrl: e.target.value } : p);
                              setProviders(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Credential Token (API Key)</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={prov.apiKey || ''}
                            onChange={(e) => {
                              const updated = providers.map(p => p.provider === prov.provider ? { ...p, apiKey: e.target.value } : p);
                              setProviders(updated);
                            }}
                            placeholder="••••••••••••••••••••"
                            className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-2 pl-3 pr-10 text-xs outline-none"
                          />
                          <Key className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                        </div>
                      </div>

                      <button
                        onClick={() => handleSaveProvider(prov.provider, prov)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 py-2 rounded-lg cursor-pointer text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Settings
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
