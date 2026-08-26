import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/apiClient';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  Shield, 
  ShieldAlert,
  ShieldCheck,
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
  Database,
  Ban,
  Search,
  Filter,
  Trash2,
  Zap,
  AlertOctagon
} from 'lucide-react';

interface SecurityConsoleProps {
  token: string | null;
  triggerAlert: (title: string, message: string) => void;
}

export const SecurityConsole: React.FC<SecurityConsoleProps> = ({ token, triggerAlert }) => {
  // Tabs for the Security console
  const [activeSubTab, setActiveSubTab] = useState<'threats' | 'sessions' | 'pats' | '2fa' | 'metrics' | 'flags' | 'database'>('threats');

  // Loading States
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [sessions, setSessions] = useState<any[]>([]);
  const [pats, setPats] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [liveLogs, setLiveLogs] = useState<any[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  // Anomaly & Threat Intelligence Data
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<any>(null);
  const [rateLimitTiers, setRateLimitTiers] = useState<any[]>([]);
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [threatSearch, setThreatSearch] = useState('');
  const [threatSeverityFilter, setThreatSeverityFilter] = useState('ALL');
  const [threatCategoryFilter, setThreatCategoryFilter] = useState('ALL');

  // Manual IP Block form
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualDuration, setManualDuration] = useState(60);
  const [ipActionLoading, setIpActionLoading] = useState(false);

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

  const fetchThreats = async () => {
    try {
      const params = new URLSearchParams();
      if (threatSeverityFilter !== 'ALL') params.append('severity', threatSeverityFilter);
      if (threatCategoryFilter !== 'ALL') params.append('category', threatCategoryFilter);
      if (threatSearch.trim()) params.append('search', threatSearch.trim());

      const res = await apiCall(`/api/admin/security/anomalies?${params.toString()}`);
      if (res.success) {
        setAnomalies(res.anomalies || []);
        setAnomalyStats(res.stats || null);
      }
    } catch (e) {}
  };

  const fetchRateLimits = async () => {
    try {
      const res = await apiCall('/api/admin/security/rate-limits');
      if (res.success) {
        setRateLimitTiers(res.tiers || []);
      }
    } catch (e) {}
  };

  const fetchBlockedIps = async () => {
    try {
      const res = await apiCall('/api/admin/security/blocked-ips');
      if (res.success) {
        setBlockedIps(res.blockedIps || []);
      }
    } catch (e) {}
  };

  const handleManualBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    try {
      setIpActionLoading(true);
      const res = await apiCall('/api/admin/security/ip-block', {
        method: 'POST',
        body: JSON.stringify({
          ipAddress: manualIp.trim(),
          action: 'block',
          reason: manualReason.trim() || 'Manual administrator block',
          durationMinutes: manualDuration
        })
      });
      if (res.success) {
        triggerAlert('IP Address Blocked', res.message || `IP ${manualIp} has been blocked.`);
        setManualIp('');
        setManualReason('');
        await Promise.all([fetchBlockedIps(), fetchThreats()]);
      }
    } catch (err) {
    } finally {
      setIpActionLoading(false);
    }
  };

  const handleUnblockIp = async (ipAddress: string) => {
    try {
      const res = await apiCall('/api/admin/security/ip-block', {
        method: 'POST',
        body: JSON.stringify({
          ipAddress,
          action: 'unblock'
        })
      });
      if (res.success) {
        triggerAlert('IP Unblocked', `IP address ${ipAddress} has been unblocked.`);
        await Promise.all([fetchBlockedIps(), fetchThreats()]);
      }
    } catch (err) {}
  };

  const handleClearAnomalies = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Anomaly Records',
      message: 'Are you sure you want to clear the in-memory anomaly history? Real-time counters will be reset.',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await apiCall('/api/admin/security/anomalies/clear', { method: 'POST' });
          if (res.success) {
            triggerAlert('Success', 'Anomaly telemetry history has been cleared.');
            await fetchThreats();
          }
        } catch (e) {}
      }
    });
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
    if (activeSubTab === 'threats') {
      await Promise.all([fetchThreats(), fetchRateLimits(), fetchBlockedIps()]);
    }
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
      fetchThreats(),
      fetchRateLimits(),
      fetchBlockedIps(),
      fetchSessions(),
      fetchPats(),
      fetch2faStatus(),
      fetchMetrics(),
      fetchFlags(),
      fetchDbStatus()
    ]).finally(() => setLoading(false));
  }, [token]);

  // Refetch threats when filters change
  useEffect(() => {
    if (activeSubTab === 'threats') {
      fetchThreats();
    }
  }, [activeSubTab, threatSeverityFilter, threatCategoryFilter, threatSearch]);

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
            Enterprise-grade rate limiting, anomaly threat detection, IP shielding, multi-device sessions, TOTP 2FA, and telemetry.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-3 md:mt-0 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700 flex items-center justify-center gap-2 transition duration-300 cursor-pointer"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Console
        </button>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-zinc-800/60 rounded-xl max-w-fit">
        {[
          { id: 'threats', label: 'Rate Limits & Threats', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
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
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition duration-300 cursor-pointer ${
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

          {/* THREATS & RATE LIMITS TAB */}
          {activeSubTab === 'threats' && (
            <div className="space-y-6">
              
              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 rounded-2xl p-4 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3.5">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-500 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Anomalies</span>
                    <strong className="block text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                      {anomalyStats?.totalAnomalies ?? 0}
                    </strong>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block mt-0.5">
                      {anomalyStats?.bySeverity?.CRITICAL ?? 0} Critical / {anomalyStats?.bySeverity?.HIGH ?? 0} High
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-4 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-500 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rate Limit Breaches</span>
                    <strong className="block text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                      {anomalyStats?.byCategory?.RATE_LIMIT_BREACH ?? 0}
                    </strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Across 8 Active Tiers
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-4 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3.5">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500 shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blocked IP Addresses</span>
                    <strong className="block text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                      {anomalyStats?.activeBlockedIpsCount ?? blockedIps.length}
                    </strong>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
                      Automated & Manual Blocks
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-4 dark:bg-zinc-950/40 dark:border-zinc-800 flex items-start gap-3.5">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Engine Status</span>
                    <strong className="block text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      ACTIVE & GUARDING
                    </strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      express-rate-limit 7.5.0
                    </span>
                  </div>
                </div>
              </div>

              {/* RATE LIMITING TIERS MATRIX */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      Active Rate Limiter Tiers & Throttles
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enforced per spoof-proof client IP via express-rate-limit to protect sensitive APIs from brute force and DoS.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg font-bold">
                    8 Tiers Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(rateLimitTiers.length > 0 ? rateLimitTiers : [
                    { id: 'global', name: 'Global API Baseline', windowMs: 300000, maxLimit: 600, description: 'All /api/ endpoints DoS protection', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'strict_login', name: 'Strict Login & Auth', windowMs: 900000, maxLimit: 12, description: 'Brute-force & credential stuffing defense', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'sensitive_auth', name: 'Sensitive Auth & 2FA', windowMs: 900000, maxLimit: 30, description: 'Registration, 2FA, token exchanges', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'password_reset', name: 'Password Recovery', windowMs: 900000, maxLimit: 5, description: 'Recovery requests & enumeration defense', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'extension_pair', name: 'Extension Pairing & Import', windowMs: 600000, maxLimit: 5, description: 'Single-use pairing code authorization', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'admin_api', name: 'Admin Gateway Protection', windowMs: 300000, maxLimit: 200, description: 'Backoffice management operations', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'ai_heavy', name: 'AI & Heavy Compute', windowMs: 300000, maxLimit: 20, description: 'Gemini generation & comparison pipeline', totalBreaches: 0, activeThrottlesCount: 0 },
                    { id: 'public_actions', name: 'Public User Forms', windowMs: 900000, maxLimit: 15, description: 'Newsletter, contact form, interest clicks', totalBreaches: 0, activeThrottlesCount: 0 }
                  ]).map((tier) => (
                    <div key={tier.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl dark:bg-zinc-900/50 dark:border-zinc-800/80 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate">{tier.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded font-semibold">
                            {tier.maxLimit} req / {Math.round(tier.windowMs / 60000)}m
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">{tier.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-zinc-800 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Breaches Recorded:</span>
                        <span className={`font-mono font-bold ${tier.totalBreaches > 0 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}`}>
                          {tier.totalBreaches}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IP BLOCKLIST & MANUAL ENFORCEMENT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Form to manual block IP */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-500" />
                    Manual IP Shield / Block
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Immediately deny all API access for a malicious IP address across the entire application.
                  </p>

                  <form onSubmit={handleManualBlock} className="space-y-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        IP Address
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 198.51.100.42"
                        value={manualIp}
                        onChange={(e) => setManualIp(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Reason
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Excessive vulnerability scanning"
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Duration (Minutes)
                      </label>
                      <select
                        value={manualDuration}
                        onChange={(e) => setManualDuration(parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-slate-100"
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={360}>6 Hours</option>
                        <option value={1440}>24 Hours</option>
                        <option value={10080}>7 Days</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={ipActionLoading || !manualIp.trim()}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {ipActionLoading ? 'Blocking...' : 'Enforce IP Block'}
                    </button>
                  </form>
                </div>

                {/* Active blocked IPs list */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Currently Blocked IP Addresses ({blockedIps.length})
                      </h4>
                      <button
                        onClick={fetchBlockedIps}
                        className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer"
                      >
                        Refresh
                      </button>
                    </div>

                    <div className="mt-3 overflow-y-auto max-h-[220px]">
                      {blockedIps.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                          <ShieldCheck className="w-6 h-6 text-emerald-500" />
                          <span>No IP addresses currently blocked. Clean traffic flow!</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {blockedIps.map((entry) => (
                            <div key={entry.ip} className="p-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{entry.ip}</span>
                                  {entry.manual && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded font-semibold">
                                      MANUAL
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">{entry.reason}</p>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Expires: {new Date(entry.expiresAt).toLocaleTimeString()} ({Math.max(0, Math.ceil((new Date(entry.expiresAt).getTime() - Date.now()) / 60000))}m remaining)
                                </span>
                              </div>
                              <button
                                onClick={() => handleUnblockIp(entry.ip)}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg transition duration-300 cursor-pointer"
                              >
                                Unblock
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Blocked IPs receive a 403 Forbidden with standard security code before any request is processed.
                  </p>
                </div>
              </div>

              {/* REAL-TIME ANOMALY DETECTION LOG STREAM */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 dark:bg-zinc-950/40 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4 text-rose-500" />
                      Security Anomaly Stream & Threat Telemetry
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Captures failed auth bursts, credential stuffing patterns, vulnerability probes, and rate-limit violations.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchThreats}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-zinc-800 dark:text-slate-300 flex items-center gap-1.5 transition duration-300 cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
                    <button
                      onClick={handleClearAnomalies}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 rounded-xl flex items-center gap-1.5 transition duration-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear History
                    </button>
                  </div>
                </div>

                {/* FILTERS BAR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search IP, endpoint, identifier..."
                      value={threatSearch}
                      onChange={(e) => setThreatSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <select
                      value={threatSeverityFilter}
                      onChange={(e) => setThreatSeverityFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-slate-100"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High Only</option>
                      <option value="MEDIUM">Medium Only</option>
                      <option value="LOW">Low Only</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={threatCategoryFilter}
                      onChange={(e) => setThreatCategoryFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-slate-100"
                    >
                      <option value="ALL">All Threat Categories</option>
                      <option value="CREDENTIAL_STUFFING">Credential Stuffing</option>
                      <option value="VULNERABILITY_PROBE">Vulnerability Probing</option>
                      <option value="RATE_LIMIT_BREACH">Rate Limit Breach</option>
                      <option value="ANOMALOUS_TRAFFIC_SPIKE">Traffic Burst / Spikes</option>
                      <option value="UNAUTHORIZED_ADMIN_ACCESS">Unauthorized Admin Access</option>
                    </select>
                  </div>
                </div>

                {/* ANOMALY STREAM TABLE */}
                <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-zinc-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-zinc-800">
                          <th className="px-3.5 py-2.5">Time</th>
                          <th className="px-3.5 py-2.5">Severity</th>
                          <th className="px-3.5 py-2.5">Threat Category</th>
                          <th className="px-3.5 py-2.5">Client IP & Target</th>
                          <th className="px-3.5 py-2.5">Details</th>
                          <th className="px-3.5 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {anomalies.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              No security anomalies matching current filter criteria.
                            </td>
                          </tr>
                        ) : (
                          anomalies.map((anom) => (
                            <tr key={anom.id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/20">
                              <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                {new Date(anom.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  anom.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                                  anom.severity === 'HIGH' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                                  anom.severity === 'MEDIUM' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
                                  'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300'
                                }`}>
                                  {anom.severity}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {anom.category.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold text-[11px]">{anom.ipAddress}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{anom.method} {anom.path}</div>
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 text-[11px] max-w-[260px]">
                                <div>{anom.message}</div>
                                {anom.targetIdentifier && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Target: {anom.targetIdentifier}</div>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                {!blockedIps.some(b => b.ip === anom.ipAddress) ? (
                                  <button
                                    onClick={() => {
                                      setManualIp(anom.ipAddress);
                                      setManualReason(`Detected ${anom.category}: ${anom.message}`);
                                      setActiveSubTab('threats');
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent rounded-lg transition duration-300 cursor-pointer"
                                  >
                                    Block IP
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">Blocked</span>
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

            </div>
          )}

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
