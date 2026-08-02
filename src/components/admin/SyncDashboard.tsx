import React, { useState, useEffect } from 'react';
import { 
  Sparkles, RefreshCw, Play, Pause, Ban, AlertTriangle, Check, X, Bell, 
  Activity, Shield, List, TrendingDown, Heart, FileText, ChevronRight, 
  Settings, Clock, ArrowRight, Save, Trash2, Link2, Info, Compass, ShieldAlert,
  BarChart2, HelpCircle, Coins, Download, Zap, CheckCircle2, ArrowDownRight,
  Layers, FileSpreadsheet, FileCode, RotateCcw, PieChart as PieChartIcon
} from 'lucide-react';
import { apiFetch } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from 'recharts';

interface SyncDashboardProps {
  token?: string;
  showNotice?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function SyncDashboard({ token, showNotice = () => {} }: SyncDashboardProps) {
  const { token: authContextToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'scanner' | 'overview' | 'scheduler' | 'health' | 'rules' | 'audits' | 'marketplace'>('scanner');

  // Descending Price Scanner (1:00 AM Flow) State
  const [scannerState, setScannerState] = useState<any>({
    isRunning: false,
    isPaused: false,
    lastRunStartTime: null,
    lastScanCompletedTime: null,
    nextScheduledRunTime: null,
    fastMode: false,
    intervalRangeMinutes: [5, 7],
    totalProducts: 0,
    productsChecked: 0,
    productsRemaining: 0,
    productsUpdated: 0,
    productsUnchanged: 0,
    productsFailed: 0,
    currentlyScanning: null,
    scannedProductIds: [],
    logs: []
  });
  
  // Phase 11: Multi-Marketplace & Universal Import States
  const [mAnalytics, setMAnalytics] = useState<any>({ totalProducts: 0, overallSuccessRate: 0, providersCount: 0, providers: [] });
  const [mProviders, setMProviders] = useState<any[]>([]);
  const [mSettings, setMSettings] = useState<any[]>([]);
  const [mAffiliates, setMAffiliates] = useState<any[]>([]);
  const [mHealth, setMHealth] = useState<any[]>([]);
  const [mLogs, setMLogs] = useState<any[]>([]);
  const [mCurrencies, setMCurrencies] = useState<any>({ baseCurrency: 'USD', rates: {} });

  // Single / Bulk Importer Form States
  const [singleUrl, setSingleUrl] = useState<string>('');
  const [singleCategory, setSingleCategory] = useState<string>('');
  const [bulkUrlsText, setBulkUrlsText] = useState<string>('');
  const [detectedProv, setDetectedProv] = useState<string>('Autodetecting...');
  const [importingSingle, setImportingSingle] = useState<boolean>(false);
  const [importingBulk, setImportingBulk] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Duplicate Merger Modal State
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'keep_primary' | 'keep_secondary' | 'combine'>('combine');
  const [merging, setMerging] = useState<boolean>(false);

  // Settings modification State
  const [selectedProvId, setSelectedProvId] = useState<string>('');
  const [provApiKey, setProvApiKey] = useState<string>('');
  const [provSessionToken, setProvSessionToken] = useState<string>('');
  const [provCookies, setProvCookies] = useState<string>('');
  const [provAutoPublish, setProvAutoPublish] = useState<boolean>(true);
  const [provSyncReviews, setProvSyncReviews] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Affiliate Profiles State
  const [affRegion, setAffRegion] = useState<string>('US');
  const [affTrackingId, setAffTrackingId] = useState<string>('');
  const [affCampaign, setAffCampaign] = useState<string>('');
  const [savingAff, setSavingAff] = useState<boolean>(false);

  // Product Comparisons & Currency Tools State
  const [comparisonProdId, setComparisonProdId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparing, setComparing] = useState<boolean>(false);
  const [convAmount, setConvAmount] = useState<string>('100');
  const [convFrom, setConvFrom] = useState<string>('INR');
  const [convTo, setConvTo] = useState<string>('USD');
  const [convResult, setConvResult] = useState<number | null>(null);
  const [converting, setConverting] = useState<boolean>(false);

  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<any>({
    totalProducts: 0,
    outOfStock: 0,
    synchronized: 0,
    averageHealth: 0,
    jobsProcessed: 0,
    failedJobs: 0,
    recentPriceChangesCount: 0
  });

  const [products, setProducts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [healthReports, setHealthReports] = useState<any[]>([]);
  const [alertRules, setAlertRules] = useState<any[]>([]);
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Selection states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productTimeline, setProductTimeline] = useState<{ priceHistory: any[], changes: any[] }>({ priceHistory: [], changes: [] });

  // Form states
  const [linkToCheck, setLinkToCheck] = useState<string>('');
  const [tagToCheck, setTagToCheck] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState<boolean>(false);

  // Rule Builders
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Manual Trigger Simulation
  const [manualPrice, setManualPrice] = useState<string>('');
  const [manualStock, setManualStock] = useState<boolean>(true);
  const [syncingProduct, setSyncingProduct] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const pRes = await apiFetch('/api/products');
      if (pRes.ok) {
        const pData = await pRes.json();
        const resolvedProducts = Array.isArray(pData) ? pData : (pData?.products || []);
        setProducts(resolvedProducts);
        if (resolvedProducts.length > 0 && !selectedProductId) {
          setSelectedProductId(resolvedProducts[0]._id);
          fetchTimeline(resolvedProducts[0]._id);
        }
      }

      const dRes = await apiFetch('/api/admin/sync/dashboard');
      if (dRes.status === 401) {
        showNotice('error', 'Your session or authorization token has expired. Please sign in again to resume monitoring and sync.');
        return;
      } else if (dRes.ok) {
        const dData = await dRes.json();
        setStats(dData.data || {});
      }

      if (activeTab === 'overview') {
        const jRes = await apiFetch('/api/admin/sync/jobs');
        if (jRes.ok) {
          const jData = await jRes.json();
          setJobs(Array.isArray(jData?.data) ? jData.data : []);
        }
      } else if (activeTab === 'scheduler') {
        const sRes = await apiFetch('/api/admin/sync/schedules');
        if (sRes.ok) {
          const sData = await sRes.json();
          setSchedules(Array.isArray(sData?.data) ? sData.data : []);
        }
      } else if (activeTab === 'health') {
        const hRes = await apiFetch('/api/admin/sync/health');
        if (hRes.ok) {
          const hData = await hRes.json();
          setHealthReports(Array.isArray(hData?.data) ? hData.data : []);
        }
      } else if (activeTab === 'rules') {
        const aRes = await apiFetch('/api/admin/sync/alerts');
        if (aRes.ok) {
          const aData = await aRes.json();
          setAlertRules(Array.isArray(aData?.data) ? aData.data : []);
        }
        const rRes = await apiFetch('/api/admin/sync/rules');
        if (rRes.ok) {
          const rData = await rRes.json();
          setAutomationRules(Array.isArray(rData?.data) ? rData.data : []);
        }
      } else if (activeTab === 'audits') {
        const nRes = await apiFetch('/api/admin/sync/notifications');
        if (nRes.ok) {
          const nData = await nRes.json();
          setAuditLogs(Array.isArray(nData?.data) ? nData.data : []);
        }
      } else if (activeTab === 'marketplace') {
        await fetchMarketplaceData();
      }
    } catch {
      showNotice('error', 'Failed to retrieve product synchronization details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplaceData = async () => {
    try {
      const aRes = await apiFetch('/api/admin/marketplace/analytics');
      if (aRes.ok) {
        const json = await aRes.json();
        setMAnalytics(json.data || { totalProducts: 0, overallSuccessRate: 0, providersCount: 0, providers: [] });
      }
      const pRes = await apiFetch('/api/admin/marketplace/providers');
      if (pRes.ok) {
        const json = await pRes.json();
        const providersList = Array.isArray(json?.data) ? json.data : [];
        setMProviders(providersList);
        if (providersList.length > 0 && !selectedProvId) {
          setSelectedProvId(providersList[0].providerId);
        }
      }
      const sRes = await apiFetch('/api/admin/marketplace/settings');
      if (sRes.ok) {
        const json = await sRes.json();
        setMSettings(Array.isArray(json?.data) ? json.data : []);
      }
      const fRes = await apiFetch('/api/admin/marketplace/affiliate');
      if (fRes.ok) {
        const json = await fRes.json();
        setMAffiliates(Array.isArray(json?.data) ? json.data : []);
      }
      const hRes = await apiFetch('/api/admin/marketplace/health');
      if (hRes.ok) {
        const json = await hRes.json();
        setMHealth(Array.isArray(json?.data) ? json.data : []);
      }
      const lRes = await apiFetch('/api/admin/marketplace/logs');
      if (lRes.ok) {
        const json = await lRes.json();
        setMLogs(Array.isArray(json?.data) ? json.data : []);
      }
      const cRes = await apiFetch('/api/admin/marketplace/currencies');
      if (cRes.ok) {
        const json = await cRes.json();
        setMCurrencies(json.data || { baseCurrency: 'USD', rates: {} });
      }
    } catch {
      showNotice('error', 'Failed to retrieve multi-marketplace configurations.');
    }
  };

  const fetchScannerStatus = async () => {
    try {
      const res = await apiFetch('/api/admin/price-scanner/status');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setScannerState(json.data);
        }
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    if (activeTab !== 'scanner') return;
    fetchScannerStatus();
    const interval = setInterval(() => {
      fetchScannerStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleStartScanner = async () => {
    try {
      const res = await apiFetch('/api/admin/price-scanner/start', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setScannerState(json.data);
        showNotice('success', '1:00 AM Daily price scanner flow started! Scanning products in descending price order ($High → $Low).');
      }
    } catch {
      showNotice('error', 'Failed to start price scanner.');
    }
  };

  const handlePauseScanner = async () => {
    try {
      const res = await apiFetch('/api/admin/price-scanner/pause', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setScannerState(json.data);
        showNotice('info', 'Price scan cycle paused.');
      }
    } catch {
      showNotice('error', 'Failed to pause price scanner.');
    }
  };

  const handleResumeScanner = async () => {
    try {
      const res = await apiFetch('/api/admin/price-scanner/resume', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setScannerState(json.data);
        showNotice('success', 'Price scan cycle resumed.');
      }
    } catch {
      showNotice('error', 'Failed to resume price scanner.');
    }
  };

  const handleResetScanner = async () => {
    try {
      const res = await apiFetch('/api/admin/price-scanner/reset', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setScannerState(json.data);
        showNotice('info', 'Price scanner progress reset to pending state.');
      }
    } catch {
      showNotice('error', 'Failed to reset price scanner.');
    }
  };

  const handleToggleFastMode = async (enabled: boolean) => {
    try {
      const res = await apiFetch('/api/admin/price-scanner/toggle-fast-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fastMode: enabled })
      });
      if (res.ok) {
        const json = await res.json();
        setScannerState(json.data);
        showNotice('info', enabled ? 'Fast Demo Mode activated (5-second gap between price checks).' : 'Standard interval activated (5-7 minutes gap).');
      }
    } catch {
      showNotice('error', 'Failed to toggle fast mode.');
    }
  };

  const handleExportCSV = async () => {
    try {
      showNotice('info', 'Generating CSV report of product details & price scan logs...');
      const res = await apiFetch('/api/admin/price-scanner/export/csv');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-price-scanner-report-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showNotice('success', 'CSV report downloaded successfully.');
      } else {
        showNotice('error', 'Failed to generate CSV export.');
      }
    } catch {
      showNotice('error', 'CSV export encountered an error.');
    }
  };

  const handleExportJSON = async () => {
    try {
      showNotice('info', 'Generating JSON export of product details & price scan logs...');
      const res = await apiFetch('/api/admin/price-scanner/export/json');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-price-scanner-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showNotice('success', 'JSON export downloaded successfully.');
      } else {
        showNotice('error', 'Failed to generate JSON export.');
      }
    } catch {
      showNotice('error', 'JSON export encountered an error.');
    }
  };

  const fetchTimeline = async (prodId: string) => {
    try {
      const res = await apiFetch(`/api/admin/sync/timeline/${prodId}`);
      if (res.ok) {
        const json = await res.json();
        setProductTimeline(json.data);
      }
    } catch {
      // safe fallback
    }
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Real-time URL parsing autodetection hook
  useEffect(() => {
    if (!singleUrl) {
      setDetectedProv('Waiting for URL input...');
      return;
    }
    const url = singleUrl.toLowerCase();
    if (url.includes('amazon.in') || url.includes('amzn.eu')) {
      setDetectedProv('Amazon India (INR)');
    } else if (url.includes('amazon.com') || url.includes('amzn.to')) {
      setDetectedProv('Amazon US (USD)');
    } else if (url.includes('amazon.co.uk')) {
      setDetectedProv('Amazon UK (GBP)');
    } else if (url.includes('amazon.ae')) {
      setDetectedProv('Amazon UAE (AED)');
    } else if (url.includes('flipkart.com')) {
      setDetectedProv('Flipkart (INR)');
    } else if (url.includes('meesho.com')) {
      setDetectedProv('Meesho (INR)');
    } else if (url.includes('myntra.com')) {
      setDetectedProv('Myntra (INR)');
    } else if (url.includes('ajio.com')) {
      setDetectedProv('Ajio (INR)');
    } else if (url.includes('reliancedigital.in')) {
      setDetectedProv('Reliance Digital (INR)');
    } else if (url.includes('croma.com')) {
      setDetectedProv('Croma (INR)');
    } else if (url.includes('ebay.com') || url.includes('ebay.co.uk')) {
      setDetectedProv('eBay (USD)');
    } else if (url.includes('aliexpress.com')) {
      setDetectedProv('AliExpress (USD)');
    } else if (url.includes('walmart.com')) {
      setDetectedProv('Walmart (USD)');
    } else {
      setDetectedProv('Unsupported URL structure / Scraper default');
    }
  }, [singleUrl]);

  const handleToggleProvider = async (providerId: string, currentEnabled: boolean) => {
    try {
      const res = await apiFetch('/api/admin/marketplace/providers/toggle', {
        method: 'POST',
        body: JSON.stringify({ providerId, enabled: !currentEnabled })
      });
      if (res.ok) {
        showNotice('success', 'Marketplace provider state toggled successfully.');
        await fetchMarketplaceData();
      } else {
        showNotice('error', 'Failed to toggle marketplace provider state.');
      }
    } catch {
      showNotice('error', 'Error calling provider state toggle service.');
    }
  };

  const handleSaveProviderSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvId) {
      showNotice('error', 'Please select a marketplace provider first.');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await apiFetch('/api/admin/marketplace/settings', {
        method: 'POST',
        body: JSON.stringify({
          providerId: selectedProvId,
          apiKeys: { apiKey: provApiKey },
          sessionTokens: { token: provSessionToken },
          cookies: provCookies,
          importRules: {
            autoPublish: provAutoPublish,
            syncReviews: provSyncReviews,
            syncImages: true,
            maxImagesToImport: 5
          }
        })
      });
      if (res.ok) {
        showNotice('success', 'Marketplace credentials and rules saved.');
        await fetchMarketplaceData();
      } else {
        showNotice('error', 'Failed to update credentials.');
      }
    } catch {
      showNotice('error', 'Error calling configuration updater.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveAffiliateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvId) {
      showNotice('error', 'Please select a marketplace provider first.');
      return;
    }
    setSavingAff(true);
    try {
      const res = await apiFetch('/api/admin/marketplace/affiliate', {
        method: 'POST',
        body: JSON.stringify({
          providerId: selectedProvId,
          region: affRegion,
          affiliateId: affTrackingId,
          campaignName: affCampaign
        })
      });
      if (res.ok) {
        showNotice('success', `Affiliate tracking configuration updated for region: ${affRegion}.`);
        await fetchMarketplaceData();
        setAffTrackingId('');
        setAffCampaign('');
      } else {
        showNotice('error', 'Failed to save tracking parameters.');
      }
    } catch {
      showNotice('error', 'Error calling tracking database service.');
    } finally {
      setSavingAff(false);
    }
  };

  const handleImportSingleProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl) {
      showNotice('error', 'Please provide a valid product URL.');
      return;
    }
    setImportingSingle(true);
    setImportResult(null);
    try {
      const res = await apiFetch('/api/admin/marketplace/import', {
        method: 'POST',
        body: JSON.stringify({
          url: singleUrl,
          categoryId: singleCategory || undefined,
          forceUpdate: false
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.duplicateDetected) {
          // Open merger dialog
          setDuplicateInfo(json.data);
          setDuplicateWarning(true);
          showNotice('info', 'Potential duplicate product match identified.');
        } else {
          setImportResult({ success: true, message: `Successfully imported product: "${json.data.name}"`, data: json.data });
          showNotice('success', 'Product imported successfully.');
          setSingleUrl('');
          await fetchMarketplaceData();
        }
      } else {
        const json = await res.json();
        setImportResult({ success: false, message: json.error || 'Universal extraction pipeline returned a bad status.' });
        showNotice('error', 'Product extraction failed.');
      }
    } catch {
      showNotice('error', 'Error communicating with extraction gateway.');
    } finally {
      setImportingSingle(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = bulkUrlsText.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      showNotice('error', 'Please paste at least one product URL.');
      return;
    }
    setImportingBulk(true);
    try {
      const res = await apiFetch('/api/admin/marketplace/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          urls,
          categoryId: singleCategory || undefined
        })
      });
      if (res.ok) {
        const json = await res.json();
        showNotice('success', `Bulk queue processed: ${json.data.successCount} succeeded, ${json.data.failCount} failed.`);
        setBulkUrlsText('');
        await fetchMarketplaceData();
      } else {
        showNotice('error', 'Bulk importer queue failed.');
      }
    } catch {
      showNotice('error', 'Error calling bulk importer process.');
    } finally {
      setImportingBulk(false);
    }
  };

  const handleSaveMerge = async () => {
    if (!duplicateInfo) return;
    setMerging(true);
    try {
      const primaryId = duplicateInfo.duplicates[0]?.product?._id;
      const extractedData = duplicateInfo.extractedData;
      
      // Save product with forceUpdate: true to register it in db
      const importRes = await apiFetch('/api/admin/marketplace/import', {
        method: 'POST',
        body: JSON.stringify({
          url: extractedData.affiliateLink,
          categoryId: duplicateInfo.categoryId,
          forceUpdate: true
        })
      });

      if (!importRes.ok) {
        showNotice('error', 'Failed to extract secondary product profile during merger.');
        setMerging(false);
        return;
      }

      const importJson = await importRes.json();
      const secondaryId = importJson.data.productId;

      // Now run merge operation
      const mergeRes = await apiFetch('/api/admin/marketplace/merge', {
        method: 'POST',
        body: JSON.stringify({
          primaryId,
          duplicateId: secondaryId,
          strategy: mergeStrategy
        })
      });

      if (mergeRes.ok) {
        showNotice('success', 'Duplicate records consolidated and primary comparisons synchronized.');
        setDuplicateWarning(false);
        setDuplicateInfo(null);
        setSingleUrl('');
        await fetchMarketplaceData();
      } else {
        if (secondaryId) {
          await apiFetch(`/api/admin/products/${secondaryId}`, { method: 'DELETE' }).catch(() => null);
        }
        showNotice('error', 'Merge database operation failed.');
      }
    } catch {
      showNotice('error', 'Error calling duplicate merger service.');
    } finally {
      setMerging(false);
    }
  };

  const handleComparePrices = async () => {
    if (!comparisonProdId) {
      showNotice('error', 'Please select a catalog product to run comparison.');
      return;
    }
    setComparing(true);
    try {
      const res = await apiFetch(`/api/admin/marketplace/compare/${comparisonProdId}`);
      if (res.ok) {
        const json = await res.json();
        setComparisonResult(json.data);
      } else {
        showNotice('error', 'Cross-marketplace price comparison failed.');
      }
    } catch {
      showNotice('error', 'Communication error executing price comparison.');
    } finally {
      setComparing(false);
    }
  };

  const handleConvertCurrency = async () => {
    setConverting(true);
    try {
      const res = await apiFetch('/api/admin/marketplace/currencies/convert', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(convAmount) || 0,
          from: convFrom,
          to: convTo
        })
      });
      if (res.ok) {
        const json = await res.json();
        setConvResult(json.data.converted);
      }
    } catch {
      showNotice('error', 'Currency calculation failed.');
    } finally {
      setConverting(false);
    }
  };

  const handleLaunchJob = async () => {
    try {
      const res = await apiFetch('/api/admin/sync/jobs', {
        method: 'POST',
        body: JSON.stringify({ name: `Manual Run - ${new Date().toLocaleTimeString()}`, priority: 2 })
      });
      if (res.ok) {
        showNotice('success', 'Background full synchronization job launched successfully!');
        loadData();
      } else {
        showNotice('error', 'Failed to queue sync job.');
      }
    } catch {
      showNotice('error', 'Communication error spawning background task.');
    }
  };

  const handleJobControl = async (jobId: string, action: string) => {
    try {
      const res = await apiFetch(`/api/admin/sync/jobs/${jobId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        showNotice('success', `Job status updated to ${action}`);
        loadData();
      } else {
        showNotice('error', 'Failed to submit job action.');
      }
    } catch {
      showNotice('error', 'Error dispatching job control task.');
    }
  };

  const handleScheduleToggle = async (taskId: string) => {
    try {
      const res = await apiFetch(`/api/admin/sync/schedules/${taskId}/toggle`, { method: 'POST' });
      if (res.ok) {
        showNotice('success', 'Interval schedule status toggled successfully.');
        loadData();
      }
    } catch {
      showNotice('error', 'Failed to toggle schedule state.');
    }
  };

  const handleRunScheduleNow = async (taskId: string) => {
    try {
      const res = await apiFetch(`/api/admin/sync/schedules/${taskId}/run`, { method: 'POST' });
      if (res.ok) {
        showNotice('success', 'Manual schedule worker launched successfully!');
        loadData();
      }
    } catch {
      showNotice('error', 'Failed to trigger schedule execution.');
    }
  };

  const handleVerifyLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await apiFetch('/api/admin/sync/link-validate', {
        method: 'POST',
        body: JSON.stringify({ affiliateLink: linkToCheck, affiliateCode: tagToCheck })
      });
      if (res.ok) {
        const json = await res.json();
        setValidationResult(json.data);
        showNotice('success', 'Affiliate link review completed!');
      } else {
        showNotice('error', 'Failed to evaluate tracking parameters.');
      }
    } catch {
      showNotice('error', 'Failed to validate tracking link.');
    } finally {
      setValidating(false);
    }
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/sync/alerts', {
        method: 'POST',
        body: JSON.stringify(editingAlert)
      });
      if (res.ok) {
        showNotice('success', 'Price Alert Rule configuration successfully recorded!');
        setEditingAlert(null);
        loadData();
      }
    } catch {
      showNotice('error', 'Failed to record Alert Rule details.');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/sync/alerts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotice('success', 'Alert rule deleted successfully.');
        loadData();
      }
    } catch {
      showNotice('error', 'Failed to purge alert rule.');
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/sync/rules', {
        method: 'POST',
        body: JSON.stringify(editingRule)
      });
      if (res.ok) {
        showNotice('success', 'Automation rule successfully updated!');
        setEditingRule(null);
        loadData();
      }
    } catch {
      showNotice('error', 'Failed to save automation rule.');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/sync/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotice('success', 'Automation rule deleted successfully.');
        loadData();
      }
    } catch {
      showNotice('error', 'Failed to delete automation rule.');
    }
  };

  const handleManualProductSync = async () => {
    if (!selectedProductId) return showNotice('error', 'Select a product first.');
    setSyncingProduct(true);
    try {
      const payload: any = {};
      if (manualPrice) payload.price = Number(manualPrice);
      payload.inStock = manualStock;

      const res = await apiFetch(`/api/admin/sync/product/${selectedProductId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data.hasChanges) {
          showNotice('success', `Product synchronized! Found changes: ${JSON.stringify(data.changedFields)}`);
        } else {
          showNotice('info', 'Synchronization complete. No new change variances detected.');
        }
        setManualPrice('');
        fetchTimeline(selectedProductId);
        loadData();
      }
    } catch {
      showNotice('error', 'Synchronization action failed.');
    } finally {
      setSyncingProduct(false);
    }
  };

  // Convert chart details
  const getChartData = () => {
    if (!productTimeline.priceHistory || productTimeline.priceHistory.length === 0) {
      return [];
    }
    return [...productTimeline.priceHistory].reverse().map(h => ({
      name: new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      price: h.price
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-7xl mx-auto" id="sync-dashboard-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-100">Price Monitoring & Intelligent Automation</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time catalog synchronization, multi-channel alerts routing, health scoring audit trails, and automatic actions rules.
          </p>
        </div>
        
        {/* Sync trigger action */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLaunchJob}
            className="px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md transition-all duration-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Spawn Sync Queue Job
          </button>
        </div>
      </div>

      {/* Stats counter widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-950/60 rounded-lg text-indigo-400 border border-indigo-900/60">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Sync Coverage</p>
            <h3 className="text-lg font-bold text-slate-200">{stats.synchronized} / {stats.totalProducts}</h3>
            <p className="text-[9px] text-slate-500">Products monitored in catalog</p>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-amber-950/60 rounded-lg text-amber-400 border border-amber-900/60">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Out Of Stock</p>
            <h3 className="text-lg font-bold text-slate-200">{stats.outOfStock}</h3>
            <p className="text-[9px] text-slate-500">Active flag notifications</p>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-950/60 rounded-lg text-emerald-400 border border-emerald-900/60">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Average Health Score</p>
            <h3 className="text-lg font-bold text-slate-200">{stats.averageHealth} / 100</h3>
            <p className="text-[9px] text-slate-500">Link validity & SEO checkup</p>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-purple-950/60 rounded-lg text-purple-400 border border-purple-900/60">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Background Runs</p>
            <h3 className="text-lg font-bold text-slate-200">{stats.jobsProcessed}</h3>
            <p className="text-[9px] text-slate-500">Processed background updates</p>
          </div>
        </div>
      </div>

      {/* Tabs list selector */}
      <div className="flex border-b border-slate-800 pb-0.5 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 flex items-center gap-2 ${activeTab === 'scanner' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          <PieChartIcon className="w-3.5 h-3.5" />
          <span>1 AM Price Scanner (Descending)</span>
          {scannerState.isRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Overview & Queue
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 ${activeTab === 'scheduler' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Scheduler config
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 ${activeTab === 'health' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Diagnostics & Links
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 ${activeTab === 'rules' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Automation Rules
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 ${activeTab === 'audits' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Activity & Audit logs
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all duration-300 ${activeTab === 'marketplace' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          🔄 Universal Marketplace
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading automation structures...</p>
        </div>
      ) : (
        <div className="min-h-[450px]">
          {/* TAB 0: 1:00 AM DESCENDING PRICE SCANNER */}
          {activeTab === 'scanner' && (
            <div className="space-y-8 animate-fade-in">
              {/* Header Banner & Controls */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <PieChartIcon className="w-64 h-64 text-indigo-400" />
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-1 bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        1:00 AM Daily Trigger Flow
                      </span>
                      {scannerState.isRunning && (
                        <span className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-800 text-emerald-400 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Scanning Active
                        </span>
                      )}
                      {scannerState.isPaused && (
                        <span className="px-2.5 py-1 bg-amber-950/90 border border-amber-800 text-amber-400 text-[10px] font-bold tracking-wider uppercase rounded-full flex items-center gap-1.5">
                          <Pause className="w-3 h-3" />
                          Paused
                        </span>
                      )}
                      {!scannerState.isRunning && !scannerState.isPaused && (
                        <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold tracking-wider uppercase rounded-full">
                          Scheduled for 1:00 AM
                        </span>
                      )}
                      <span className="px-2.5 py-1 bg-purple-950/60 border border-purple-800/40 text-purple-300 text-[10px] font-mono rounded-full">
                        Order: Descending Price ($High → $Low)
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      Automated Price Sync & Scraper Engine
                      <span className="text-xs font-normal text-indigo-300 bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-800/40">No AI Models</span>
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Scans products sorted strictly in <strong>descending price order</strong> starting at 1:00 AM daily. Scrapes live prices via direct HTTP affiliate queries, updates changed prices in real time, and logs change events with a 5–7 minute gap between items.
                    </p>
                  </div>

                  {/* Actions & Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {!scannerState.isRunning ? (
                      <button
                        onClick={handleStartScanner}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Scan Cycle</span>
                      </button>
                    ) : (
                      <button
                        onClick={handlePauseScanner}
                        className="px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                      >
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause Flow</span>
                      </button>
                    )}

                    {scannerState.isPaused && (
                      <button
                        onClick={handleResumeScanner}
                        className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Resume</span>
                      </button>
                    )}

                    <button
                      onClick={handleResetScanner}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Interval / Fast Demo Mode Bar */}
                <div className="mt-6 pt-4 border-t border-indigo-900/30 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Fetch Interval Gap:</span>
                    <span className="font-mono font-bold text-indigo-300 bg-indigo-950 px-2 py-1 rounded border border-indigo-800/40">
                      {scannerState.fastMode ? '5 Seconds (Fast Demo Mode)' : '5 - 7 Minutes (Production Standard)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium px-2">Fast Demo Test Mode (5s gap):</span>
                    <button
                      onClick={() => handleToggleFastMode(!scannerState.fastMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 cursor-pointer ${scannerState.fastMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${scannerState.fastMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Core Data Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Products</p>
                    <h3 className="text-2xl font-black text-white">{scannerState.totalProducts || 0}</h3>
                    <p className="text-[10px] text-slate-500">In descending price order</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-emerald-900/30 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Products Checked</p>
                    <h3 className="text-2xl font-black text-emerald-300">{scannerState.productsChecked || 0}</h3>
                    <p className="text-[10px] text-emerald-500/80">
                      {scannerState.totalProducts > 0 
                        ? `${Math.round((scannerState.productsChecked / scannerState.totalProducts) * 100)}% completed`
                        : '0%'}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-purple-900/30 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Needs To Be Checked</p>
                    <h3 className="text-2xl font-black text-purple-300">{scannerState.productsRemaining || 0}</h3>
                    <p className="text-[10px] text-purple-400/80">Pending remaining items</p>
                  </div>
                  <div className="p-3 bg-purple-950/40 border border-purple-900/50 rounded-xl text-purple-400">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-indigo-900/30 rounded-xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Price Updated / Changed</p>
                    <h3 className="text-2xl font-black text-indigo-300">{scannerState.productsUpdated || 0}</h3>
                    <p className="text-[10px] text-indigo-400/80">
                      {scannerState.productsUnchanged || 0} verified unchanged
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl text-indigo-400">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Pie Chart Visual & Active Scan Progress */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Pie Chart Visualization Card */}
                <div className="lg:col-span-7 bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-indigo-400" />
                        Price Scan Status Distribution (Pie Chart)
                      </h3>
                      <p className="text-[11px] text-slate-400">Proportion of verified, updated, pending, and failed products</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      Live Visualization
                    </span>
                  </div>

                  <div className="h-[280px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Checked (Unchanged)', value: scannerState.productsUnchanged || 0, color: '#10B981' },
                            { name: 'Price Updated', value: scannerState.productsUpdated || 0, color: '#6366F1' },
                            { name: 'Needs to be Checked', value: scannerState.productsRemaining || 0, color: '#8B5CF6' },
                            { name: 'Errors / Failed', value: scannerState.productsFailed || 0, color: '#EF4444' }
                          ].filter(d => d.value > 0 || (scannerState.totalProducts === 0 && d.name === 'Needs to be Checked'))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { name: 'Checked (Unchanged)', value: scannerState.productsUnchanged || 0, color: '#10B981' },
                            { name: 'Price Updated', value: scannerState.productsUpdated || 0, color: '#6366F1' },
                            { name: 'Needs to be Checked', value: scannerState.productsRemaining || 0, color: '#8B5CF6' },
                            { name: 'Errors / Failed', value: scannerState.productsFailed || 0, color: '#EF4444' }
                          ].filter(d => d.value > 0 || (scannerState.totalProducts === 0 && d.name === 'Needs to be Checked')).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                          formatter={(val: any, name: any) => [`${val} Products`, name]}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Side: Active Scanning Card & Export Panel */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Currently Scanning Box */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                        Currently Scanning Item
                      </h3>
                      {scannerState.currentlyScanning && (
                        <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 text-[10px] font-mono rounded border border-indigo-800/40">
                          Rank #${scannerState.currentlyScanning.index} (Price Descending)
                        </span>
                      )}
                    </div>

                    {scannerState.currentlyScanning ? (
                      <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Target Product</span>
                            <h4 className="text-sm font-bold text-white line-clamp-2">{scannerState.currentlyScanning.name}</h4>
                            {scannerState.currentlyScanning.asin && (
                              <p className="text-[10px] text-slate-400 font-mono">ASIN: {scannerState.currentlyScanning.asin}</p>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <span className="text-[9px] uppercase text-slate-400 font-bold block">Catalog Price</span>
                            <span className="text-lg font-black text-emerald-400">${scannerState.currentlyScanning.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-indigo-900/40 flex items-center justify-between text-[11px] text-indigo-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                            Direct HTTP Scraper Fetching Live Price...
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">No AI Used</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center space-y-2 bg-slate-900/40 rounded-xl border border-slate-800/60">
                        <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400 font-medium">Scanner is idle / waiting for cycle start.</p>
                        <p className="text-[10px] text-slate-500">Next daily run scheduled for: {scannerState.nextScheduledRunTime ? new Date(scannerState.nextScheduledRunTime).toLocaleString() : '1:00 AM'}</p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Scan Progress</span>
                        <span className="text-indigo-400">
                          {scannerState.totalProducts > 0 
                            ? `${Math.round((scannerState.productsChecked / scannerState.totalProducts) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                          style={{
                            width: `${scannerState.totalProducts > 0 ? (scannerState.productsChecked / scannerState.totalProducts) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Export Product Details Section */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" />
                        Export Product Details & Price Scan Reports
                      </h3>
                      <p className="text-[11px] text-slate-400">Download catalog dataset along with price scan status, last check timestamps, and price rankings.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-lg shadow-emerald-950/40"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={handleExportJSON}
                        className="px-4 py-3 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-lg shadow-indigo-950/40"
                      >
                        <FileCode className="w-4 h-4 text-indigo-400" />
                        <span>Export JSON</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Audit Log Feed */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <List className="w-4 h-4 text-indigo-400" />
                      Live Price Scanner Execution Logs
                    </h3>
                    <p className="text-[11px] text-slate-400">Real-time audit trace of price verification and update actions</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    {scannerState.logs?.length || 0} Events Recorded
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Status</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Log Message</th>
                        <th className="p-3 text-right">Old Price</th>
                        <th className="p-3 text-right">New Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {scannerState.logs?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 font-sans">
                            No scanner execution events logged yet. Click "Start Scan Cycle" to initiate!
                          </td>
                        </tr>
                      ) : (
                        scannerState.logs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-900/40 transition-colors duration-300">
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold font-sans ${
                                log.status === 'updated' 
                                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60' 
                                  : log.status === 'failed' 
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">{log.timestamp}</td>
                            <td className="p-3 text-slate-200 font-sans text-[11px]">{log.message}</td>
                            <td className="p-3 text-right text-slate-400 font-bold">${log.oldPrice ? log.oldPrice.toFixed(2) : '0.00'}</td>
                            <td className={`p-3 text-right font-bold ${log.oldPrice !== log.newPrice ? 'text-emerald-400' : 'text-slate-300'}`}>
                              ${log.newPrice ? log.newPrice.toFixed(2) : '0.00'}
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

          {/* TAB 1: OVERVIEW & QUEUE */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Live Tracker Workspace */}
              <div className="lg:col-span-4 bg-slate-950/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      fetchTimeline(e.target.value);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg py-2 px-3 text-xs outline-none"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border border-indigo-900/40 bg-indigo-950/20 rounded-xl p-4.5 space-y-3.5">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <Settings className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Manual Simulation Force</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Override Current Price</label>
                      <input
                        type="number"
                        placeholder="e.g. 89.99"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-300 uppercase font-bold">In Stock Availability</span>
                      <input
                        type="checkbox"
                        checked={manualStock}
                        onChange={(e) => setManualStock(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-800 bg-slate-900 rounded outline-none cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={handleManualProductSync}
                      disabled={syncingProduct || !selectedProductId}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition-colors duration-300"
                    >
                      {syncingProduct ? 'Syncing...' : 'Force Live Sync'}
                    </button>
                  </div>
                </div>

                {/* Micro Price Chart of Selected Product */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pricing History Trend</span>
                  <div className="h-40 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getChartData()}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                        <YAxis stroke="#64748b" fontSize={9} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="price" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Background Synchronizer jobs queue logs */}
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Live Background Synchronization Queue</h3>
                <div className="bg-slate-950/20 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400">
                      <tr>
                        <th className="p-3">Sync Job ID / Type</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Progress</th>
                        <th className="p-3">Items Status</th>
                        <th className="p-3 text-right">Control Trigger</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {jobs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">No background sync queue tasks found. Click "Spawn Sync Queue Job" to begin.</td>
                        </tr>
                      ) : (
                        jobs.map(job => (
                          <tr key={job._id} className="hover:bg-slate-900/40">
                            <td className="p-3">
                              <p className="font-semibold text-slate-200 truncate max-w-[160px]">{job.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">Job ID: {job._id}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                job.status === 'completed' ? 'bg-green-950/60 text-green-400 border border-green-900/40' :
                                job.status === 'running' ? 'bg-blue-950/60 text-blue-400 border border-blue-900/40 animate-pulse' :
                                job.status === 'paused' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/40' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="w-24 bg-slate-800 rounded-full h-1.5 mb-1">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }}></div>
                              </div>
                              <span className="text-[10px] text-slate-400">{job.progress}%</span>
                            </td>
                            <td className="p-3">
                              {job.processedItems} / {job.totalItems} (Failed: {job.failedItems || 0})
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              {job.status === 'running' && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'pause')}
                                  className="p-1 bg-amber-950 hover:bg-amber-900 border border-amber-900/50 text-amber-400 rounded cursor-pointer transition-all duration-300"
                                  title="Pause Sync Job"
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {job.status === 'paused' && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'resume')}
                                  className="p-1 bg-green-950 hover:bg-green-900 border border-green-900/50 text-emerald-400 rounded cursor-pointer transition-all duration-300"
                                  title="Resume Sync Job"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {['waiting', 'running', 'paused'].includes(job.status) && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'cancel')}
                                  className="p-1 bg-red-950 hover:bg-red-900 border border-red-900/50 text-red-400 rounded cursor-pointer transition-all duration-300"
                                  title="Cancel Sync Job"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {['completed', 'failed', 'cancelled'].includes(job.status) && (
                                <button 
                                  onClick={() => handleJobControl(job._id, 'retry')}
                                  className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer font-bold transition-all duration-300"
                                >
                                  Retry Sync
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

          {/* TAB 2: SCHEDULER */}
          {activeTab === 'scheduler' && (
            <div className="space-y-6">
              <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                <h2 className="text-sm font-bold text-slate-200">Configurable Monitoring Schedules</h2>
                <p className="text-xs text-slate-400">Configure time intervals or specific schedules to audit and update product variations automatically.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {schedules.map(task => (
                  <div key={task._id} className="bg-slate-950/20 border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{task.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${task.active ? 'bg-emerald-950/80 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          {task.active ? 'Active Schedule' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Time Interval Profile: <span className="font-semibold text-indigo-400">{task.interval}</span></p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                        <span>Success count: {task.successCount || 0}</span>
                        <span>Fail count: {task.failCount || 0}</span>
                        <span>Avg duration: {task.averageDurationMs ? `${(task.averageDurationMs / 1000).toFixed(1)}s` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleScheduleToggle(task._id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-300 ${task.active ? 'bg-amber-950 text-amber-400 hover:bg-amber-900' : 'bg-indigo-950 text-indigo-400 hover:bg-indigo-900'}`}
                      >
                        {task.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleRunScheduleNow(task._id)}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer flex items-center gap-1 transition-colors duration-300"
                      >
                        <Play className="w-3.5 h-3.5" /> Run Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS & LINKS */}
          {activeTab === 'health' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Health check table */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Product Integrity Health Reports</h3>
                <div className="bg-slate-950/20 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Health Score</th>
                        <th className="p-3">Sync Status</th>
                        <th className="p-3">Detected Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {healthReports.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500">No health logs computed yet. Trigger forced sync to seed.</td>
                        </tr>
                      ) : (
                        healthReports.map(rep => (
                          <tr key={rep._id} className="hover:bg-slate-900/40">
                            <td className="p-3 font-semibold text-slate-200">
                              <p className="truncate max-w-[180px]">{rep.productId?.name || 'Unknown product'}</p>
                              <p className="text-[10px] text-slate-400">Price: ${rep.productId?.price}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${rep.healthScore >= 80 ? 'text-emerald-400' : rep.healthScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {rep.healthScore} / 100
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${rep.lastSyncStatus === 'success' ? 'bg-green-950/60 text-emerald-400' : 'bg-amber-950/60 text-amber-400'}`}>
                                {rep.lastSyncStatus}
                              </span>
                            </td>
                            <td className="p-3">
                              {rep.issues && rep.issues.length > 0 ? (
                                <ul className="list-disc pl-3 space-y-0.5 text-[10px] text-slate-400 max-w-[180px]">
                                  {rep.issues.slice(0, 2).map((iss: string, i: number) => (
                                    <li key={i} className="truncate">{iss}</li>
                                  ))}
                                  {rep.issues.length > 2 && <li className="text-[9px] text-slate-500">+{rep.issues.length - 2} more issues</li>}
                                </ul>
                              ) : (
                                <span className="text-emerald-500 text-[10px]">No issues detected</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live link validator */}
              <div className="lg:col-span-5 bg-slate-950/50 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-indigo-400" />
                    Affiliate Link Parameter Reviewer
                  </h3>
                  <p className="text-[11px] text-slate-400">Instantly audit tracking URL structures, detect broken referral loops, and review suggested repair scripts.</p>
                </div>

                <form onSubmit={handleVerifyLink} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Affiliate Destination Link</label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.amazon.com/dp/B0..."
                      value={linkToCheck}
                      onChange={(e) => setLinkToCheck(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Tracking ID Code</label>
                    <input
                      type="text"
                      placeholder="e.g. yourcode-20"
                      value={tagToCheck}
                      onChange={(e) => setTagToCheck(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={validating}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition-colors duration-300"
                  >
                    {validating ? 'Evaluating Parameters...' : 'Audit Link Integrity'}
                  </button>
                </form>

                {validationResult && (
                  <div className="border-t border-slate-800/80 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Evaluation Outcome:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${validationResult.valid ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                        {validationResult.valid ? 'Compliant link' : 'Audit Failures'}
                      </span>
                    </div>

                    {validationResult.issues && validationResult.issues.length > 0 && (
                      <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg text-[10px] text-amber-400 space-y-1">
                        <p className="font-bold uppercase tracking-wider">Identified Issues</p>
                        <ul className="list-disc pl-3.5 space-y-0.5">
                          {validationResult.issues.map((iss: string, idx: number) => (
                            <li key={idx}>{iss}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                      <div className="bg-indigo-950/20 border border-indigo-900/40 p-2.5 rounded-lg text-[10px] text-indigo-400 space-y-1">
                        <p className="font-bold uppercase tracking-wider">Suggested Repairs</p>
                        <ul className="list-disc pl-3.5 space-y-0.5">
                          {validationResult.suggestions.map((sug: string, idx: number) => (
                            <li key={idx}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUTOMATION RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Alert Rules block */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200">Alert Notification Rules</h2>
                    <p className="text-xs text-slate-400">Trigger multi-channel alarms when specific price discount drop flags occur.</p>
                  </div>
                  {!editingAlert && (
                    <button
                      onClick={() => {
                        setEditingAlert({
                          name: '',
                          productId: '',
                          triggerType: 'price_drop_pct',
                          threshold: 10,
                          channels: ['browser'],
                          active: true
                        });
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-colors duration-300"
                    >
                      + Create Alert Rule
                    </button>
                  )}
                </div>

                {editingAlert && (
                  <form onSubmit={handleSaveAlert} className="bg-slate-950/30 border border-slate-800 p-5 rounded-xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">Configure Price Alert</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alert Name</label>
                        <input
                          type="text"
                          required
                          value={editingAlert.name}
                          onChange={(e) => setEditingAlert({ ...editingAlert, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trigger Type</label>
                        <select
                          value={editingAlert.triggerType}
                          onChange={(e) => setEditingAlert({ ...editingAlert, triggerType: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        >
                          <option value="price_drop_pct">Price drops by %</option>
                          <option value="out_of_stock">Fails out of stock</option>
                          <option value="back_in_stock">Returns back in stock</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Threshold value (e.g. %)</label>
                        <input
                          type="number"
                          required
                          value={editingAlert.threshold}
                          onChange={(e) => setEditingAlert({ ...editingAlert, threshold: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingAlert(null)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
                      >
                        Save Alert
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alertRules.map(alert => (
                    <div key={alert._id} className="bg-slate-950/20 border border-slate-800/80 p-4.5 rounded-xl space-y-2.5 flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200 text-xs">{alert.name}</p>
                        <p className="text-[11px] text-slate-400">Trigger: {alert.triggerType} (Threshold: {alert.threshold}%)</p>
                        <p className="text-[10px] text-slate-500">Channels: {alert.channels?.join(', ')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(alert._id)}
                        className="text-red-400 hover:text-red-300 p-1 bg-red-950/30 border border-red-900/30 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automation Rules builder */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                  <div>
                    <h2 className="text-sm font-bold text-slate-200">Automation Trigger Engine Rules</h2>
                    <p className="text-xs text-slate-400">Configure IF-THEN triggers to automate product updates, descriptions edits, and website alerts.</p>
                  </div>
                  {!editingRule && (
                    <button
                      onClick={() => {
                        setEditingRule({
                          name: '',
                          triggerType: 'price_drop_pct',
                          triggerThreshold: 20,
                          actions: [{ actionType: 'mark_best_deal', payload: {} }],
                          active: true
                        });
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-colors duration-300"
                    >
                      + Create Rule Action
                    </button>
                  )}
                </div>

                {editingRule && (
                  <form onSubmit={handleSaveRule} className="bg-slate-950/30 border border-slate-800 p-5 rounded-xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">Configure Automation Rule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rule Title</label>
                        <input
                          type="text"
                          required
                          value={editingRule.name}
                          onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">IF trigger condition</label>
                        <select
                          value={editingRule.triggerType}
                          onChange={(e) => setEditingRule({ ...editingRule, triggerType: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        >
                          <option value="price_drop_pct">IF price drops by %</option>
                          <option value="out_of_stock">IF inventory drops to OUT OF STOCK</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">THEN Apply Action</label>
                        <select
                          value={editingRule.actions[0]?.actionType}
                          onChange={(e) => {
                            const updated = [...editingRule.actions];
                            updated[0] = { actionType: e.target.value, payload: {} };
                            setEditingRule({ ...editingRule, actions: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        >
                          <option value="mark_best_deal">Mark product as 'Trending/Best Deal'</option>
                          <option value="regenerate_ai">Regenerate AI Copywriting descriptions</option>
                          <option value="send_telegram">Submit Admin Alert Dispatch log</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingRule(null)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
                      >
                        Save Automation Rule
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {automationRules.map(rule => (
                    <div key={rule._id} className="bg-slate-950/20 border border-slate-800/80 p-4.5 rounded-xl space-y-2 flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200 text-xs">{rule.name}</p>
                        <p className="text-[11px] text-slate-400">IF: {rule.triggerType === 'price_drop_pct' ? `Price drops by ${rule.triggerThreshold}%` : 'Fails OOS'}</p>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">THEN: {rule.actions?.[0]?.actionType}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule._id)}
                        className="text-red-400 hover:text-red-300 p-1 bg-red-950/30 border border-red-900/30 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDITS & LOGS */}
          {activeTab === 'audits' && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">Live Multi-Channel Dispatch Logs & Notification History</h3>
              <div className="bg-slate-950/20 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400">
                    <tr>
                      <th className="p-3">Trigger Channel</th>
                      <th className="p-3">Title / Trigger Info</th>
                      <th className="p-3">Dispatched Alert Message</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">No active notification alert dispatches captured yet. Try overriding product price drop parameters.</td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log._id} className="hover:bg-slate-900/40">
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900/40 uppercase font-bold">
                              {log.channel}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-200">
                            {log.title}
                          </td>
                          <td className="p-3 text-slate-400 max-w-sm text-[11px]">
                            {log.message}
                          </td>
                          <td className="p-3">
                            <span className="text-emerald-400 text-[10px] font-bold">Sent successfully</span>
                          </td>
                          <td className="p-3 text-right text-[11px] text-slate-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: MULTI-MARKETPLACE & UNIVERSAL IMPORT */}
          {activeTab === 'marketplace' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Analytics Header Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Multi-Channel Catalog</p>
                    <p className="text-2xl font-black text-slate-200">{mAnalytics.totalProducts || 0}</p>
                    <p className="text-[10px] text-slate-500">Imported from affiliate nodes</p>
                  </div>
                  <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg text-indigo-400">
                    <List className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Extraction Success Rate</p>
                    <p className="text-2xl font-black text-emerald-400">{mAnalytics.overallSuccessRate ?? 0}%</p>
                    <p className="text-[10px] text-slate-500">Zero-error scraping pipelines</p>
                  </div>
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/30 rounded-lg text-emerald-400">
                    <Check className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scraping Latency</p>
                    <p className="text-2xl font-black text-amber-400">{mAnalytics.averageLatency ? `${mAnalytics.averageLatency}ms` : 'N/A'}</p>
                    <p className="text-[10px] text-slate-500">Average round-trip response</p>
                  </div>
                  <div className="p-2.5 bg-amber-950/40 border border-amber-900/30 rounded-lg text-amber-400">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Providers</p>
                    <p className="text-2xl font-black text-indigo-400">{mAnalytics.providersCount ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Multi-region regional outlets</p>
                  </div>
                  <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-lg text-indigo-400">
                    <Settings className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Duplicate Merger Warning Banner */}
              {duplicateWarning && duplicateInfo && (
                <div className="bg-amber-950/20 border border-amber-900/60 rounded-xl p-5 space-y-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-200 uppercase tracking-wide">Duplicate Product Conflict Resolved</p>
                      <p className="text-[11px] text-slate-400">
                        An existing catalog item shares resemblance (GTIN/EAN or Brand match) with your extracted target. Configure collision mapping:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Primary Record (In Catalog)</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{duplicateInfo.duplicates[0]?.product?.name}</p>
                      <p className="text-[10px] text-indigo-400 font-bold">${duplicateInfo.duplicates[0]?.product?.price}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Secondary Record (Scraped Target)</p>
                      <p className="text-xs font-bold text-slate-200 truncate">{duplicateInfo.extractedData?.name}</p>
                      <p className="text-[10px] text-amber-400 font-bold">${duplicateInfo.extractedData?.price} {duplicateInfo.extractedData?.currency}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Merge Alignment Strategy</label>
                      <select
                        value={mergeStrategy}
                        onChange={(e) => setMergeStrategy(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 text-slate-300 rounded p-1.5 text-xs outline-none"
                      >
                        <option value="combine">Combine Details & Create Price Comparisons (Recommended)</option>
                        <option value="keep_primary">Ignore New, Keep Primary Record Untouched</option>
                        <option value="keep_secondary">Overwrite Existing Catalog Item Entirely</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleSaveMerge}
                        disabled={merging}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-1.5 rounded cursor-pointer transition-colors duration-300"
                      >
                        {merging ? 'Consolidating Datastores...' : 'Apply Merge Resolution'}
                      </button>
                      <button
                        onClick={() => { setDuplicateWarning(false); setDuplicateInfo(null); }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-4 py-1.5 rounded cursor-pointer transition-colors duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Imports Control Room Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Universal Smart Importer Panel */}
                <div className="lg:col-span-6 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Universal Smart Importer</h4>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-900/40 rounded text-[9px] uppercase font-bold animate-pulse">
                      Live Autodetect
                    </span>
                  </div>

                  <form onSubmit={handleImportSingleProduct} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Product URL</label>
                      <input
                        type="url"
                        placeholder="Paste Amazon, Flipkart, eBay, Walmart, Meesho, Ajio, Croma link..."
                        required
                        value={singleUrl}
                        onChange={(e) => setSingleUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs outline-none"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">Identified Outlet:</span>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase">{detectedProv}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Parent Category Mapping (Optional)</label>
                      <select
                        value={singleCategory}
                        onChange={(e) => setSingleCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-2.5 text-xs outline-none"
                      >
                        <option value="">Default category placement (Autoselect)</option>
                        {products.length > 0 && Array.from(new Set(products.map(p => typeof p.category === 'object' ? p.category?.name : 'General'))).map((catName: any) => (
                          <option key={catName} value={catName}>{catName}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={importingSingle}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-colors duration-300"
                    >
                      {importingSingle ? 'Connecting to scraping server...' : 'Extract & Import Live Product'}
                    </button>
                  </form>

                  {importResult && (
                    <div className={`p-3 rounded-lg text-xs border ${importResult.success ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' : 'bg-red-950/20 border-red-900/40 text-red-300'}`}>
                      <p className="font-semibold">{importResult.message}</p>
                      {importResult.data && (
                        <div className="mt-2 text-[11px] text-slate-400 space-y-0.5">
                          <p>• Title: {importResult.data.name}</p>
                          <p>• Extracted Price: ${importResult.data.price}</p>
                          <p>• Affiliate Link Synced with code</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Bulk Multi-Platform Import Panel */}
                <div className="lg:col-span-6 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <List className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Bulk Multi-Platform Import Queue</h4>
                  </div>

                  <form onSubmit={handleBulkImport} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Extract Targets (One URL per line)</label>
                      <textarea
                        rows={4}
                        placeholder="https://www.flipkart.com/item-1&#10;https://www.ebay.com/itm/2&#10;https://www.meesho.com/p-3"
                        required
                        value={bulkUrlsText}
                        onChange={(e) => setBulkUrlsText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2.5 text-xs outline-none font-mono resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={importingBulk}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer transition-colors duration-300"
                    >
                      {importingBulk ? 'Deploying distributed workers...' : 'Queue Bulk Scraper Jobs'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Config Panels: Credentials Settings & Affiliate profiles */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Provider Settings Panel */}
                <div className="lg:col-span-7 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Regional Gateway Credentials & Scraping Rules</h4>
                  </div>

                  <form onSubmit={handleSaveProviderSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Select Target Marketplace Provider</label>
                        <select
                          value={selectedProvId}
                          onChange={(e) => {
                            setSelectedProvId(e.target.value);
                            const set = mSettings.find(s => s.providerId === e.target.value);
                            const getVal = (obj: any, key: string) => {
                              if (!obj) return '';
                              if (typeof obj.get === 'function') return obj.get(key) || '';
                              if (typeof obj === 'object') return obj[key] || '';
                              return '';
                            };
                            setProvApiKey(getVal(set?.apiKeys, 'apiKey'));
                            setProvSessionToken(getVal(set?.sessionTokens, 'token'));
                            setProvCookies(set?.cookies || '');
                            setProvAutoPublish(set?.importRules?.autoPublish ?? true);
                            setProvSyncReviews(set?.importRules?.syncReviews ?? true);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-2 text-xs outline-none"
                        >
                          {mProviders.map(p => (
                            <option key={p.providerId} value={p.providerId}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Provider Client API Key</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••••••••••••••••••"
                          value={provApiKey}
                          onChange={(e) => setProvApiKey(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Scraper Active Cookies / User-Agent Tokens</label>
                      <textarea
                        rows={2}
                        placeholder="session-id=141-840184; x-main=y49187..."
                        value={provCookies}
                        onChange={(e) => setProvCookies(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-lg p-2 text-xs outline-none font-mono resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="provAutoPublish"
                          checked={provAutoPublish}
                          onChange={(e) => setProvAutoPublish(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="provAutoPublish" className="text-xs text-slate-400 cursor-pointer">Auto-publish imported products</label>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="provSyncReviews"
                          checked={provSyncReviews}
                          onChange={(e) => setProvSyncReviews(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="provSyncReviews" className="text-xs text-slate-400 cursor-pointer">Sync verified review series</label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300"
                    >
                      {savingSettings ? 'Securing secrets...' : 'Save Configuration Parameters'}
                    </button>
                  </form>
                </div>

                {/* Regional Affiliate Profiles Panel */}
                <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Regional Affiliate Tracking Codes</h4>
                  </div>

                  <form onSubmit={handleSaveAffiliateProfile} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Target Marketplace</label>
                        <select
                          value={selectedProvId}
                          onChange={(e) => setSelectedProvId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-1.5 text-xs outline-none"
                        >
                          {mProviders.map(p => (
                            <option key={p.providerId} value={p.providerId}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Target Region</label>
                        <select
                          value={affRegion}
                          onChange={(e) => setAffRegion(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-1.5 text-xs outline-none"
                        >
                          <option value="US">US / Americas</option>
                          <option value="IN">India / SA</option>
                          <option value="UK">United Kingdom</option>
                          <option value="UAE">United Arab Emirates</option>
                          <option value="GLOBAL">Global / Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Partner tracking tag</label>
                        <input
                          type="text"
                          placeholder="e.g. tracking-21"
                          required
                          value={affTrackingId}
                          onChange={(e) => setAffTrackingId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded p-1.5 text-xs outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Campaign Name</label>
                        <input
                          type="text"
                          placeholder="e.g. WinterPromo"
                          value={affCampaign}
                          onChange={(e) => setAffCampaign(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded p-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingAff}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-colors duration-300"
                    >
                      {savingAff ? 'Linking parameters...' : 'Link Regional Affiliate profile'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Cross-Platform Price Comparison Tool & Exchange Rates */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Cross-Marketplace Price Comparison Tool */}
                <div className="lg:col-span-8 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <BarChart2 className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Cross-Marketplace Price Comparison Analyzer</h4>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={comparisonProdId}
                      onChange={(e) => setComparisonProdId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-2 text-xs outline-none"
                    >
                      <option value="">Select a catalog product to run comparison analysis...</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name} (${p.price})</option>
                      ))}
                    </select>

                    <button
                      onClick={handleComparePrices}
                      disabled={comparing}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors duration-300 shrink-0"
                    >
                      {comparing ? 'Auditing other hubs...' : 'Run Real-time Comparison'}
                    </button>
                  </div>

                  {comparisonResult && (
                    <div className="space-y-4 mt-2">
                      <div className="flex items-center justify-between bg-slate-950/30 p-3 rounded-lg border border-slate-800/80">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Best Deal Suggestion</p>
                          <p className="text-xs font-bold text-emerald-400">Cheapest directly at: {comparisonResult.bestMarketplace}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Savings Spread</p>
                          <p className="text-xs font-bold text-slate-200">${comparisonResult.savingsAmount} USD</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-800/60">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400">
                            <tr>
                              <th className="p-2.5">Platform</th>
                              <th className="p-2.5">Seller</th>
                              <th className="p-2.5">Listed Price</th>
                              <th className="p-2.5">Stock</th>
                              <th className="p-2.5">Target rating</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {comparisonResult.offers.map((offer: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-900/40">
                                <td className="p-2.5 font-bold text-slate-200">{offer.marketplace}</td>
                                <td className="p-2.5 text-slate-400">{offer.seller || 'N/A'}</td>
                                <td className="p-2.5 text-indigo-400 font-bold">${offer.price}</td>
                                <td className="p-2.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${offer.inStock ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                                    {offer.inStock ? 'In Stock' : 'Out of Stock'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-400">★ {offer.rating}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Currencies Exchange Rates & Converter Tool */}
                <div className="lg:col-span-4 bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <Coins className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Exchange Rates Calculator</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={convAmount}
                        onChange={(e) => setConvAmount(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-200 rounded p-1.5 text-xs outline-none"
                      />
                      <select
                        value={convFrom}
                        onChange={(e) => setConvFrom(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-300 rounded p-1.5 text-xs outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="INR">INR</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                      </select>
                      <select
                        value={convTo}
                        onChange={(e) => setConvTo(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-300 rounded p-1.5 text-xs outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="INR">INR</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="AED">AED</option>
                      </select>
                    </div>

                    <button
                      onClick={handleConvertCurrency}
                      disabled={converting}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 rounded cursor-pointer transition-colors duration-300"
                    >
                      {converting ? 'Converting...' : 'Convert currency'}
                    </button>

                    {convResult !== null && (
                      <div className="text-center p-2.5 bg-slate-950/30 rounded-lg border border-slate-800/60 text-xs text-indigo-400 font-extrabold">
                        {convAmount} {convFrom} = {convResult.toFixed(2)} {convTo}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Provider Logs List activity feed */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Universal Scraper Activity Logs Feed</h4>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-800/60 max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 uppercase tracking-wider text-[10px] text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2.5">Provider</th>
                        <th className="p-2.5">Action</th>
                        <th className="p-2.5">Log Trace Message</th>
                        <th className="p-2.5">Latency</th>
                        <th className="p-2.5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {mLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">No scraper execution logging traces loaded yet. Try starting a live import!</td>
                        </tr>
                      ) : (
                        mLogs.map(log => (
                          <tr key={log._id} className="hover:bg-slate-900/40">
                            <td className="p-2.5 font-bold text-slate-200 uppercase text-[10px]">{log.providerId}</td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${log.status === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' : 'bg-red-950 text-red-400 border border-red-900/30'}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400 text-[11px] max-w-md truncate">{log.message}</td>
                            <td className="p-2.5 text-indigo-400">{log.latencyMs ? `${log.latencyMs}ms` : 'N/A'}</td>
                            <td className="p-2.5 text-right text-slate-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
