import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiClient';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCcw, 
  Lock, 
  Unlock, 
  Terminal, 
  Clock, 
  Globe, 
  Cpu, 
  Eye, 
  EyeOff, 
  Copy,
  ToggleLeft,
  ToggleRight,
  Database
} from 'lucide-react';

interface SecurityConsoleProps {
  token: string | null;
  triggerAlert: (title: string, message: string) => void;
}

export const SecurityConsole: React.FC<SecurityConsoleProps> = ({ token, triggerAlert }) => {
  // Tabs for the Security console
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'pats' | '2fa' | 'metrics' | 'flags' | 'database'>('sessions');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [sessions, setSessions] = useState<any[]>([]);
  const [pats, setPats] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  // Database status states
  const [dbInfo, setDbInfo] = useState<{ isMongoConnected: boolean; readyState: number; uri: string } | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbToggling, setDbToggling] = useState(false);

  // 2FA Flow
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [qrCodePlaceholder, setQrCodePlaceholder] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  // PAT Flow
  const [newPatName, setNewPatName] = useState('');
  const [generatedPat, setGeneratedPat] = useState('');
  const [copiedPat, setCopiedPat] = useState(false);

  // Custom Confirm Dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch API helper
  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      };
      const res = await apiFetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'API call failed');
      }
      return data;
    } catch (err: any) {
      console.error(`Error fetching ${url}:`, err);
      triggerAlert('Action Failed', err.message || 'An error occurred during API communication');
      throw err;
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await apiCall('/api/auth/sessions');
      if (res.success) {
        setSessions(res.sessions || []);
      }
    } catch (e) {}
  };

  const fetchPats = async () => {
    try {
      const res = await apiCall('/api/auth/pats');
      if (res.success) {
        setPats(res.pats || []);
      }
    } catch (e) {}
  };

  const fetchMetrics = async () => {
    try {
      const res = await apiCall('/api/metrics');
      if (res.success) {
        setMetrics(res.metrics);
        setLiveLogs(res.liveLogs || []);
      }
    } catch (e) {}
  };

  const fetchFlags = async () => {
    try {
      const res = await apiCall('/api/admin/config');
      if (res.success) {
        setFlags(res.flags || {});
      }
    } catch (e) {}
  };

  const fetch2faStatus = async () => {
    try {
      const res = await apiCall('/api/auth/2fa/status');
      if (res.success) {
        setTwoFactorEnabled(!!res.twoFactorEnabled);
      }
    } catch (e) {}
  };

  const fetchDbStatus = async () => {
    try {
      setDbLoading(true);
      const res = await apiCall('/api/admin/db-toggle-status');
      if (res.success) {
        setDbInfo({
          isMongoConnected: res.isMongoConnected,
          readyState: res.readyState,
          uri: res.uri
        });
      }
    } catch (e) {
      console.error('Failed to load database status:', e);
    } finally {
      setDbLoading(false);
    }
  };

  const handleToggleDbConnection = async (currentState: boolean) => {
    try {
      setDbToggling(true);
      const targetState = currentState ? 'offline' : 'online';
      const res = await apiCall('/api/admin/db-toggle', {
        method: 'POST',
        body: JSON.stringify({ targetState })
      });
      if (res.success) {
        triggerAlert('Success', res.message);
        setDbInfo({
          isMongoConnected: res.isMongoConnected,
          readyState: res.readyState,
          uri: dbInfo?.uri || 'Configured (Atlas Cluster)'
        });
      } else {
        triggerAlert('Database Toggle Failed', res.error || 'Connection failed.');
      }
    } catch (err: any) {
      console.error('Failed to toggle database connection:', err);
      triggerAlert('Database Action Failed', err.message || 'Network error.');
    } finally {
      setDbToggling(false);
      fetchDbStatus();
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Terminate Session',
      message: 'Are you sure you want to terminate this active user session?',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await apiCall('/api/auth/sessions/revoke', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
          });
          if (res.success) {
            triggerAlert('Success', 'The selected session has been successfully revoked.');
            fetchSessions();
          }
        } catch (e) {}
      }
    });
  };

  const handleGeneratePat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatName.trim()) return;
    try {
      const res = await apiCall('/api/auth/pats/generate', {
        method: 'POST',
        body: JSON.stringify({ name: newPatName })
      });
      if (res.success) {
        setGeneratedPat(res.token);
        setNewPatName('');
        fetchPats();
      }
    } catch (e) {}
  };

  const handleRevokePat = (patId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Revoke Access Token',
      message: 'Are you sure you want to revoke this Personal Access Token? Programs using it will lose access immediately.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await apiCall('/api/auth/pats/revoke', {
            method: 'POST',
            body: JSON.stringify({ patId })
          });
          if (res.success) {
            triggerAlert('Success', 'The access token was successfully revoked.');
            fetchPats();
          }
        } catch (e) {}
      }
    });
  };

  const handleSetup2fa = async () => {
    try {
      const res = await apiCall('/api/auth/2fa/setup', { method: 'POST' });
      if (res.success) {
        setTwoFactorSecret(res.secret);
        setQrCodePlaceholder(res.qrCodePlaceholder);
        setShow2faSetup(true);
      }
    } catch (e) {}
  };

  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiCall('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ secret: twoFactorSecret, code: verificationCode })
      });
      if (res.success) {
        triggerAlert('Success', 'Two-Factor Authentication (2FA) is now enabled for your account!');
        setVerificationCode('');
        setShow2faSetup(false);
        fetch2faStatus();
      }
    } catch (e) {}
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiCall('/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code: disableCode })
      });
      if (res.success) {
        triggerAlert('Success', 'Two-Factor Authentication (2FA) has been disabled.');
        setDisableCode('');
        setShowDisableForm(false);
        fetch2faStatus();
      }
    } catch (e) {}
  };

  const handleToggleFlag = async (flagName: string, currentValue: boolean) => {
    try {
      const updatedFlags = { ...flags, [flagName]: !currentValue };
      const res = await apiCall('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify({ flags: updatedFlags })
      });
      if (res.success) {
        setFlags(res.flags || {});
      }
    } catch (e) {}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPat(true);
    setTimeout(() => setCopiedPat(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeSubTab === 'sessions') await fetchSessions();
    if (activeSubTab === 'pats') await fetchPats();
    if (activeSubTab === '2fa') await fetch2faStatus();
    if (activeSubTab === 'metrics') await fetchMetrics();
    if (activeSubTab === 'flags') await fetchFlags();
    if (activeSubTab === 'database') await fetchDbStatus();
    setRefreshing(false);
  };

  // Clear temporary token when tab changes
  useEffect(() => {
    setGeneratedPat('');
  }, [activeSubTab]);

  // Initial Data Fetch
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSessions(),
      fetchPats(),
      fetch2faStatus(),
      fetchMetrics(),
      fetchFlags(),
      fetchDbStatus()
    ]).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 dark:bg-zinc-900/40 dark:border-zinc-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200/60 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-5.5 h-5.5 text-indigo-500" />
            Security & Diagnostics Control Panel
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise-grade credentials, multi-device active sessions, TOTP 2FA, API keys, feature flags and live system telemetry.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-3 md:mt-0 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700 flex items-center justify-center gap-2 transition duration-300"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-xl max-w-fit">
        {[
          { id: 'sessions', label: 'Active Sessions', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'pats', label: 'API Keys / PATs', icon: <Key className="w-3.5 h-3.5" /> },
          { id: '2fa', label: 'Multi-Factor Auth', icon: <Smartphone className="w-3.5 h-3.5" /> },
          { id: 'metrics', label: 'Live Telemetry', icon: <Activity className="w-3.5 h-3.5" /> },
          { id: 'flags', label: 'Feature Flags', icon: <Terminal className="w-3.5 h-3.5" /> },
          { id: 'database', label: 'Database Status', icon: <Database className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition duration-300 ${
              activeSubTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-zinc-700 dark:text-slate-100' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CORE WORK VIEW */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading secure console records...</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ACTIVE SESSIONS TAB */}
          {activeSubTab === 'sessions' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 dark:bg-amber-950/20 dark:border-amber-900/50 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">Session Guarding Active</h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                    The platform verifies active tokens against registered session credentials and security tokens. Revoking an active login immediately disconnects the user's tablet, mobile, or extension client.
                  </p>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                      <th className="px-4 py-3">Device / User Agent</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Created At</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No active server-side sessions found.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((s) => (
                        <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                            {s.userAgent}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                            {s.ipAddress || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(s.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.revoked 
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.revoked ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              {s.revoked ? 'REVOKED' : 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!s.revoked && (
                              <button
                                onClick={() => handleRevokeSession(s._id)}
                                className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent rounded-lg transition duration-300"
                              >
                                Revoke Session
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
          )}

          {/* API KEYS / PATS TAB */}
          {activeSubTab === 'pats' && (
            <div className="space-y-6">
              {/* Token Creator Form */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Generate Personal Access Token (PAT)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Enable external scripts, automated workflows, or custom Chrome browser environments to securely program against the GadgetsProHub Affiliate API.
                </p>

                <form onSubmit={handleGeneratePat} className="flex gap-3 max-w-lg">
                  <input
                    type="text"
                    required
                    placeholder="E.g., Production cron server"
                    value={newPatName}
                    onChange={(e) => setNewPatName(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:bg-zinc-900 dark:border-zinc-700 text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition duration-300 shrink-0"
                  >
                    Generate Token
                  </button>
                </form>

                {generatedPat && (
                  <div className="mt-3 bg-indigo-50 border border-indigo-200/50 p-4 rounded-xl dark:bg-indigo-950/20 dark:border-indigo-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider dark:text-indigo-400">
                        New Access Token Value:
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copyToClipboard(generatedPat)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 dark:text-indigo-400 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedPat ? 'COPIED!' : 'Copy to Clipboard'}
                        </button>
                        <button
                          onClick={() => setGeneratedPat('')}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 dark:text-rose-400 cursor-pointer"
                        >
                          Dismiss Token
                        </button>
                      </div>
                    </div>
                    <div className="font-mono text-xs bg-slate-900 text-emerald-400 p-2.5 rounded border border-slate-800 select-all break-all">
                      {generatedPat}
                    </div>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                      ⚠️ Make sure to save this token safely. Click "Dismiss Token" when finished to clear it from memory.
                    </p>
                  </div>
                )}
              </div>

              {/* Tokens Table */}
              <div className="border border-slate-100 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                      <th className="px-4 py-3">Token Name</th>
                      <th className="px-4 py-3">Token Hash (Tail)</th>
                      <th className="px-4 py-3">Created At</th>
                      <th className="px-4 py-3">Last Used At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                    {pats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No Personal Access Tokens registered yet.
                        </td>
                      </tr>
                    ) : (
                      pats.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20">
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            Hash: ...{p.tokenHash ? p.tokenHash.slice(-8) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {p.lastUsedAt ? new Date(p.lastUsedAt).toLocaleString() : 'Never Used'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRevokePat(p._id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent rounded-lg transition duration-300"
                            >
                              Revoke Key
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TWO FACTOR AUTH TAB */}
          {activeSubTab === '2fa' && (
            <div className="max-w-xl bg-white border border-slate-100 rounded-2xl p-6 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-6">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5.5 h-5.5 text-indigo-500" />
                <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">
                  Two-Factor Authentication (TOTP)
                </h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Add an extra layer of protection to your administrative account. Every time you log in, you will be required to provide a dynamic 6-digit verification code from your authenticator app (Google Authenticator, Authy, etc.).
              </p>

              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                twoFactorEnabled 
                  ? 'bg-emerald-50 border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/50' 
                  : 'bg-amber-50 border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-800/50'
              }`}>
                {twoFactorEnabled ? (
                  <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Unlock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2FA Guard Status: <span className={twoFactorEnabled ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>{twoFactorEnabled ? 'ENABLED' : 'DISABLED'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {twoFactorEnabled 
                      ? 'Multi-factor authentication is active and protecting your administrator account.' 
                      : 'Multi-factor authentication is currently inactive for your account.'}
                  </p>
                </div>
              </div>

              {!twoFactorEnabled ? (
                !show2faSetup ? (
                  <button
                    onClick={handleSetup2fa}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition duration-300"
                  >
                    Configure Two-Factor Authenticator
                  </button>
                ) : (
                  <form onSubmit={handleEnable2fa} className="space-y-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                      Setup instructions:
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-slate-500 space-y-1.5 pl-1">
                      <li>Open your mobile Authenticator App.</li>
                      <li>Scan or enter the following base-32 secret key manually:</li>
                    </ol>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                      <span className="font-mono text-xs text-emerald-400 font-bold tracking-widest select-all">
                        {twoFactorSecret}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(twoFactorSecret)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-white"
                      >
                        Copy Secret
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Enter the 6-digit confirmation code:
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        placeholder="E.g., 123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full max-w-[150px] text-center px-4 py-2 font-mono text-sm tracking-widest bg-slate-50 border border-slate-200 rounded-lg focus:outline-none dark:bg-zinc-900 dark:border-zinc-700 text-slate-100"
                      />
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition duration-300"
                      >
                        Confirm and Enable 2FA
                      </button>
                      <button
                        type="button"
                        onClick={() => setShow2faSetup(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-300 dark:bg-zinc-800 dark:text-slate-300"
                      >
                        Cancel Setup
                      </button>
                    </div>
                  </form>
                )
              ) : (
                !showDisableForm ? (
                  <button
                    onClick={() => setShowDisableForm(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition duration-300"
                  >
                    Disable Two-Factor Authentication
                  </button>
                ) : (
                  <form onSubmit={handleDisable2fa} className="space-y-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                      Disable 2FA Confirmation:
                    </h4>
                    <p className="text-xs text-slate-500">
                      To disable 2FA, enter a current 6-digit verification code from your authenticator app.
                    </p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        placeholder="123456"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value)}
                        className="w-full max-w-[150px] text-center px-4 py-2 font-mono text-sm tracking-widest bg-slate-50 border border-slate-200 rounded-lg focus:outline-none dark:bg-zinc-900 dark:border-zinc-700 text-slate-100"
                      />
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition duration-300"
                      >
                        Confirm Disable 2FA
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDisableForm(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-300 dark:bg-zinc-800 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )
              )}
            </div>
          )}

          {/* METRICS & TELEMETRY TAB */}
          {activeSubTab === 'metrics' && (
            <div className="space-y-6">
              {metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Metric 1 */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Memory Consumption
                      </span>
                      <strong className="block text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
                        {Math.round(metrics.memory.heapUsed / 1024 / 1024)} MB
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Heap Total: {Math.round(metrics.memory.heapTotal / 1024 / 1024)} MB
                      </span>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        API Performance (Avg)
                      </span>
                      <strong className="block text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
                        {metrics.averageResponseTimeMs} ms
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Total Requests Tracked: {metrics.totalRequests}
                      </span>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3">
                    <div className="p-2.5 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-500">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        MongoDB Query Telemetry
                      </span>
                      <strong className="block text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
                        {metrics.dbQueriesExecuted ?? 0}
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Pool Latency: {metrics.dbLatencyAvgMs ?? 0} ms
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">No metric stats captured by performance logger yet.</div>
              )}

              {/* Dynamic Log Monitor Simulator */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono uppercase">
                    <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                    Live JSON Structured Logs Console
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    ONLINE
                  </span>
                </div>

                <div className="font-mono text-[11px] bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-emerald-400/90 h-[180px] overflow-y-auto space-y-1.5 leading-relaxed">
                  {liveLogs.length === 0 ? (
                    <p className="text-slate-500">// No live request logs captured yet. Perform actions or browse pages to log traffic!</p>
                  ) : (
                    liveLogs.map((log, idx) => (
                      <p key={idx}>{JSON.stringify(log)}</p>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FEATURE FLAGS TAB */}
          {activeSubTab === 'flags' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200/50 rounded-2xl p-4 dark:bg-indigo-950/20 dark:border-indigo-900/50 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Feature Toggle Registry</h4>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5 leading-relaxed">
                    Instantly enable or disable functional pathways across the backend or extension without restarting container nodes. Ideal for dark-launching and continuous refinement testing.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 dark:bg-zinc-950/40 dark:border-zinc-800 dark:divide-zinc-800 overflow-hidden">
                {[
                  { key: 'enable2fa', label: 'Enforce Two-Factor Verification', desc: 'Validates 6-digit TOTP codes during administrative login requests.' },
                  { key: 'enableDeviceManagement', label: 'Active Device tracking', desc: 'Enforces session records inside the database and validates active token statuses on each request.' },
                  { key: 'enablePatAuthentication', label: 'Programmatic API Keys / PATs', desc: 'Allows client connections via X-API-Key or Bearer token validation.' },
                  { key: 'enableStructuredLogs', label: 'JSON Structured Console Logs', desc: 'Outputs standardized request-by-request metadata to console.log in structured JSON.' },
                  { key: 'enableBruteForceProtection', label: 'Automated Brute-Force Lockout', desc: 'Locks accounts temporarily after 5 consecutive failed login attempts.' }
                ].map((item) => {
                  const val = flags[item.key] ?? false;
                  return (
                    <div key={item.key} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-zinc-900/10">
                      <div>
                        <strong className="block text-xs text-slate-800 dark:text-slate-200">
                          {item.label}
                        </strong>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {item.desc}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleFlag(item.key, val)}
                        className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition duration-300"
                      >
                        {val ? (
                          <ToggleRight className="w-10 h-10 text-indigo-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-slate-300" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DATABASE STATUS TAB */}
          {activeSubTab === 'database' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200/50 rounded-2xl p-4 dark:bg-indigo-950/20 dark:border-indigo-900/50 flex items-start gap-3">
                <Database className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Database Connection & Live Feed Control</h4>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5 leading-relaxed">
                    Toggle between live MongoDB cluster data and local seed fallback feeds. Fallback mode is active when MongoDB server selection times out (such as due to IP whitelist constraints or missing connection strings).
                  </p>
                </div>
              </div>

              {dbLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-xs text-slate-400">Loading database connectivity details...</p>
                </div>
              ) : dbInfo ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                    dbInfo.isMongoConnected
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-950 dark:bg-emerald-950/10 dark:border-emerald-900/50 dark:text-emerald-100'
                      : 'bg-amber-50 border-amber-100 text-amber-950 dark:bg-amber-950/10 dark:border-amber-900/50 dark:text-amber-100'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        dbInfo.isMongoConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">
                          {dbInfo.isMongoConnected ? 'LIVE DATABASE (MONGODB ATLAS) ACTIVE' : 'LOCAL SEED BACKUP FALLBACK MODE ACTIVE'}
                        </h4>
                        <p className="text-[11px] opacity-80 mt-1 leading-normal max-w-xl">
                          {dbInfo.isMongoConnected 
                            ? 'The application is securely connected to the live MongoDB database. All changes, transactions, reviews, products, and articles are being fetched and stored in the Atlas Cloud Cluster.'
                            : 'The application is operating in a safe offline mode. Due to network connectivity, unwhitelisted IP access, or server configuration, the backend has routed all actions and catalog feeds through the local static seed database.'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="shrink-0">
                      {dbInfo.isMongoConnected ? (
                        <div className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 uppercase flex items-center gap-1.5" title="Offline fallback mode is permanently disabled for system integrity">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Live Mode Locked</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleDbConnection(false)}
                          disabled={dbToggling}
                          className="px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all duration-300 uppercase shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50 bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {dbToggling ? (
                            <>
                              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <span>Connect Live MongoDB</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tech Specs */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">Database Tech Specifications</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl dark:bg-zinc-900/50 dark:border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Mongoose connectionState</span>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            dbInfo.readyState === 1 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`} />
                          <strong className="text-xs text-slate-800 dark:text-slate-100 font-mono capitalize">
                            {dbInfo.readyState === 0 ? 'Disconnected' : dbInfo.readyState === 1 ? 'Connected' : dbInfo.readyState === 2 ? 'Connecting' : dbInfo.readyState === 3 ? 'Disconnecting' : 'Unknown'}
                          </strong>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl dark:bg-zinc-900/50 dark:border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Database URI Connection State</span>
                        <strong className="text-xs text-slate-800 dark:text-slate-100 font-mono">
                          {dbInfo.uri}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 leading-normal bg-amber-50/40 dark:bg-amber-950/5 border border-amber-100/50 dark:border-amber-950/20 p-3 rounded-lg flex gap-2">
                      <span className="text-amber-500">⚠️</span>
                      <span>
                        <strong>Connection Troubleshooting Notes:</strong> If you are unable to connect to the live database and receive a 503 error, please make sure your public server IP or deployment container IP has been whitelisted under the IP Access List in your MongoDB Atlas cluster project settings.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">No database status metrics could be fetched.</div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!confirmModal?.isOpen}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        isDestructive={true}
        cancelText="Cancel"
        confirmText="Confirm"
        onConfirm={confirmModal?.onConfirm || (() => {})}
        onCancel={() => setConfirmModal(null)}
      />

    </div>
  );
};
