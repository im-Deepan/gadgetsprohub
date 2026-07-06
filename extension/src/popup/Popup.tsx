import { useState, useEffect } from 'react';
import { 
  Laptop, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Globe, 
  Database,
  UserCheck,
  RefreshCw,
  Sparkles,
  Search,
  Tag,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Key
} from 'lucide-react';
import { ExtensionMessage, ExtensionResponse, ProductPayload } from '../types';
import { CONFIG } from '../config';
import { ENVIRONMENTS } from '../config/environments';
import { extensionStorage } from '../services/storage';
import { logger } from '../services/logger';

interface TabInfo {
  url: string;
  title: string;
  isAmazon: boolean;
  contentScriptLoaded: boolean;
}

export default function Popup() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapedProduct, setScrapedProduct] = useState<ProductPayload | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // Settings & Connection States
  const [apiUrl, setApiUrl] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [environment, setEnvironment] = useState<'Development' | 'Staging' | 'Production' | 'Custom'>('Staging');
  const [debugMode, setDebugMode] = useState<boolean>(true);
  const [extVersion, setExtVersion] = useState<string>('1.0.0');
  const [features, setFeatures] = useState<any>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [devModeLogs, setDevModeLogs] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Checks the active browser tab's status via message passing
  const checkCurrentTab = () => {
    setLoading(true);
    setImportSuccess(false);
    setScrapedProduct(null);
    setStatusMessage(null);
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Probe active tab via background coordinator
      chrome.runtime.sendMessage({ action: "PING_CONTENT_SCRIPT" }, (response: ExtensionResponse) => {
        if (response && response.success && response.data) {
          const data = response.data;
          setTabInfo({
            url: data.url || "",
            title: data.title || "",
            isAmazon: data.isAmazon || false,
            contentScriptLoaded: data.contentScriptLoaded !== false
          });
        } else {
          setTabInfo({
            url: "",
            title: "",
            isAmazon: false,
            contentScriptLoaded: false
          });
        }
        setLoading(false);
      });
    } else {
      // Offline fallback state for development environments & compilation validation
      setTimeout(() => {
        setTabInfo({
          url: "https://www.amazon.com/dp/B0CXF2K8Z7",
          title: "Apple iPhone 15 Pro Max (256GB, Blue Titanium)",
          isAmazon: true,
          contentScriptLoaded: true
        });
        setLoading(false);
      }, 600);
    }
  };

  // Loads settings & verifies remote session connectivity
  const initSession = async () => {
    const settings = await extensionStorage.getSettings();
    
    setApiUrl(settings.apiBaseUrl);
    setAuthToken(settings.authToken || '');
    setAdminEmail(settings.adminEmail || '');
    setEnvironment(settings.environment);
    setDebugMode(settings.debugMode);
    setExtVersion(settings.version);
    setFeatures(settings.features || {});

    if (settings.authToken) {
      verifyRemoteSession();
    }
  };

  const verifyRemoteSession = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "GET_SESSION_STATUS" }, (response: ExtensionResponse) => {
        if (response && response.success && response.data) {
          const session = response.data;
          setIsAuthenticated(session.isAuthenticated);
          if (session.email) {
            setAdminEmail(session.email);
            extensionStorage.updateSettings({ adminEmail: session.email });
          }
        } else {
          setIsAuthenticated(false);
        }
      });
    } else {
      // Offline fallback
      setIsAuthenticated(true);
      setAdminEmail('deepan20060609@gmail.com');
    }
  };

  const runHealthCheck = async () => {
    setShowHealthCheck(true);
    setHealthStatus({ status: 'checking' });
    try {
      const response = await fetch(`${apiUrl}/api/health-check`);
      if (response.ok) {
        const data = await response.json();
        setHealthStatus({ status: 'ok', backendVersion: data.version || 'Unknown', env: environment });
      } else {
        setHealthStatus({ status: 'error', message: 'Backend returned an error' });
      }
    } catch (e: any) {
      setHealthStatus({ status: 'error', message: e.message });
    }
  };

  useEffect(() => {
    initSession();
    checkCurrentTab();
  }, []);

  // Handle environment dropdown change
  const handleEnvChange = (env: 'Development' | 'Staging' | 'Production' | 'Custom') => {
    setEnvironment(env);
    if (env !== 'Custom') {
      const config = ENVIRONMENTS[env];
      setApiUrl(config.apiBaseUrl);
      setDebugMode(config.debugMode);
    }
  };

  // Update token or api url dynamically
  const saveSettings = async () => {
    try {
      const updatedSettings = await extensionStorage.updateSettings({
        apiBaseUrl: apiUrl,
        authToken: authToken.trim() ? authToken : null,
        adminEmail: adminEmail.trim() ? adminEmail : null,
        environment: environment,
        debugMode: debugMode,
        version: extVersion
      });
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ 
          action: "SET_SESSION_TOKEN", 
          payload: { token: updatedSettings.authToken, email: updatedSettings.adminEmail } 
        });
      }
      
      setShowSettings(false);
      setStatusMessage({ type: 'success', text: 'Settings updated successfully!' });
      verifyRemoteSession();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to write settings: ' + err.message });
    }
  };

  // Scrapes product information using content script DOM parser
  const handleScrapeProduct = () => {
    if (scraping || !tabInfo?.isAmazon) return;
    setScraping(true);
    setStatusMessage(null);

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          setScraping(false);
          setStatusMessage({ type: 'error', text: 'No active tab found' });
          return;
        }

        const msg: ExtensionMessage = { action: 'SCRAPE_AMAZON_PRODUCT' };
        chrome.tabs.sendMessage(activeTab.id, msg, (response: ExtensionResponse<ProductPayload>) => {
          setScraping(false);
          if (response && response.success && response.data) {
            setScrapedProduct(response.data);
            setStatusMessage({ type: 'success', text: 'Product parsed successfully! Review the extracted metadata.' });
          } else {
            const errorMsg = response?.error?.message || 'Content script failed to parse Amazon DOM. Please try reloading the Amazon tab.';
            logger.error('Scraping error response:', response);
            setStatusMessage({ type: 'error', text: errorMsg });
          }
        });
      });
    } else {
      // Offline mock parser for testing
      setTimeout(() => {
        setScraping(false);
        const mockProduct: ProductPayload = {
          name: "Apple iPhone 15 Pro Max (256GB, Blue Titanium)",
          brand: "Apple",
          asin: "B0CXF2K8Z7",
          currentPrice: 1199.00,
          originalPrice: 1299.00,
          discount: 8,
          currency: "USD",
          rating: 4.7,
          reviewCount: 3120,
          availability: true,
          description: "Stunning titanium design with powerful A17 Pro Chip and customizable Action Button.",
          bulletFeatures: [
            "FORGED IN TITANIUM — iPhone 15 Pro Max has a strong and light aerospace-grade titanium design.",
            "A17 PRO CHIP — A game-changing GPU delivers immersive gaming experiences and graphics.",
            "PRO CAMERA SYSTEM — Get incredible framing flexibility with 7 pro lenses."
          ],
          specifications: {
            "Model Name": "iPhone 15 Pro Max",
            "Storage Capacity": "256 GB",
            "Color": "Blue Titanium"
          },
          images: [
            "https://images-na.ssl-images-amazon.com/images/I/81+GIg6bOML._AC_SL1500_.jpg"
          ],
          productUrl: tabInfo?.url || "https://www.amazon.com/dp/B0CXF2K8Z7"
        };
        setScrapedProduct(mockProduct);
        setStatusMessage({ type: 'success', text: 'Parsed Mock product successfully!' });
      }, 1200);
    }
  };

  // Publishes extracted product payload directly to backend API
  const handleImport = () => {
    if (importing || !scrapedProduct) return;
    setImporting(true);
    setStatusMessage(null);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const msg: ExtensionMessage = {
        action: 'EXECUTE_PRODUCT_IMPORT',
        payload: scrapedProduct
      };
      
      chrome.runtime.sendMessage(msg, (response: ExtensionResponse) => {
        setImporting(false);
        if (response && response.success) {
          setImportSuccess(true);
          setScrapedProduct(null);
          setStatusMessage({ type: 'success', text: 'Successfully registered product on GadgetsProHub!' });
          extensionStorage.set(CONFIG.STORAGE_KEYS.LAST_IMPORTED_ASIN, scrapedProduct.asin);
        } else {
          const errMsg = response?.error?.message || 'Remote database rejected product import.';
          setStatusMessage({ type: 'error', text: errMsg });
        }
      });
    } else {
      // Offline fallback simulator
      setTimeout(() => {
        setImporting(false);
        setImportSuccess(true);
        setScrapedProduct(null);
        setStatusMessage({ type: 'success', text: 'Product registered successfully (Simulation Mode).' });
      }, 1500);
    }
  };

  const handleTestParser = () => {
    setDevModeLogs('Running parser test...');
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, { action: 'TEST_PARSER' }, (res) => {
            if (res?.success) {
               setDevModeLogs(JSON.stringify(res.data, null, 2));
            } else {
               setDevModeLogs(`Error: ${JSON.stringify(res?.error || 'Unknown error')}`);
            }
          });
        }
      });
    }
  };

  return (
    <div className="flex flex-col min-h-[420px] bg-slate-50 text-slate-800">
      
      {/* HEADER BAR */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-violet-600 rounded-lg">
            <Laptop className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">GadgetsProHub</h1>
            <p className="text-[10px] text-slate-400">Affiliate Portal v1.0.0</p>
          </div>
        </div>
        
        {/* Settings Toggle & Connection Indicator */}
        <div className="flex items-center space-x-2">
          {features?.enableHealthCheck && (
            <button 
              onClick={() => { setShowHealthCheck(!showHealthCheck); setShowSettings(false); setShowDevMode(false); if (!showHealthCheck) runHealthCheck(); }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Health Check"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {features?.enableDeveloperMode && (
            <button 
              onClick={() => { setShowDevMode(!showDevMode); setShowSettings(false); setShowHealthCheck(false); }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Developer Mode"
            >
              <Database className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => { setShowSettings(!showSettings); setShowDevMode(false); setShowHealthCheck(false); }}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Configure connection settings"
          >
            <Key className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-[9px] font-mono text-slate-300">
              {isAuthenticated ? "SSO ACTIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* CORE DISPLAY STAGE */}
      <main className="flex-1 p-4 flex flex-col justify-between">
        
        {showHealthCheck ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                System Health Check
              </span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Backend Connectivity</span>
                {healthStatus?.status === 'checking' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" /> : 
                 healthStatus?.status === 'ok' ? <span className="text-emerald-600 font-semibold">OK</span> : 
                 <span className="text-rose-600 font-semibold">Error</span>}
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Auth Status</span>
                <span className={isAuthenticated ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>{isAuthenticated ? 'Authenticated' : 'Offline / Guest'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Environment</span>
                <span className="text-slate-800 font-mono">{environment}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Extension Version</span>
                <span className="text-slate-800 font-mono">v{extVersion}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Backend Version</span>
                <span className="text-slate-800 font-mono">{healthStatus?.backendVersion || '-'}</span>
              </div>
              {healthStatus?.status === 'error' && (
                 <div className="p-2 bg-rose-50 text-rose-800 text-[10px] rounded border border-rose-100 mt-2">
                   {healthStatus.message}
                 </div>
              )}
            </div>
            <button onClick={runHealthCheck} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs transition-colors">
              Run Again
            </button>
          </div>
        ) : showDevMode ? (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5 max-h-[300px] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4 text-violet-600" />
                Developer Mode
              </span>
            </h3>
            <div className="flex gap-2 mb-2">
               <button onClick={handleTestParser} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-1.5 rounded text-xs transition-colors">
                 Test Parser
               </button>
               <button onClick={() => {
                 if (scrapedProduct) {
                   setDevModeLogs(JSON.stringify(scrapedProduct, null, 2));
                 } else {
                   setDevModeLogs('No product extracted yet.');
                 }
               }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs transition-colors">
                 View Extracted JSON
               </button>
            </div>
            {devModeLogs && (
              <div className="relative">
                <pre className="bg-slate-900 text-slate-300 p-2 rounded text-[9px] font-mono overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {devModeLogs}
                </pre>
                <button 
                  onClick={() => navigator.clipboard.writeText(devModeLogs)}
                  className="absolute top-1 right-1 bg-slate-800 text-slate-400 hover:text-white p-1 rounded text-[10px]"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        ) : showSettings ? (
          /* SETTINGS CARD */
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Key className="w-4 h-4 text-violet-600" />
                Settings & API Connection
              </span>
              <span className="text-[9px] font-mono text-slate-400 font-normal">v{extVersion}</span>
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Environment</label>
                <select
                  value={environment}
                  onChange={(e) => handleEnvChange(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-[11px] bg-slate-50 font-medium focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="Development">Development (Localhost)</option>
                  <option value="Staging">Staging (AIS Dev)</option>
                  <option value="Production">Production (AIS Pre-Prod)</option>
                  <option value="Custom">Custom Override</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">API Base URL</label>
                <input 
                  type="text" 
                  value={apiUrl}
                  disabled={environment !== 'Custom'}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-api-endpoint.com"
                  className={`w-full px-2.5 py-1.5 rounded border font-mono text-[11px] focus:outline-none focus:border-violet-500 transition-colors ${
                    environment !== 'Custom' ? 'bg-slate-50 text-slate-500 border-slate-150 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-800'
                  }`} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Admin JWT Token</label>
                <textarea 
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  rows={2}
                  placeholder="Paste your admin web session JWT"
                  className="w-full px-2.5 py-1.5 rounded border border-slate-200 font-mono text-[10px] focus:outline-none focus:border-violet-500 bg-white text-slate-800" 
                />
              </div>

              <div className="flex items-center space-x-2 pt-0.5">
                <input 
                  type="checkbox" 
                  id="debugMode"
                  checked={debugMode}
                  disabled={environment !== 'Custom'}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className={`rounded text-violet-600 focus:ring-violet-500 ${environment !== 'Custom' ? 'cursor-not-allowed text-slate-400 bg-slate-100' : 'cursor-pointer'}`}
                />
                <label htmlFor="debugMode" className="text-[10px] font-medium text-slate-500 uppercase tracking-wider select-none cursor-pointer">
                  Debug Mode {environment !== 'Custom' && <span className="text-[9px] text-slate-400 font-normal italic lowercase">(Locked by Env)</span>}
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={saveSettings}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-1.5 rounded text-xs font-semibold shadow-xs transition-colors"
              >
                Save Configuration
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : loading ? (
          /* LOADER */
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-violet-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Evaluating active tab environment...</p>
          </div>
        ) : (
          /* ACTIVE CARD FLOW */
          <div className="space-y-4">
            
            {/* CURRENT BROWSER STATE CARD */}
            <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Active Browser Tab
                </span>
                <button 
                  onClick={checkCurrentTab}
                  className="text-violet-600 hover:text-violet-800 flex items-center gap-0.5"
                  title="Rescan current page"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              <div className="space-y-1">
                <h2 className="text-xs font-semibold text-slate-800 line-clamp-1" title={tabInfo?.title}>
                  {tabInfo?.title || "No page loaded"}
                </h2>
                <p className="text-[10px] text-slate-500 truncate font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  {tabInfo?.url || "chrome://newtab/"}
                </p>
              </div>
            </div>

            {/* DYNAMIC MESSAGE STATUS FLOATER */}
            {statusMessage && (
              <div className={`p-2.5 rounded-lg text-[11px] border ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : 'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                {statusMessage.text}
              </div>
            )}

            {/* SCRAPED PRODUCT REVIEW FORM */}
            {scrapedProduct ? (
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-sm max-h-[220px] overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Tag className="w-4 h-4 text-violet-600" />
                  Review Scraped Details
                </h3>

                <div className="space-y-2 text-[11px]">
                  <div className="border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Product Title</span>
                    <span className="text-slate-800 font-medium line-clamp-2">{scrapedProduct.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">ASIN / ID</span>
                      <span className="text-slate-800 font-mono">{scrapedProduct.asin}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wide block">Brand</span>
                      <span className="text-slate-800 font-medium">{scrapedProduct.brand}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded border border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 block">List Price</span>
                      <span className="text-slate-800 font-semibold font-mono flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-slate-400" />
                        {scrapedProduct.originalPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Sale Price</span>
                      <span className="text-violet-600 font-semibold font-mono flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-violet-400" />
                        {scrapedProduct.currentPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Savings</span>
                      <span className="text-emerald-600 font-semibold font-mono">{scrapedProduct.discount}% OFF</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {Object.keys(scrapedProduct.specifications).length} specs parsed
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-slate-400" />
                      {scrapedProduct.images.length} images found
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Confirm & Import</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setScrapedProduct(null)}
                    disabled={importing}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-xs"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : tabInfo?.isAmazon ? (
              /* IS AMAZON, NOT SCRAPED YET */
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 space-y-3.5">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700 mt-0.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-800">Amazon Page Detected</h3>
                    <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                      Ready to extract electronics, hardware, or specifications from this page.
                    </p>
                  </div>
                </div>

                {importSuccess ? (
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center space-y-2 shadow-xs">
                    <p className="text-[11px] font-medium text-emerald-800 flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Product added successfully!
                    </p>
                    <button 
                      onClick={() => setImportSuccess(false)}
                      className="text-[10px] text-violet-600 hover:underline"
                    >
                      Import another product
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleScrapeProduct}
                    disabled={scraping}
                    className="w-full py-2.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold text-xs transition duration-150 flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {scraping ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting DOM Content...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Add Product to My Website</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* NON-AMAZON FALLBACK */
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800">Unsupported Website</h3>
                    <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                      Navigate to any active Amazon product detail page to import details into your affiliate store.
                    </p>
                  </div>
                </div>

                <a 
                  href="https://www.amazon.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 px-4 rounded-lg font-semibold text-xs transition duration-150 flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Browse Amazon Products</span>
                  <ExternalLink className="w-3 h-3 text-amber-100" />
                </a>
              </div>
            )}
            
          </div>
        )}

        {/* BOTTOM AUTHENTICATION/DB METADATA STRIP */}
        <div className="border-t border-slate-100 pt-3 mt-4 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
            <div className="flex items-center space-x-1">
              <UserCheck className={`w-3.5 h-3.5 ${isAuthenticated ? 'text-violet-600' : 'text-slate-400'}`} />
              <span>Session: <strong className="text-slate-700 truncate max-w-[110px] inline-block align-bottom">{isAuthenticated ? (adminEmail || "Admin") : "Guest"}</strong></span>
            </div>
            <div className="flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-violet-600" />
              <span>Host: <strong className="text-slate-700 font-mono">Dev</strong></span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
