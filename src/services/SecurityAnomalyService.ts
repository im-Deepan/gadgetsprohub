/**
 * Security & Anomaly Detection Service
 * Monitors API traffic patterns, detects brute-force attacks, high-frequency request bursts,
 * malicious probes, and logs security anomalies for internal admin reporting.
 */

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AnomalyCategory = 
  | 'BRUTE_FORCE_AUTH'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ANOMALOUS_TRAFFIC_SPIKE'
  | 'VULNERABILITY_PROBE'
  | 'UNAUTHORIZED_ACCESS'
  | 'CREDENTIAL_STUFFING'
  | 'SUSPICIOUS_PAYLOAD';

export interface SecurityAnomaly {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  title: string;
  description: string;
  ipAddress: string;
  path: string;
  method: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: string;
  resolved?: boolean;
}

export interface BlockedIpEntry {
  ipAddress: string;
  reason: string;
  blockedAt: string;
  expiresAt: string | null;
  manual: boolean;
}

export interface RateLimitTierConfig {
  id: string;
  name: string;
  description: string;
  windowMs: number;
  maxRequests: number;
  endpointPrefix: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalHits: number;
  totalBlocks: number;
}

export class SecurityAnomalyService {
  // In-memory sliding window trackers
  private static ipRequestTimestamps = new Map<string, number[]>();
  private static ipFailedAuthTimestamps = new Map<string, { time: number; identifier: string; path: string }[]>();
  private static userFailedAuthTimestamps = new Map<string, { time: number; ip: string }[]>();
  
  // In-memory anomaly ring-buffer (up to 1000 items)
  private static anomalies: SecurityAnomaly[] = [];
  
  // Active IP blocklist
  private static blockedIps = new Map<string, BlockedIpEntry>();

  // Rate limit tier performance metrics
  private static rateLimitTiers: Map<string, RateLimitTierConfig> = new Map([
    ['global', {
      id: 'global',
      name: 'Global API Shield',
      description: 'Baseline DoS prevention across all /api/ endpoints',
      windowMs: 5 * 60 * 1000,
      maxRequests: 600,
      endpointPrefix: '/api/',
      riskLevel: 'LOW',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['strict_login', {
      id: 'strict_login',
      name: 'Authentication & Login Shield',
      description: 'Strict brute-force mitigation for password and OAuth login endpoints',
      windowMs: 15 * 60 * 1000,
      maxRequests: 12,
      endpointPrefix: '/api/auth/login, /api/auth/google',
      riskLevel: 'CRITICAL',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['sensitive_auth', {
      id: 'sensitive_auth',
      name: '2FA & Registration Guard',
      description: 'Protects 2FA verification, registration, token exchange and profile security',
      windowMs: 15 * 60 * 1000,
      maxRequests: 30,
      endpointPrefix: '/api/auth/2fa/*, /api/auth/register',
      riskLevel: 'HIGH',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['password_reset', {
      id: 'password_reset',
      name: 'Password Recovery Guard',
      description: 'Mitigates email enumeration and password reset token exhaustion',
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      endpointPrefix: '/api/auth/forgot-password, /api/auth/reset-password',
      riskLevel: 'HIGH',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['extension_pair', {
      id: 'extension_pair',
      name: 'Extension Pairing & Import Gateway',
      description: 'Restricts 6-digit code pairing attempts and bulk scraper synchronization',
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
      endpointPrefix: '/api/auth/pair, /api/admin/products/import',
      riskLevel: 'HIGH',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['admin_api', {
      id: 'admin_api',
      name: 'Admin Gateway Protection',
      description: 'Guards back-office administrative endpoints from script-driven abuse',
      windowMs: 5 * 60 * 1000,
      maxRequests: 200,
      endpointPrefix: '/api/admin/*',
      riskLevel: 'MEDIUM',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['ai_heavy', {
      id: 'ai_heavy',
      name: 'AI & Heavy Compute Limiter',
      description: 'Prevents runaway LLM token usage and SEO audit computation spikes',
      windowMs: 5 * 60 * 1000,
      maxRequests: 20,
      endpointPrefix: '/api/admin/ai/*, /api/admin/seo/analyze',
      riskLevel: 'MEDIUM',
      totalHits: 0,
      totalBlocks: 0
    }],
    ['public_actions', {
      id: 'public_actions',
      name: 'Public Actions Limiter',
      description: 'Throttles contact form submissions, newsletter registrations and outbound click triggers',
      windowMs: 15 * 60 * 1000,
      maxRequests: 15,
      endpointPrefix: '/api/contact, /api/newsletter/subscribe, /api/products/pick-left-click',
      riskLevel: 'LOW',
      totalHits: 0,
      totalBlocks: 0
    }]
  ]);

  // Known vulnerability probe patterns
  private static PROBE_PATTERNS = [
    /\/\.env/i,
    /\/wp-login\.php/i,
    /\/wp-admin/i,
    /\/\.git/i,
    /\/phpmyadmin/i,
    /\/actuator/i,
    /\/swagger-ui/i,
    /\/\.\.\//i,
    /%2e%2e%2f/i,
    /<script.*?>.*?<\/script>/i,
    /union(\s+all)?\s+select/i,
    /etc\/passwd/i,
    /\/eval\(/i
  ];

  /**
   * Checks if an IP is currently blocked
   */
  public static isIpBlocked(ip: string): boolean {
    if (!ip) return false;
    const cleanIp = ip.trim();
    const entry = this.blockedIps.get(cleanIp);
    if (!entry) return false;

    if (entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now()) {
      this.blockedIps.delete(cleanIp);
      return false;
    }
    return true;
  }

  /**
   * Block an IP address manually or automatically
   */
  public static blockIp(ip: string, reason: string, durationMinutes: number = 60, manual: boolean = false): BlockedIpEntry {
    const cleanIp = ip.trim();
    const expiresAt = durationMinutes > 0 
      ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
      : null;

    const entry: BlockedIpEntry = {
      ipAddress: cleanIp,
      reason,
      blockedAt: new Date().toISOString(),
      expiresAt,
      manual
    };

    this.blockedIps.set(cleanIp, entry);

    this.recordAnomaly({
      category: 'UNAUTHORIZED_ACCESS',
      severity: manual ? 'HIGH' : 'CRITICAL',
      title: `IP Address Blocked: ${cleanIp}`,
      description: `IP ${cleanIp} has been ${manual ? 'manually' : 'automatically'} blocked. Reason: ${reason}`,
      ipAddress: cleanIp,
      path: '*',
      method: 'BLOCK',
      details: { durationMinutes, manual, expiresAt }
    });

    return entry;
  }

  /**
   * Unblock an IP address
   */
  public static unblockIp(ip: string): boolean {
    const cleanIp = ip.trim();
    return this.blockedIps.delete(cleanIp);
  }

  /**
   * Retrieve list of blocked IPs
   */
  public static getBlockedIps(): BlockedIpEntry[] {
    const now = Date.now();
    const active: BlockedIpEntry[] = [];
    for (const [ip, entry] of this.blockedIps.entries()) {
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() < now) {
        this.blockedIps.delete(ip);
      } else {
        active.push(entry);
      }
    }
    return active;
  }

  /**
   * Inspects every incoming request for unusual frequency spikes and probe signatures
   */
  public static inspectIncomingRequest(
    ip: string,
    path: string,
    method: string,
    userAgent: string = 'unknown'
  ): { isBlocked: boolean; anomalyDetected?: SecurityAnomaly } {
    if (this.isIpBlocked(ip)) {
      return { isBlocked: true };
    }

    const now = Date.now();

    // 1. Check for malicious vulnerability scanning / directory traversal signatures
    const isProbe = this.PROBE_PATTERNS.some(pattern => pattern.test(path));
    if (isProbe) {
      const anomaly = this.recordAnomaly({
        category: 'VULNERABILITY_PROBE',
        severity: 'CRITICAL',
        title: 'Vulnerability Scanner / Directory Traversal Probe Detected',
        description: `Client attempted to probe sensitive/unauthorized path: ${path}`,
        ipAddress: ip,
        path,
        method,
        userAgent,
        details: { matchedPath: path }
      });
      return { isBlocked: false, anomalyDetected: anomaly };
    }

    // 2. Track request timestamps for sudden burst / traffic spike detection
    let timestamps = this.ipRequestTimestamps.get(ip);
    if (!timestamps) {
      timestamps = [];
      this.ipRequestTimestamps.set(ip, timestamps);
    }

    timestamps.push(now);

    // Keep only timestamps within the last 60 seconds
    const cutoff60s = now - 60 * 1000;
    while (timestamps.length > 0 && timestamps[0] < cutoff60s) {
      timestamps.shift();
    }

    // Count in last 10 seconds
    const cutoff10s = now - 10 * 1000;
    let countIn10s = 0;
    for (let i = timestamps.length - 1; i >= 0; i--) {
      if (timestamps[i] >= cutoff10s) {
        countIn10s++;
      } else {
        break;
      }
    }

    // Thresholds: >45 requests in 10s or >180 requests in 60s
    if (countIn10s >= 45 || timestamps.length >= 180) {
      // Check if we already logged a traffic burst for this IP in the last 30 seconds
      const recentSpike = this.anomalies.find(
        a => a.category === 'ANOMALOUS_TRAFFIC_SPIKE' && 
             a.ipAddress === ip && 
             (now - new Date(a.timestamp).getTime()) < 30000
      );

      if (!recentSpike) {
        const anomaly = this.recordAnomaly({
          category: 'ANOMALOUS_TRAFFIC_SPIKE',
          severity: countIn10s >= 60 ? 'CRITICAL' : 'HIGH',
          title: 'Unusual Request Frequency Spike (Potential DoS / Aggressive Scraper)',
          description: `Client issued ${countIn10s} requests in 10s (${timestamps.length} reqs/min), exceeding normal traffic thresholds.`,
          ipAddress: ip,
          path,
          method,
          userAgent,
          details: { countIn10s, countIn60s: timestamps.length }
        });
        return { isBlocked: false, anomalyDetected: anomaly };
      }
    }

    return { isBlocked: false };
  }

  /**
   * Records a failed authentication attempt and detects brute-force or credential stuffing patterns
   */
  public static recordFailedAuth(
    ip: string,
    identifier: string,
    reason: string,
    path: string,
    userAgent: string = 'unknown'
  ): void {
    const now = Date.now();
    const cleanIp = ip.trim();
    const cleanId = (identifier || 'unknown').toLowerCase().trim();

    // 1. Track IP-level failures
    let ipFails = this.ipFailedAuthTimestamps.get(cleanIp);
    if (!ipFails) {
      ipFails = [];
      this.ipFailedAuthTimestamps.set(cleanIp, ipFails);
    }
    ipFails.push({ time: now, identifier: cleanId, path });

    // Prune entries older than 5 minutes
    const cutoff5m = now - 5 * 60 * 1000;
    while (ipFails.length > 0 && ipFails[0].time < cutoff5m) {
      ipFails.shift();
    }

    // 2. Track Identifier-level failures (User Account targeting)
    let userFails = this.userFailedAuthTimestamps.get(cleanId);
    if (!userFails) {
      userFails = [];
      this.userFailedAuthTimestamps.set(cleanId, userFails);
    }
    userFails.push({ time: now, ip: cleanIp });
    while (userFails.length > 0 && userFails[0].time < cutoff5m) {
      userFails.shift();
    }

    // Evaluate IP brute-force pattern (>= 4 failed attempts from same IP within 5 mins)
    if (ipFails.length >= 4) {
      const distinctUsers = new Set(ipFails.map(f => f.identifier));
      const isCredentialStuffing = distinctUsers.size >= 3;

      this.recordAnomaly({
        category: isCredentialStuffing ? 'CREDENTIAL_STUFFING' : 'BRUTE_FORCE_AUTH',
        severity: ipFails.length >= 8 ? 'CRITICAL' : 'HIGH',
        title: isCredentialStuffing 
          ? `Credential Stuffing Campaign Detected from IP ${cleanIp}` 
          : `Brute Force Authentication Pattern Detected from IP ${cleanIp}`,
        description: isCredentialStuffing
          ? `IP attempted to authenticate against ${distinctUsers.size} different accounts (${ipFails.length} failed attempts in 5m).`
          : `Repeated failed logins (${ipFails.length} attempts in 5m) targeting ${cleanId}. Last failure reason: ${reason}`,
        ipAddress: cleanIp,
        path,
        method: 'POST',
        userAgent,
        details: {
          failedAttemptsCount: ipFails.length,
          targetedIdentifier: cleanId,
          distinctAccountsTargeted: Array.from(distinctUsers),
          reason
        }
      });
    }

    // Evaluate Account targeting from multiple IPs (Distributed Brute Force)
    if (userFails.length >= 5 && cleanId !== 'unknown') {
      const distinctIps = new Set(userFails.map(f => f.ip));
      if (distinctIps.size >= 2) {
        this.recordAnomaly({
          category: 'BRUTE_FORCE_AUTH',
          severity: 'CRITICAL',
          title: `Distributed Brute Force Targeting Account: ${cleanId}`,
          description: `Account is being targeted from ${distinctIps.size} distinct IP addresses (${userFails.length} failed attempts).`,
          ipAddress: cleanIp,
          path,
          method: 'POST',
          userAgent,
          details: {
            failedAttemptsCount: userFails.length,
            originIps: Array.from(distinctIps),
            targetedIdentifier: cleanId
          }
        });
      }
    }
  }

  /**
   * Resets failed authentication tracker on successful login
   */
  public static recordSuccessfulAuth(identifier: string, ip: string): void {
    const cleanId = (identifier || '').toLowerCase().trim();
    if (cleanId) {
      this.userFailedAuthTimestamps.delete(cleanId);
    }
    const cleanIp = ip.trim();
    if (cleanIp) {
      const fails = this.ipFailedAuthTimestamps.get(cleanIp);
      if (fails) {
        // Remove successes for this identifier
        const filtered = fails.filter(f => f.identifier !== cleanId);
        if (filtered.length === 0) {
          this.ipFailedAuthTimestamps.delete(cleanIp);
        } else {
          this.ipFailedAuthTimestamps.set(cleanIp, filtered);
        }
      }
    }
  }

  /**
   * Tracks an express-rate-limit breach
   */
  public static recordRateLimitHit(
    tierId: string,
    ip: string,
    path: string,
    method: string,
    userAgent: string = 'unknown',
    limit: number = 0,
    windowMs: number = 0
  ): void {
    const tier = this.rateLimitTiers.get(tierId);
    if (tier) {
      tier.totalBlocks++;
    }

    this.recordAnomaly({
      category: 'RATE_LIMIT_EXCEEDED',
      severity: (tierId === 'strict_login' || tierId === 'password_reset') ? 'HIGH' : 'MEDIUM',
      title: `Rate Limit Exceeded: ${tier?.name || tierId}`,
      description: `Client hit rate limit threshold on ${path} (${limit} requests allowed per ${Math.round(windowMs / 1000)}s window).`,
      ipAddress: ip,
      path,
      method,
      userAgent,
      details: {
        tierId,
        tierName: tier?.name,
        limit,
        windowMs,
        retryAfterSec: Math.round(windowMs / 1000)
      }
    });
  }

  /**
   * Records unauthorized access attempts (401/403 on admin routes)
   */
  public static recordUnauthorizedAccess(
    ip: string,
    path: string,
    method: string,
    userEmail: string = 'anonymous',
    userAgent: string = 'unknown'
  ): void {
    this.recordAnomaly({
      category: 'UNAUTHORIZED_ACCESS',
      severity: path.startsWith('/api/admin') ? 'HIGH' : 'MEDIUM',
      title: `Unauthorized Administrative Access Attempt on ${path}`,
      description: `User '${userEmail}' from IP ${ip} attempted to access restricted endpoint '${path}' without sufficient permissions.`,
      ipAddress: ip,
      path,
      method,
      userAgent,
      details: { userEmail }
    });
  }

  /**
   * Main method to record an anomaly event
   */
  public static recordAnomaly(params: {
    category: AnomalyCategory;
    severity: AnomalySeverity;
    title: string;
    description: string;
    ipAddress: string;
    path: string;
    method: string;
    userAgent?: string;
    details?: Record<string, any>;
  }): SecurityAnomaly {
    const anomaly: SecurityAnomaly = {
      id: `anom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      category: params.category,
      severity: params.severity,
      title: params.title,
      description: params.description,
      ipAddress: params.ipAddress || 'unknown',
      path: params.path || '/',
      method: (params.method || 'GET').toUpperCase(),
      userAgent: params.userAgent || 'unknown',
      details: params.details || {},
      timestamp: new Date().toISOString(),
      resolved: false
    };

    // Prepend to in-memory store
    this.anomalies.unshift(anomaly);
    if (this.anomalies.length > 1000) {
      this.anomalies.pop();
    }

    return anomaly;
  }

  /**
   * Retrieve anomalies with optional filtering
   */
  public static getAnomalies(options?: {
    severity?: string;
    category?: string;
    search?: string;
    limit?: number;
    sinceMinutes?: number;
  }): SecurityAnomaly[] {
    let filtered = [...this.anomalies];

    if (options?.sinceMinutes && options.sinceMinutes > 0) {
      const cutoff = Date.now() - options.sinceMinutes * 60 * 1000;
      filtered = filtered.filter(a => new Date(a.timestamp).getTime() >= cutoff);
    }

    if (options?.severity && options.severity !== 'all') {
      filtered = filtered.filter(a => a.severity.toLowerCase() === options.severity?.toLowerCase());
    }

    if (options?.category && options.category !== 'all') {
      filtered = filtered.filter(a => a.category.toLowerCase() === options.category?.toLowerCase());
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.ipAddress.toLowerCase().includes(q) ||
        a.path.toLowerCase().includes(q)
      );
    }

    const limit = options?.limit || 100;
    return filtered.slice(0, limit);
  }

  /**
   * Get aggregated anomaly telemetry for internal admin dashboard
   */
  public static getAnomalyStats() {
    const now = Date.now();
    const last24hCutoff = now - 24 * 60 * 60 * 1000;
    const last7dCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const last1hCutoff = now - 60 * 60 * 1000;

    const last24h = this.anomalies.filter(a => new Date(a.timestamp).getTime() >= last24hCutoff);
    const last7d = this.anomalies.filter(a => new Date(a.timestamp).getTime() >= last7dCutoff);
    const last1h = this.anomalies.filter(a => new Date(a.timestamp).getTime() >= last1hCutoff);

    // Severity breakdown (last 24h)
    const severityCount = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    for (const a of last24h) {
      if (severityCount[a.severity] !== undefined) {
        severityCount[a.severity]++;
      }
    }

    // Category breakdown (last 24h)
    const categoryCount: Record<string, number> = {
      BRUTE_FORCE_AUTH: 0,
      RATE_LIMIT_EXCEEDED: 0,
      ANOMALOUS_TRAFFIC_SPIKE: 0,
      VULNERABILITY_PROBE: 0,
      UNAUTHORIZED_ACCESS: 0,
      CREDENTIAL_STUFFING: 0
    };
    for (const a of last24h) {
      categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
    }

    // Top suspicious IPs
    const ipCounts = new Map<string, { count: number; lastSeen: string; severities: Set<string>; topCategory: string }>();
    for (const a of last24h) {
      const existing = ipCounts.get(a.ipAddress) || {
        count: 0,
        lastSeen: a.timestamp,
        severities: new Set<string>(),
        topCategory: a.category
      };
      existing.count++;
      existing.severities.add(a.severity);
      ipCounts.set(a.ipAddress, existing);
    }

    const topSuspiciousIps = Array.from(ipCounts.entries())
      .map(([ip, data]) => ({
        ipAddress: ip,
        anomalyCount: data.count,
        lastSeen: data.lastSeen,
        severities: Array.from(data.severities),
        topCategory: data.topCategory,
        isBlocked: this.isIpBlocked(ip)
      }))
      .sort((a, b) => b.anomalyCount - a.anomalyCount)
      .slice(0, 10);

    // Current threat level calculation
    let overallThreatLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (severityCount.CRITICAL > 0 || last1h.length >= 15) {
      overallThreatLevel = 'CRITICAL';
    } else if (severityCount.HIGH >= 3 || last1h.length >= 6) {
      overallThreatLevel = 'HIGH';
    } else if (severityCount.HIGH > 0 || severityCount.MEDIUM >= 5 || last1h.length >= 2) {
      overallThreatLevel = 'ELEVATED';
    }

    return {
      overallThreatLevel,
      totalAnomalies24h: last24h.length,
      totalAnomalies7d: last7d.length,
      totalAnomalies1h: last1h.length,
      activeBlockedIpsCount: this.getBlockedIps().length,
      severityBreakdown: severityCount,
      categoryBreakdown: categoryCount,
      topSuspiciousIps,
      rateLimitTiers: Array.from(this.rateLimitTiers.values())
    };
  }

  /**
   * Get configured rate limit tiers
   */
  public static getRateLimitTiers(): RateLimitTierConfig[] {
    return Array.from(this.rateLimitTiers.values());
  }

  /**
   * Clear or purge anomalies
   */
  public static clearAnomalies(): void {
    this.anomalies = [];
  }
}
