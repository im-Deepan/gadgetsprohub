import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { extensionStorage } from '../../services/storage';
import { CONFIG } from '../../config';

const isValidAmazonUrl = (input: string, supportedDomains: string[]): boolean => {
  let urlStr = input.trim();
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = 'https://' + urlStr;
  }
  try {
    const urlObj = new URL(urlStr);
    const hostname = urlObj.hostname.toLowerCase();
    return supportedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};

export function BulkImportTab() {
  const [inputText, setInputText] = useState('');
  const [queueState, setQueueState] = useState<any>(null);
  const [concurrency, setConcurrency] = useState(3);
  const [maxRetries, setMaxRetries] = useState(3);
  const [conflictStrategy, setConflictStrategy] = useState('skip');

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = () => {
    chrome.runtime.sendMessage({ action: 'BULK_IMPORT_STATUS' }, (res) => {
      if (res && res.success) {
        setQueueState(res.data);
      }
    });
  };

  const handleStart = async () => {
    const rawItems = inputText.split('\n').map(l => l.trim()).filter(l => l);
    if (rawItems.length === 0) return alert("Please enter at least one ASIN or URL.");
    
    // Parse and Validate
    const items: { asin: string; url: string; status?: string; retryCount?: number }[] = [];
    const seen = new Set();
    const asinRegex = /^[A-Z0-9]{10}$/;
    let errors = 0;
    
    const settings = await extensionStorage.getSettings();
    const supportedDomains = settings.supportedDomains || CONFIG.SUPPORTED_AMAZON_DOMAINS;

    for (let raw of rawItems) {
      let asin = '';
      let url = '';
      
      if (isValidAmazonUrl(raw, supportedDomains)) {
        url = raw;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        const match = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
        if (match) asin = match[1];
      } else {
        asin = raw.toUpperCase();
      }

      if (!asin || !asinRegex.test(asin)) {
        errors++;
        continue; // skip invalid
      }

      if (seen.has(asin)) continue; // duplicate row
      seen.add(asin);

      items.push({ asin, url: url || '', status: 'pending', retryCount: 0 });
    }
    
    if (items.length === 0) return alert("No valid ASINs found.");
    if (errors > 0) alert(`Skipped ${errors} invalid or malformed items.`);

    const jobId = 'job_' + Date.now();
    const sanitizedConcurrency = isNaN(concurrency) ? 3 : Math.max(1, concurrency);
    const sanitizedMaxRetries = isNaN(maxRetries) ? 3 : Math.max(0, maxRetries);
    
    // First, register with backend
    const startBackendJob = async () => {
      try {
        const baseUrl = await extensionStorage.getApiUrl();
        const token = await extensionStorage.getAuthToken();
        await fetch(`${baseUrl.replace(/\/$/, '')}/api/admin/products/bulk/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          },
          body: JSON.stringify({ jobId, items, concurrency: sanitizedConcurrency, maxRetries: sanitizedMaxRetries, conflictStrategy })
        });
      } catch (e) {
        console.error("Backend bulk start fail (will proceed locally)", e);
      }
    };

    startBackendJob().then(() => {
      chrome.runtime.sendMessage({
        action: 'BULK_IMPORT_START',
        payload: { jobId, items, concurrency: sanitizedConcurrency, maxRetries: sanitizedMaxRetries, conflictStrategy, options: {} }
      }, (res) => {
        if (res && res.success) fetchStatus();
      });
    });
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({ action: 'BULK_IMPORT_PAUSE' }, () => fetchStatus());
  };
  
  const handleResume = () => {
    chrome.runtime.sendMessage({ action: 'BULK_IMPORT_RESUME' }, () => fetchStatus());
  };

  const handleCancel = () => {
    if (confirm("Cancel bulk import?")) {
      chrome.runtime.sendMessage({ action: 'BULK_IMPORT_CANCEL' }, () => fetchStatus());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      // Extract ASINs from CSV column (assuming first col or single col)
      const lines = text.split('\n').map(l => l.split(',')[0].trim()).filter(l => l && l !== 'ASIN' && l !== 'URL');
      setInputText(lines.join('\n'));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 p-2 text-slate-800 flex flex-col h-full max-h-full">
      <h2 className="text-sm font-bold text-slate-700">Bulk Import Engine</h2>
      
      {!queueState || ['completed', 'cancelled', 'failed'].includes(queueState.status) ? (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <label className="flex-1 text-xs">
              <span className="block text-slate-500 font-semibold mb-1">Concurrency</span>
              <input type="number" min="1" max="10" value={concurrency} onChange={e => setConcurrency(parseInt(e.target.value))} className="w-full px-2 py-1 border rounded text-xs" />
            </label>
            <label className="flex-1 text-xs">
              <span className="block text-slate-500 font-semibold mb-1">Retries</span>
              <input type="number" min="0" max="10" value={maxRetries} onChange={e => setMaxRetries(parseInt(e.target.value))} className="w-full px-2 py-1 border rounded text-xs" />
            </label>
            <label className="flex-[1.5] text-xs">
              <span className="block text-slate-500 font-semibold mb-1">Conflict Strategy</span>
              <select value={conflictStrategy} onChange={e => setConflictStrategy(e.target.value)} className="w-full px-2 py-1 border rounded text-xs bg-white">
                <option value="skip">Skip</option>
                <option value="update">Update</option>
                <option value="merge">Merge</option>
                <option value="replace">Replace</option>
              </select>
            </label>
          </div>

          <div>
            <textarea
              className="w-full h-32 p-2 border rounded-lg text-xs font-mono bg-slate-50"
              placeholder="Paste ASINs or URLs here (one per line)..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center gap-2">
            <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-200 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Load CSV/TXT</span>
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
            
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Bulk Import
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 flex flex-col flex-1">
          <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</div>
              <div className="text-sm font-bold text-violet-700 capitalize flex items-center gap-1.5">
                {queueState.status === 'running' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-500" />}
                {queueState.status}
              </div>
            </div>
            <div className="flex gap-1.5">
              {queueState.status === 'running' && (
                <button onClick={handlePause} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition" title="Pause">
                  <Pause className="w-4 h-4 fill-current" />
                </button>
              )}
              {queueState.status === 'paused' && (
                <button onClick={handleResume} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition" title="Resume">
                  <Play className="w-4 h-4 fill-current" />
                </button>
              )}
              <button onClick={handleCancel} className="p-1.5 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition" title="Cancel">
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Overall Progress</span>
              <span className="text-violet-600">
                {Math.round((queueState.items.filter((i: any) => i.status !== 'pending' && i.status !== 'running').length / queueState.items.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-violet-600 h-full transition-all duration-300"
                style={{ width: `${(queueState.items.filter((i: any) => i.status !== 'pending' && i.status !== 'running').length / queueState.items.length) * 100}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 pt-2 text-center">
              <div className="bg-slate-50 p-1.5 rounded">
                <span className="block text-[9px] font-bold text-slate-400">TOTAL</span>
                <span className="block text-sm font-bold text-slate-700">{queueState.items.length}</span>
              </div>
              <div className="bg-emerald-50 p-1.5 rounded">
                <span className="block text-[9px] font-bold text-emerald-500">SUCCESS</span>
                <span className="block text-sm font-bold text-emerald-700">
                  {queueState.items.filter((i: any) => i.status === 'success').length}
                </span>
              </div>
              <div className="bg-rose-50 p-1.5 rounded">
                <span className="block text-[9px] font-bold text-rose-500">FAILED</span>
                <span className="block text-sm font-bold text-rose-700">
                  {queueState.items.filter((i: any) => i.status === 'failed').length}
                </span>
              </div>
              <div className="bg-amber-50 p-1.5 rounded">
                <span className="block text-[9px] font-bold text-amber-500">SKIPPED</span>
                <span className="block text-sm font-bold text-amber-700">
                  {queueState.items.filter((i: any) => i.status === 'skipped').length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[120px] overflow-y-auto space-y-1.5 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            {queueState.items.map((item: any, i: number) => (
              <div key={i} className="bg-white p-2 flex justify-between items-center rounded border border-slate-100 shadow-sm text-xs">
                <div className="font-mono text-[10px] truncate max-w-[150px] font-semibold text-slate-700">
                  {item.asin || item.url}
                </div>
                <div className="flex items-center gap-1">
                  {item.status === 'failed' && item.error && (
                    <span title={item.error}><AlertCircle className="w-3.5 h-3.5 text-rose-500" /></span>
                  )}
                  {item.retryCount > 0 && item.status !== 'success' && (
                    <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded-full">Retry {item.retryCount}</span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    item.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                    item.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                    item.status === 'skipped' ? 'bg-amber-100 text-amber-700' :
                    item.status === 'running' ? 'bg-violet-100 text-violet-700 animate-pulse' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
