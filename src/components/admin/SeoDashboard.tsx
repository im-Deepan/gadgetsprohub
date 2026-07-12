import React, { useState, useEffect } from 'react';
import { 
  Globe, Search, AlertCircle, BookOpen, Link, FileText, 
  CheckCircle2, Sparkles, RefreshCw, Trash2, Plus, 
  ArrowRight, Share2, Code, HelpCircle, Activity, Save, Edit
} from 'lucide-react';
import { apiFetch } from '../../utils/apiClient';

interface SeoDashboardProps {
  token: string;
}

interface ProductSeo {
  _id: string;
  name: string;
  slug: string;
  description: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  focusKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  robotsMeta?: string;
  seoScore?: number;
  seoSuggestions?: string[];
  publishingStatus?: string;
  faqs?: Array<{ question: string; answer: string; category: string }>;
  breadcrumb?: string[];
  openGraph?: { title?: string; description?: string; image?: string };
  twitterCard?: { card?: string; title?: string; description?: string; image?: string };
}

interface RedirectRule {
  _id: string;
  sourceUrl: string;
  targetUrl: string;
  type: number;
  hits: number;
  createdAt: string;
}

export const SeoDashboard: React.FC<SeoDashboardProps> = ({ token }) => {
  const [products, setProducts] = useState<ProductSeo[]>([]);
  const [redirects, setRedirects] = useState<RedirectRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all'); // all, low (<60), mid (60-80), high (>80)

  // Selected Product & SEO Edit states
  const [selectedProduct, setSelectedProduct] = useState<ProductSeo | null>(null);
  const [seoForm, setSeoForm] = useState<{
    seoTitle: string;
    seoDescription: string;
    focusKeyword: string;
    secondaryKeywords: string;
    canonicalUrl: string;
    robotsMeta: string;
    slug: string;
    publishingStatus: string;
    faqs: Array<{ question: string; answer: string; category: string }>;
    openGraphTitle: string;
    openGraphDescription: string;
    openGraphImage: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
    twitterCardType: string;
  } | null>(null);

  // Analysis / Recommendation states for Selected Product
  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'readability' | 'linking' | 'schema'>('editor');

  // Manual redirect rule input state
  const [newRedirect, setNewRedirect] = useState({ sourceUrl: '', targetUrl: '', type: 301 });
  const [savingRedirect, setSavingRedirect] = useState(false);

  // General Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch products
      const pRes = await apiFetch('/api/products?limit=100');
      if (pRes.ok) {
        const pData = await pRes.json();
        const productsList = Array.isArray(pData) ? pData : (pData.products || []);
        setProducts(productsList);
      }
      // Fetch redirects
      const rRes = await apiFetch('/api/admin/seo/redirects');
      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData && rData.success) {
          setRedirects(rData.data);
        }
      }
    } catch (err: any) {
      showNotice('error', 'Failed to retrieve SEO data.');
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Run SEO Audit / Readability Analysis for a specific product
  const loadProductAnalysis = async (prod: ProductSeo) => {
    setAnalyzing(true);
    setActiveTab('editor');
    try {
      const res = await apiFetch(`/api/admin/seo/analyze/${prod._id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setAnalysis(data.data);
        }
      }
      
      const recsRes = await apiFetch(`/api/admin/seo/recommendations/${prod._id}`);
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        if (recsData && recsData.success) {
          setRecommendations(recsData.data);
        }
      }

      const schemaRes = await apiFetch(`/api/seo/schema/${prod._id}`);
      if (schemaRes.ok) {
        const schemaDataJson = await schemaRes.json();
        if (schemaDataJson && schemaDataJson.success) {
          setSchemaData(schemaDataJson.data);
        }
      }
    } catch (err) {
      showNotice('error', 'Failed to calculate product SEO audit.');
    } finally {
      setAnalyzing(false);
    }
  };

  const selectProductForSeo = (prod: ProductSeo) => {
    setSelectedProduct(prod);
    setSeoForm({
      seoTitle: prod.seoTitle || '',
      seoDescription: prod.seoDescription || '',
      focusKeyword: prod.focusKeyword || '',
      secondaryKeywords: prod.secondaryKeywords?.join(', ') || '',
      canonicalUrl: prod.canonicalUrl || '',
      robotsMeta: prod.robotsMeta || 'index, follow',
      slug: prod.slug || '',
      publishingStatus: prod.publishingStatus || 'draft',
      faqs: prod.faqs || [],
      openGraphTitle: prod.openGraph?.title || '',
      openGraphDescription: prod.openGraph?.description || '',
      openGraphImage: prod.openGraph?.image || '',
      twitterTitle: prod.twitterCard?.title || '',
      twitterDescription: prod.twitterCard?.description || '',
      twitterImage: prod.twitterCard?.image || '',
      twitterCardType: prod.twitterCard?.card || 'summary_large_image'
    });
    loadProductAnalysis(prod);
  };

  // AI assistant copywriter using Gemini
  const generateAiSeoContent = async () => {
    if (!selectedProduct) return;
    setAiGenerating(true);
    try {
      const res = await apiFetch('/api/admin/seo/generate-ai', {
        method: 'POST',
        body: JSON.stringify({
          productName: selectedProduct.name,
          description: selectedProduct.description,
          brand: (selectedProduct as any).brand || '',
          category: typeof (selectedProduct as any).category === 'object' ? (selectedProduct as any).category?.name : '',
          keywords: seoForm?.focusKeyword ? [seoForm.focusKeyword] : []
        })
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.success) {
          const data = resData.data;
          setSeoForm(prev => {
            if (!prev) return null;
            return {
              ...prev,
              seoTitle: data.seoTitle,
              seoDescription: data.seoDescription,
              focusKeyword: data.focusKeyword,
              secondaryKeywords: data.secondaryKeywords.join(', '),
              faqs: data.faqs
            };
          });
          showNotice('success', 'Gemini AI SEO suggestions applied to the form!');
        }
      }
    } catch (err) {
      showNotice('error', 'Gemini AI assistant failed to respond.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Rebuild the global XML sitemap.xml
  const triggerSitemapBuild = async () => {
    try {
      const res = await apiFetch('/api/admin/seo/sitemap/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          showNotice('success', 'XML sitemap.xml generated and updated successfully!');
        }
      }
    } catch (err) {
      showNotice('error', 'Failed to rebuild sitemap.');
    }
  };

  // Add a manual FAQ row to the product FAQ editor
  const addFaqRow = () => {
    if (!seoForm) return;
    setSeoForm({
      ...seoForm,
      faqs: [...seoForm.faqs, { question: '', answer: '', category: 'Usage' }]
    });
  };

  // Remove FAQ row
  const removeFaqRow = (idx: number) => {
    if (!seoForm) return;
    const nextFaqs = [...seoForm.faqs];
    nextFaqs.splice(idx, 1);
    setSeoForm({
      ...seoForm,
      faqs: nextFaqs
    });
  };

  // Handle manual Redirect addition
  const handleAddRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRedirect.sourceUrl || !newRedirect.targetUrl) return;
    setSavingRedirect(true);
    try {
      const res = await apiFetch('/api/admin/seo/redirects', {
        method: 'POST',
        body: JSON.stringify(newRedirect)
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.success) {
          setRedirects(prev => [resData.data, ...prev]);
          setNewRedirect({ sourceUrl: '', targetUrl: '', type: 301 });
          showNotice('success', 'Redirect rule added!');
        }
      }
    } catch (err) {
      showNotice('error', 'Failed to add redirect rule.');
    } finally {
      setSavingRedirect(false);
    }
  };

  // Handle Redirect deletion
  const handleDeleteRedirect = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/seo/redirects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.success) {
          setRedirects(prev => prev.filter(r => r._id !== id));
          showNotice('success', 'Redirect rule deleted.');
        }
      }
    } catch (err) {
      showNotice('error', 'Failed to delete redirect rule.');
    }
  };

  // Save the modified SEO settings back to MongoDB
  const handleSaveSeoSettings = async () => {
    if (!selectedProduct || !seoForm) return;
    setSavingSeo(true);
    try {
      const res = await apiFetch(`/api/admin/seo/save/${selectedProduct._id}`, {
        method: 'POST',
        body: JSON.stringify({
          seoTitle: seoForm.seoTitle,
          seoDescription: seoForm.seoDescription,
          seoKeywords: seoForm.secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
          focusKeyword: seoForm.focusKeyword,
          secondaryKeywords: seoForm.secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
          canonicalUrl: seoForm.canonicalUrl,
          robotsMeta: seoForm.robotsMeta,
          slug: seoForm.slug,
          publishingStatus: seoForm.publishingStatus,
          faqs: seoForm.faqs,
          openGraph: {
            title: seoForm.openGraphTitle,
            description: seoForm.openGraphDescription,
            image: seoForm.openGraphImage
          },
          twitterCard: {
            card: seoForm.twitterCardType,
            title: seoForm.twitterTitle,
            description: seoForm.twitterDescription,
            image: seoForm.twitterImage
          }
        })
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.success) {
          showNotice('success', 'Product SEO settings saved successfully!');
          setSelectedProduct(resData.data);
          // Update product in general list
          setProducts(prev => prev.map(p => p._id === resData.data._id ? resData.data : p));
          loadProductAnalysis(resData.data);
        }
      }
    } catch (err) {
      showNotice('error', 'Failed to save SEO metadata.');
    } finally {
      setSavingSeo(false);
    }
  };

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.focusKeyword && p.focusKeyword.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || p.publishingStatus === statusFilter;
    
    const score = p.seoScore || 0;
    const matchesScore = scoreFilter === 'all' || 
                         (scoreFilter === 'low' && score < 60) ||
                         (scoreFilter === 'mid' && score >= 60 && score <= 80) ||
                         (scoreFilter === 'high' && score > 80);

    return matchesSearch && matchesStatus && matchesScore;
  });

  // Calculate high-level stats
  const totalPages = products.length;
  const avgSeoScore = products.length > 0 ? Math.round(products.reduce((acc, p) => acc + (p.seoScore || 0), 0) / products.length) : 0;
  const totalRedirects = redirects.length;
  const draftPages = products.filter(p => p.publishingStatus === 'draft' || !p.publishingStatus).length;

  return (
    <div className="space-y-6">
      {/* Notifications Alert */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-xs font-medium font-sans">{notification.message}</span>
        </div>
      )}

      {/* High level stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-slate-400 font-medium">Average Catalog SEO Score</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${
              avgSeoScore > 80 ? 'text-emerald-500' : avgSeoScore > 60 ? 'text-amber-500' : 'text-rose-500'
            }`}>{avgSeoScore}%</p>
          </div>
          <Activity className="h-8 w-8 text-slate-300 shrink-0" />
        </div>
        <div className="bg-white dark:bg-zinc-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-slate-400 font-medium">Pages Logged</p>
            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">{totalPages}</p>
          </div>
          <Globe className="h-8 w-8 text-slate-300 shrink-0" />
        </div>
        <div className="bg-white dark:bg-zinc-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Drafts</p>
            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">{draftPages}</p>
          </div>
          <FileText className="h-8 w-8 text-slate-300 shrink-0" />
        </div>
        <div className="bg-white dark:bg-zinc-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Redirect Rules</p>
            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">{totalRedirects}</p>
          </div>
          <Share2 className="h-8 w-8 text-slate-300 shrink-0" />
        </div>
      </div>

      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Publishing Tools & Indexing Engine</h2>
          <p className="text-[11px] text-slate-400">Rebuild the sitemap, audit readability metrics, or optimize titles with Gemini AI</p>
        </div>
        <button
          onClick={triggerSitemapBuild}
          className="flex items-center gap-2 bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800 px-4 py-2 rounded-lg cursor-pointer text-xs font-bold transition-transform hover:scale-[1.02]"
        >
          <RefreshCw className="h-4 w-4" />
          Rebuild xml sitemap
        </button>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Catalog specs listing (4 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-850 rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-50 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Catalog Audit list</h3>
            <span className="text-[10px] font-mono text-slate-400">{filteredProducts.length} entries matching</span>
          </div>

          {/* Search and filtering */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog by name, focus word..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="p-2 text-[11px] font-sans border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-600 dark:text-slate-300 rounded-lg"
              >
                <option value="all">All statuses</option>
                <option value="draft">Drafts</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={scoreFilter}
                onChange={e => setScoreFilter(e.target.value)}
                className="p-2 text-[11px] font-sans border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-600 dark:text-slate-300 rounded-lg"
              >
                <option value="all">All SEO Scores</option>
                <option value="low">Underdeveloped (&lt;60%)</option>
                <option value="mid">Growing (60%-80%)</option>
                <option value="high">Excellent (&gt;80%)</option>
              </select>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map(p => {
              const score = p.seoScore || 0;
              return (
                <div
                  key={p._id}
                  onClick={() => selectProductForSeo(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedProduct?._id === p._id 
                      ? 'border-slate-800 bg-slate-50/70 dark:border-slate-200 dark:bg-zinc-800/40' 
                      : 'border-slate-50 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-zinc-800/20'
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono font-bold uppercase ${
                        p.publishingStatus === 'published' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                          : 'bg-slate-50 text-slate-600 dark:bg-zinc-900/60 dark:text-slate-400'
                      }`}>
                        {p.publishingStatus || 'draft'}
                      </span>
                      {p.focusKeyword && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px] font-sans">
                          🔑 {p.focusKeyword}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${
                      score > 80 ? 'text-emerald-500' : score > 60 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {score}%
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase font-sans">Score</span>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No matching product specifications found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SEO Assistant & Fields Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedProduct ? (
            <div className="bg-white dark:bg-zinc-850 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
              
              {/* Product title header & publishing status widget */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Selected Specs entry</span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedProduct.name}</h4>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">SEO Grade</span>
                    <span className={`text-xs font-mono font-bold ${
                      (selectedProduct.seoScore || 0) > 80 ? 'text-emerald-500' : (selectedProduct.seoScore || 0) > 60 ? 'text-amber-500' : 'text-rose-500'
                    }`}>{selectedProduct.seoScore || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Sub-tabs selector for detail views */}
              <div className="flex border-b border-slate-50 dark:border-slate-800 pb-2 gap-4">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`text-xs font-bold cursor-pointer transition-colors pb-1 border-b-2 ${
                    activeTab === 'editor' ? 'border-slate-800 text-slate-800 dark:border-slate-50 dark:text-slate-100' : 'border-transparent text-slate-400'
                  }`}
                >
                  📝 Meta Editor
                </button>
                <button
                  onClick={() => setActiveTab('readability')}
                  className={`text-xs font-bold cursor-pointer transition-colors pb-1 border-b-2 ${
                    activeTab === 'readability' ? 'border-slate-800 text-slate-800 dark:border-slate-50 dark:text-slate-100' : 'border-transparent text-slate-400'
                  }`}
                >
                  📖 Readability & Quality
                </button>
                <button
                  onClick={() => setActiveTab('linking')}
                  className={`text-xs font-bold cursor-pointer transition-colors pb-1 border-b-2 ${
                    activeTab === 'linking' ? 'border-slate-800 text-slate-800 dark:border-slate-50 dark:text-slate-100' : 'border-transparent text-slate-400'
                  }`}
                >
                  🔗 Links ({recommendations.length})
                </button>
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`text-xs font-bold cursor-pointer transition-colors pb-1 border-b-2 ${
                    activeTab === 'schema' ? 'border-slate-800 text-slate-800 dark:border-slate-50 dark:text-slate-100' : 'border-transparent text-slate-400'
                  }`}
                >
                  💻 JSON-LD Schema
                </button>
              </div>

              {analyzing ? (
                <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
                  Analyzing copywriting metadata structures...
                </div>
              ) : (
                <>
                  {/* TAB 1: METADATA & FAQ EDITOR */}
                  {activeTab === 'editor' && seoForm && (
                    <div className="space-y-6">
                      
                      {/* AI Copilot Suggestion Box */}
                      <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-100/40 dark:border-violet-800/30 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                            Gemini AI SEO Assistant
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Auto-create highly engaging SEO metadata, introductions, CTAs, and FAQs with Gemini on demand.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={generateAiSeoContent}
                          disabled={aiGenerating}
                          className="shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
                        >
                          {aiGenerating ? 'Writing...' : 'Generate with Gemini'}
                        </button>
                      </div>

                      {/* Main input fields */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Focus Keyword</label>
                            <input
                              type="text"
                              value={seoForm.focusKeyword}
                              onChange={e => setSeoForm({ ...seoForm, focusKeyword: e.target.value })}
                              placeholder="e.g. noise cancelling earbuds"
                              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Secondary Keywords</label>
                            <input
                              type="text"
                              value={seoForm.secondaryKeywords}
                              onChange={e => setSeoForm({ ...seoForm, secondaryKeywords: e.target.value })}
                              placeholder="Comma-separated e.g. review, battery life, bass sound"
                              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Product Slug</label>
                            <input
                              type="text"
                              value={seoForm.slug}
                              onChange={e => setSeoForm({ ...seoForm, slug: e.target.value })}
                              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-slate-100 focus:outline-hidden"
                            />
                            <span className="text-[9px] text-slate-400 block">Changing slug automatically sets up a 301 redirect.</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Publishing workflow status</label>
                            <select
                              value={seoForm.publishingStatus}
                              onChange={e => setSeoForm({ ...seoForm, publishingStatus: e.target.value })}
                              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                            >
                              <option value="draft">Draft (Offline spec review)</option>
                              <option value="in_review">In Review</option>
                              <option value="approved">Approved</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="published">Published (Google indexed)</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">SEO Title Tag</label>
                            <span className={`text-[9px] font-mono ${
                              seoForm.seoTitle.length >= 50 && seoForm.seoTitle.length <= 65 ? 'text-emerald-500' : 'text-amber-500'
                            }`}>{seoForm.seoTitle.length} / 65 ideal</span>
                          </div>
                          <input
                            type="text"
                            value={seoForm.seoTitle}
                            onChange={e => setSeoForm({ ...seoForm, seoTitle: e.target.value })}
                            placeholder="Enticing Title incorporating key terms"
                            className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-slate-100 focus:outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Meta Description</label>
                            <span className={`text-[9px] font-mono ${
                              seoForm.seoDescription.length >= 120 && seoForm.seoDescription.length <= 160 ? 'text-emerald-500' : 'text-amber-500'
                            }`}>{seoForm.seoDescription.length} / 160 ideal</span>
                          </div>
                          <textarea
                            value={seoForm.seoDescription}
                            onChange={e => setSeoForm({ ...seoForm, seoDescription: e.target.value })}
                            placeholder="Brief search result preview, must contain high intent terms."
                            rows={3}
                            className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-slate-100 focus:outline-hidden"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Canonical URL</label>
                            <input
                              type="text"
                              value={seoForm.canonicalUrl}
                              onChange={e => setSeoForm({ ...seoForm, canonicalUrl: e.target.value })}
                              placeholder="https://mysite.com/product/slug"
                              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Robots Meta tag</label>
                            <input
                              type="text"
                              value={seoForm.robotsMeta}
                              onChange={e => setSeoForm({ ...seoForm, robotsMeta: e.target.value })}
                              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-slate-100 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* OpenGraph and Twitter Previews */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
                          <h5 className="text-[10px] uppercase font-bold text-slate-400">Social sharing meta (OpenGraph / Twitter)</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono text-slate-400 uppercase">Facebook / OG Title</label>
                              <input
                                type="text"
                                value={seoForm.openGraphTitle}
                                onChange={e => setSeoForm({ ...seoForm, openGraphTitle: e.target.value })}
                                placeholder={seoForm.seoTitle}
                                className="w-full p-2 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100"
                              />
                              <label className="text-[10px] font-mono text-slate-400 uppercase block mt-2">Facebook / OG Image URL</label>
                              <input
                                type="text"
                                value={seoForm.openGraphImage}
                                onChange={e => setSeoForm({ ...seoForm, openGraphImage: e.target.value })}
                                placeholder="https://..."
                                className="w-full p-2 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-mono text-slate-400 uppercase">Twitter Card Title</label>
                              <input
                                type="text"
                                value={seoForm.twitterTitle}
                                onChange={e => setSeoForm({ ...seoForm, twitterTitle: e.target.value })}
                                placeholder={seoForm.seoTitle}
                                className="w-full p-2 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100"
                              />
                              <label className="text-[10px] font-mono text-slate-400 uppercase block mt-2">Twitter Card Image URL</label>
                              <input
                                type="text"
                                value={seoForm.twitterImage}
                                onChange={e => setSeoForm({ ...seoForm, twitterImage: e.target.value })}
                                placeholder="https://..."
                                className="w-full p-2 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900/30 text-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>

                        {/* FAQs editor section */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-50 dark:border-slate-800">
                            <h5 className="text-[10px] uppercase font-bold text-slate-400">Structured FAQs automation</h5>
                            <button
                              type="button"
                              onClick={addFaqRow}
                              className="text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded"
                            >
                              <Plus className="h-3 w-3" /> Add FAQ
                            </button>
                          </div>
                          
                          {seoForm.faqs.map((faq, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 dark:bg-zinc-900/20 rounded-lg relative space-y-2">
                              <button
                                type="button"
                                onClick={() => removeFaqRow(idx)}
                                className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2 space-y-1">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">Question</span>
                                  <input
                                    type="text"
                                    value={faq.question}
                                    onChange={e => {
                                      const nextFaqs = [...seoForm.faqs];
                                      nextFaqs[idx].question = e.target.value;
                                      setSeoForm({ ...seoForm, faqs: nextFaqs });
                                    }}
                                    className="w-full p-1.5 text-xs border border-slate-100 dark:border-slate-800 rounded bg-white dark:bg-zinc-800"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">Category</span>
                                  <select
                                    value={faq.category}
                                    onChange={e => {
                                      const nextFaqs = [...seoForm.faqs];
                                      nextFaqs[idx].category = e.target.value;
                                      setSeoForm({ ...seoForm, faqs: nextFaqs });
                                    }}
                                    className="w-full p-1.5 text-xs border border-slate-100 dark:border-slate-800 rounded bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300"
                                  >
                                    <option value="Usage">Usage</option>
                                    <option value="Warranty">Warranty</option>
                                    <option value="Compatibility">Compatibility</option>
                                    <option value="Shipping">Shipping</option>
                                    <option value="Returns">Returns</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Answer</span>
                                <textarea
                                  value={faq.answer}
                                  onChange={e => {
                                    const nextFaqs = [...seoForm.faqs];
                                    nextFaqs[idx].answer = e.target.value;
                                    setSeoForm({ ...seoForm, faqs: nextFaqs });
                                  }}
                                  rows={2}
                                  className="w-full p-1.5 text-xs border border-slate-100 dark:border-slate-800 rounded bg-white dark:bg-zinc-800"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suggestions and saves */}
                      {analysis?.suggestions && analysis.suggestions.length > 0 && (
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100/30 dark:border-amber-800/20 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">Critical SEO Actions</span>
                          <ul className="space-y-1.5 list-disc list-inside">
                            {analysis.suggestions.map((sug: string, i: number) => (
                              <li key={i} className="text-[10px] text-slate-500 dark:text-slate-400">{sug}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end pt-4 border-t border-slate-50 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={handleSaveSeoSettings}
                          disabled={savingSeo}
                          className="flex items-center gap-2 bg-slate-800 text-white dark:bg-slate-50 dark:text-slate-800 px-6 py-2.5 rounded-lg cursor-pointer text-xs font-bold transition-transform hover:scale-[1.02]"
                        >
                          <Save className="h-4 w-4" />
                          {savingSeo ? 'Saving Settings...' : 'Save SEO configurations'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: READABILITY & QUALITY ENGINE */}
                  {activeTab === 'readability' && analysis?.readability && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase">Readability Ease</span>
                          <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">{analysis.readability.score}%</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase">Reading Grade</span>
                          <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">{analysis.readability.gradeLevel}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase">Keyword Density</span>
                          <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">{analysis.readability.keywordDensity}%</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-slate-50 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase">Passive Voice</span>
                          <p className="text-lg font-mono font-bold text-slate-800 dark:text-slate-100 mt-1">{analysis.readability.passiveVoicePercentage}%</p>
                        </div>
                      </div>

                      <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3">
                        <h5 className="text-[10px] uppercase font-bold text-slate-400">Wordplay stats</h5>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block">Total word count</span>
                            <span className="font-mono font-bold">{analysis.readability.wordCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Sentence count</span>
                            <span className="font-mono font-bold">{analysis.readability.sentenceCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Avg sentence length</span>
                            <span className="font-mono font-bold">{Math.round(analysis.readability.avgSentenceLength)} words</span>
                          </div>
                        </div>
                      </div>

                      {analysis.readability.suggestions?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-rose-500 block">Readability Warnings</span>
                          <div className="space-y-2">
                            {analysis.readability.suggestions.map((sug: string, i: number) => (
                              <div key={i} className="flex gap-2 items-start text-xs text-slate-600 dark:text-slate-300">
                                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                                <span>{sug}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analysis.brokenAssets && (
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
                          <h5 className="text-[10px] uppercase font-bold text-slate-400">Broken Asset Scan</h5>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                              <span className="text-slate-400">Missing image ALT texts:</span>
                              <span className="font-bold">{analysis.brokenAssets.missingAlts ? '⚠️ Yes (Missing coverage)' : '✅ Perfect ALT descriptions'}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400 block">Broken external links found:</span>
                              {analysis.brokenAssets.brokenLinks?.length > 0 ? (
                                analysis.brokenAssets.brokenLinks.map((link: string, i: number) => (
                                  <div key={i} className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded text-[10px] font-mono break-all">{link}</div>
                                ))
                              ) : (
                                <span className="text-emerald-500 font-bold block">No broken external hyper-links found.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: INTERNAL LINK RECOMMENDATIONS */}
                  {activeTab === 'linking' && (
                    <div className="space-y-4">
                      <div className="pb-2 border-b border-slate-50 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Recommended Internal Anchor links</span>
                        <p className="text-[11px] text-slate-500">Suggested targeted contextual anchor texts to add in blogs/other items to backlink here.</p>
                      </div>

                      {recommendations.length > 0 ? (
                        <div className="space-y-3">
                          {recommendations.map((rec, i) => (
                            <div key={i} className="p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-50 dark:border-slate-800 flex items-center justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">{rec.name}</span>
                                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase ${
                                    rec.relationType === 'brand' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                                  }`}>{rec.relationType}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block">Anchor suggestion: "{rec.anchorText}"</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs font-mono font-bold text-emerald-500">{rec.confidence}%</span>
                                <span className="text-[9px] text-slate-400 block">Confidence</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          No logical related target catalog items found to internal link.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SCHEMA PREVIEW */}
                  {activeTab === 'schema' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Google Rich Snippet Structured JSON-LD</span>
                        <span className="text-[10px] text-emerald-500 font-bold uppercase">✅ Google search approved formats</span>
                      </div>
                      
                      {schemaData ? (
                        <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-[400px]">
                          {JSON.stringify(schemaData, null, 2)}
                        </pre>
                      ) : (
                        <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
                          Loading structured schema preview...
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-850 rounded-xl border border-slate-100 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
              <Globe className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              Select a catalog entry from the left list to begin search marketing, editing slugs, and optimizing content with Gemini AI.
            </div>
          )}
        </div>
      </div>

      {/* Redirect Manager Console */}
      <div className="bg-white dark:bg-zinc-850 rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6">
        <div className="pb-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">301 / 302 URL Redirect rules manager</h3>
            <p className="text-[11px] text-slate-400">Map outdated or deleted catalog paths safely to prevent 404 search penalties.</p>
          </div>
        </div>

        {/* Manual Redirect Rule Adder Form */}
        <form onSubmit={handleAddRedirect} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Source path</label>
            <input
              type="text"
              placeholder="/product/old-slug"
              value={newRedirect.sourceUrl}
              onChange={e => setNewRedirect({ ...newRedirect, sourceUrl: e.target.value })}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Target path</label>
            <input
              type="text"
              placeholder="/product/new-slug"
              value={newRedirect.targetUrl}
              onChange={e => setNewRedirect({ ...newRedirect, targetUrl: e.target.value })}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Redirect type</label>
            <select
              value={newRedirect.type}
              onChange={e => setNewRedirect({ ...newRedirect, type: Number(e.target.value) })}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 focus:outline-hidden"
            >
              <option value={301}>301 Permanent Redirect</option>
              <option value={302}>302 Temporary Redirect</option>
              <option value={410}>410 Content Gone</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={savingRedirect}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-800 dark:hover:bg-slate-100 p-2.5 rounded-lg cursor-pointer text-xs font-bold transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </form>

        {/* Redirect Rules table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-500 dark:text-slate-400">
            <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-50 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Source URL</th>
                <th className="py-3 px-4">Target URL</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Hits Counter</th>
                <th className="py-3 px-4 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {redirects.map(r => (
                <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10">
                  <td className="py-3 px-4 font-mono text-[10px] text-rose-500">{r.sourceUrl}</td>
                  <td className="py-3 px-4 font-mono text-[10px] text-emerald-500">{r.targetUrl}</td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-50 text-slate-600 dark:bg-zinc-900/60 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-bold text-[9px]">
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">{r.hits || 0} hits</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteRedirect(r._id)}
                      className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {redirects.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No active 301/302 redirects logged in MongoDB database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
