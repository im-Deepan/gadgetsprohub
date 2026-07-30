import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, XCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../utils/apiClient';

interface N8nStatus {
  configured: boolean;
  status: 'online' | 'offline' | 'warning';
  message: string;
}

export const N8nStatusIndicator: React.FC<{ token: string | null }> = ({ token }) => {
  const [status, setStatus] = useState<N8nStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  
  // Test webhook state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/admin/n8n-status', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      
      const data = await response.json();
      
      setStatus(data);
    } catch (error) {
      console.error("Failed to check n8n status:", error);
      setStatus({
        configured: false,
        status: 'offline',
        message: 'Failed to verify automation system'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus().catch(() => {});
    const interval = setInterval(() => { checkStatus().catch(() => {}); }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiFetch('/api/admin/n8n-test', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      setTestResult(await result.json());
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Unknown error during test'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse">
        <Activity className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Checking automation...</span>
      </div>
    );
  }

  if (!status) return null;

  const getStatusStyles = () => {
    if (!status.configured) return 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500';
    
    switch (status.status) {
      case 'online':
        return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400';
      case 'offline':
        return 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400';
      default:
        return 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500';
    }
  };

  const StatusIcon = () => {
    if (!status.configured) return <Activity className="h-3.5 w-3.5" />;
    
    switch (status.status) {
      case 'online': return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'warning': return <AlertCircle className="h-3.5 w-3.5" />;
      case 'offline': return <XCircle className="h-3.5 w-3.5" />;
      default: return <Activity className="h-3.5 w-3.5" />;
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowDialog(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-300 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 cursor-pointer ${getStatusStyles()}`}
        title="Click to view n8n diagnostics"
      >
        <StatusIcon />
        <span className="text-xs font-semibold whitespace-nowrap">
          {!status.configured ? 'n8n: Unconfigured' : `n8n: ${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`}
        </span>
      </button>

      {/* Diagnostic Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                n8n Webhook Diagnostics
              </h3>
              <button 
                onClick={() => setShowDialog(false)}
                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Current Status</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <StatusIcon />
                    <span>{status.message}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Trigger a manual test payload to verify the webhook receives data and inspect its response.
                  </p>
                  <button
                    onClick={handleTestWebhook}
                    disabled={testing}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                  >
                    {testing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    Test Webhook
                  </button>
                </div>
              </div>

              {testResult && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white">Test Results</h4>
                  
                  <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-semibold ${testResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {testResult.success ? 'Success' : 'Failed'}
                      </span>
                      {testResult.status && (
                        <span className="text-xs bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full font-mono">
                          HTTP {testResult.status} {testResult.statusText}
                        </span>
                      )}
                    </div>
                    
                    {testResult.error && (
                      <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                        {testResult.errorName ? `${testResult.errorName}: ` : ''}{testResult.error}
                      </p>
                    )}
                  </div>

                  {testResult.body && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Response Body</span>
                      <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {typeof testResult.body === 'object' ? JSON.stringify(testResult.body, null, 2) : testResult.body}
                      </pre>
                    </div>
                  )}
                  
                  {testResult.headers && Object.keys(testResult.headers).length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">Response Headers</span>
                      <pre className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 p-4 rounded-lg overflow-x-auto text-xs font-mono border border-slate-200 dark:border-slate-700">
                        {JSON.stringify(testResult.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

