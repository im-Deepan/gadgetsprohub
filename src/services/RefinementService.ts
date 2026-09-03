import mongoose from 'mongoose';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

// ========== STRUCTURED LOGGING ENGINE ==========
export class Logger {
  public static error(message: string, error?: any, service = 'RefinementService'): void {
    if (ConfigurationService.getFlag('enableStructuredLogs')) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        service,
        message,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      }));
    } else {
      console.error(`[${service}] [ERROR] ${message}`, error);
    }
  }

  public static info(message: string, details?: any, service = 'RefinementService'): void {
    if (ConfigurationService.getFlag('enableStructuredLogs')) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service,
        message,
        details
      }));
    } else {
      console.log(`[${service}] [INFO] ${message}`, details);
    }
  }
}

// ========== SCHEMAS & MODELS ==========

// 1. User Session Schema
const userSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  ipAddress: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
});
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserSession = mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);

// 2. Personal Access Token (PAT) Schema
const personalAccessTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: Date,
  revoked: { type: Boolean, default: false }
});

export const PersonalAccessToken = mongoose.models.PersonalAccessToken || mongoose.model('PersonalAccessToken', personalAccessTokenSchema);

// 3. Distributed Cache Schema (L2 distributed fallback)
const cacheEntrySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true }
});
cacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CacheEntry = mongoose.models.CacheEntry || mongoose.model('CacheEntry', cacheEntrySchema);


// 4. Feature Flags Schema (for L2 distributed persistence)
const featureFlagsSchema = new mongoose.Schema({
  flags: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now }
});
export const FeatureFlags = mongoose.models.FeatureFlags || mongoose.model('FeatureFlags', featureFlagsSchema);

// ========== CORE SERVICES ==========

// 1. Feature Flags and Configuration Service
const FLAGS_FILE_PATH = path.join(process.cwd(), 'data', 'feature_flags.json');

export class ConfigurationService {
  private static readonly KNOWN_FLAGS = new Set([
    'enable2fa',
    'enableDeviceManagement',
    'enableLoginHistory',
    'enablePatAuthentication',
    'enableBruteForceProtection',
    'enableStructuredLogs',
    'enableDependencyInjection'
  ]);

  private static flags: Record<string, boolean> = {
    enable2fa: true,
    enableDeviceManagement: true,
    enableLoginHistory: true,
    enablePatAuthentication: true,
    enableBruteForceProtection: true,
    enableStructuredLogs: true,
    enableDependencyInjection: true
  };
  private static isFileInitialized = false;
  private static isDbSynced = false;

  public static async initFlagsAsync(forceRefresh = false): Promise<void> {
    if (this.isDbSynced && !forceRefresh) return;
    try {
      if (mongoose.connection.readyState === 1) {
        const doc = await FeatureFlags.findOne({});
        if (doc && doc.flags && typeof doc.flags === 'object') {
          this.flags = { ...this.flags, ...doc.flags };
          this.isDbSynced = true;
          // Sync to local JSON file as durable secondary cache
          try {
            const dir = path.dirname(FLAGS_FILE_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(FLAGS_FILE_PATH, JSON.stringify(this.flags, null, 2), 'utf8');
          } catch (fileErr) {}
        }
      } else if (!this.isFileInitialized && fs.existsSync(FLAGS_FILE_PATH)) {
        const fileData = fs.readFileSync(FLAGS_FILE_PATH, 'utf8');
        const parsed = JSON.parse(fileData);
        if (parsed && typeof parsed === 'object') {
          this.flags = { ...this.flags, ...parsed };
        }
        this.isFileInitialized = true;
      }
    } catch (err: any) {
      console.warn('[ConfigurationService] Failed to load persisted feature flags:', err.message);
    }
  }

  public static initFlags(): void {
    if (!this.isFileInitialized) {
      this.isFileInitialized = true;
      try {
        if (fs.existsSync(FLAGS_FILE_PATH)) {
          const fileData = fs.readFileSync(FLAGS_FILE_PATH, 'utf8');
          const parsed = JSON.parse(fileData);
          if (parsed && typeof parsed === 'object') {
            this.flags = { ...this.flags, ...parsed };
          }
        }
      } catch (err: any) {}
    }

    // Trigger non-blocking DB hydration if MongoDB is connected and not yet synced
    if (mongoose.connection.readyState === 1 && !this.isDbSynced) {
      this.initFlagsAsync().catch(() => {});
    }
  }

  private static async saveFlagsAsync(): Promise<void> {
    try {
      const dir = path.dirname(FLAGS_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(FLAGS_FILE_PATH, JSON.stringify(this.flags, null, 2), 'utf8');

      if (mongoose.connection.readyState === 1) {
        await FeatureFlags.findOneAndUpdate({}, { flags: this.flags, updatedAt: new Date() }, { upsert: true });
        this.isDbSynced = true;
      }
    } catch (err: any) {
      console.warn('[ConfigurationService] Failed to persist feature flags:', err.message);
    }
  }

  public static getFlag(flag: string): boolean {
    this.initFlags();
    return this.flags[flag] ?? false;
  }

  public static async setFlag(flag: string, value: boolean): Promise<void> {
    if (!this.KNOWN_FLAGS.has(flag)) {
      return;
    }
    await this.initFlagsAsync();
    this.flags[flag] = value;
    await this.saveFlagsAsync();
  }

  public static async getAllFlags(): Promise<Record<string, boolean>> {
    await this.initFlagsAsync();
    return { ...this.flags };
  }
}

// 2. TOTP 2FA Utility (HMAC-SHA1 RFC 6238 implementation)
export class TotpService {
  /**
   * Generates a stable random base32 key for TOTP secrets
   */
  public static generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(16);
    for (let i = 0; i < bytes.length; i++) {
      secret += chars[bytes[i] % 32];
    }
    return secret;
  }

  /**
   * Validates a 6-digit TOTP token against the base32 secret
   */
  public static verifyToken(secret: string, token: string): boolean {
    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      return false;
    }
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30);
    
    // Check current interval, previous interval, and next interval for clock drift tolerance
    for (let i = -1; i <= 1; i++) {
      if (this.generateToken(secret, counter + i) === token) {
        return true;
      }
    }
    return false;
  }

  private static generateToken(secret: string, counter: number): string {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = tmp & 0xff;
      tmp >>= 8;
    }

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(buffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const code =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = code % 1000000;
    return otp.toString().padStart(6, '0');
  }

  private static base32Decode(base32: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.toUpperCase().replace(/=+$/, '');
    const length = cleaned.length;
    const buffer = Buffer.alloc(Math.floor((length * 5) / 8));
    
    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < length; i++) {
      const idx = alphabet.indexOf(cleaned[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        buffer[index++] = (value >> (bits - 8)) & 0xff;
        bits -= 8;
      }
    }
    return buffer;
  }
}

// 3. System Metrics & Health Store
export class MetricsService {
  private static totalRequests = 0;
  private static apiResponseTimes: number[] = [];
  private static apiResponseTimesSum = 0;
  private static dbQueries = 0;
  private static activeSockets = 0;
  private static dbLatencies: number[] = [];
  private static dbLatencySum = 0;
  private static liveLogs: any[] = [];
  private static lastEventLoopLagMs = 0;

  public static measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Math.max(0, Date.now() - start);
        MetricsService.lastEventLoopLagMs = lag;
        resolve(lag);
      });
    });
  }

  public static incrementRequests(): void {
    this.totalRequests++;
  }

  public static recordResponseTime(ms: number): void {
    this.apiResponseTimes.push(ms);
    this.apiResponseTimesSum += ms;
    if (this.apiResponseTimes.length > 500) {
      const removed = this.apiResponseTimes.shift();
      if (removed !== undefined) {
        this.apiResponseTimesSum -= removed;
      }
    }
  }

  public static recordDbQuery(): void {
    this.dbQueries++;
  }

  public static recordDbLatency(ms: number): void {
    this.dbLatencies.push(ms);
    this.dbLatencySum += ms;
    if (this.dbLatencies.length > 500) {
      const removed = this.dbLatencies.shift();
      if (removed !== undefined) {
        this.dbLatencySum -= removed;
      }
    }
  }

  public static addLiveLog(log: any): void {
    this.liveLogs.unshift(log);
    if (this.liveLogs.length > 50) {
      this.liveLogs.pop();
    }
  }

  public static getLiveLogs(): any[] {
    return this.liveLogs;
  }

  public static getMetrics() {
    this.measureEventLoopLag();

    const avgResponseTime = this.apiResponseTimes.length > 0
      ? Math.round(this.apiResponseTimesSum / this.apiResponseTimes.length)
      : 0;

    const avgDbLatency = this.dbLatencies.length > 0
      ? Number((this.dbLatencySum / this.dbLatencies.length).toFixed(2))
      : 0;

    return {
      uptime: process.uptime(),
      totalRequests: this.totalRequests,
      averageResponseTimeMs: avgResponseTime,
      dbQueriesExecuted: this.dbQueries,
      dbLatencyAvgMs: avgDbLatency,
      eventLoopLagMs: this.lastEventLoopLagMs,
      activeConnectionSockets: this.activeSockets,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }
}

// Register global Mongoose plugin to accurately capture queries and operational latency
const methodsToHook = [
  'find', 'findOne', 'countDocuments', 'estimatedDocumentCount', 'aggregate', 'save', 'updateOne', 'deleteOne'
];

mongoose.plugin((schema) => {
  methodsToHook.forEach((methodName: any) => {
    schema.pre(methodName, function(this: any, next: any) {
      try {
        this._queryStartTime = process.hrtime();
      } catch (e) {}
      if (typeof next === 'function') next();
    });

    schema.post(methodName, function(this: any, res: any, next: any) {
      MetricsService.recordDbQuery();
      try {
        if (this && this._queryStartTime) {
          const diff = process.hrtime(this._queryStartTime);
          const durationMs = (diff[0] * 1e9 + diff[1]) / 1e6;
          MetricsService.recordDbLatency(durationMs);
        }
      } catch (e) {}
      
      if (typeof next === 'function') {
        next();
      } else if (typeof res === 'function') {
        res();
      }
    });
  });
});


// ========== PHASE II: HA, SCALING & DATA LIFECYCLE ==========

// 1. Database-Driven Job Queue Schema
const jobQueueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  payload: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {},
    validate: {
      validator: function(v: any) {
        return v !== null && typeof v === 'object' && !Array.isArray(v);
      },
      message: 'Payload must be a valid non-null object'
    }
  },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastError: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for status, createdAt, attempts to optimize queue scans
jobQueueSchema.index({ status: 1, createdAt: 1, attempts: 1 });

export const JobQueue = mongoose.models.JobQueue || mongoose.model('JobQueue', jobQueueSchema);

// 2. High-Performance Worker State Machine
export class WorkerService {
  private static handlers: Record<string, (payload: any) => Promise<void>> = {};
  private static isRunning = false;
  private static emitter = new EventEmitter();
  private static lastRecoveryTime = 0;

  public static registerHandler(name: string, handler: (payload: any) => Promise<void>): void {
    this.handlers[name] = handler;
  }

  public static async enqueue(name: string, payload: any = {}, maxAttempts = 3): Promise<any> {
    const job = await JobQueue.create({
      name,
      payload,
      maxAttempts
    });
    // Trigger the event-driven queue listener immediately
    this.emitter.emit('new-job');
    return job;
  }

  public static start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.runLoop().catch(e => {
      Logger.error('Fatal crash in worker queue runLoop', e, 'WorkerService');
    });
  }

  private static async runLoop(): Promise<void> {
    Logger.info('WorkerService daemon successfully initialized.', null, 'WorkerService');

    while (this.isRunning) {
      let processedJob = false;
      try {
        if (mongoose.connection.readyState !== 1) {
          // Gracefully pause and wait for DB connection
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Periodic recovery check for crashed or hung workers (lease timeout recovery)
        const now = Date.now();
        if (now - this.lastRecoveryTime > 60000) {
          this.lastRecoveryTime = now;
          await this.recoverStuckJobs();
        }

        // Atomically fetch and acquire lease on the next pending job
        const job = await JobQueue.findOneAndUpdate(
          { 
            status: { $in: ['pending', 'failed'] }, 
            $expr: { $lt: ["$attempts", "$maxAttempts"] }
          },
          { status: 'processing', $inc: { attempts: 1 }, updatedAt: new Date() },
          { new: true, sort: { createdAt: 1 } }
        );

        if (job) {
          processedJob = true;
          const handler = this.handlers[job.name];
          if (handler) {
            try {
              await handler(job.payload);
              job.status = 'completed';
              job.lastError = null;
            } catch (err: any) {
              job.status = job.attempts >= job.maxAttempts ? 'failed' : 'pending';
              job.lastError = err.message || 'Unknown processing error';
              Logger.error(`Job ${job._id} handling exception`, err, 'WorkerService');
            }
          } else {
            job.status = 'failed';
            job.lastError = `No handler registered for job type: ${job.name}`;
            Logger.error(`No handler registered for job type: ${job.name}`, null, 'WorkerService');
          }
          job.updatedAt = new Date();
          await job.save();
        }
      } catch (e) {
        Logger.error('Worker service queue execution exception', e, 'WorkerService');
      }

      if (processedJob) {
        // Dynamic wait: if a job was found, process the next backlog instantly
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        // Event-driven reactive block: wait for a new job signal, or 15 seconds heartbeat
        await new Promise<void>(resolve => {
          let resolved = false;
          const onNewJob = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutId);
              this.emitter.off('new-job', onNewJob);
              resolve();
            }
          };
          const timeoutId = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              this.emitter.off('new-job', onNewJob);
              resolve();
            }
          }, 15000);
          this.emitter.once('new-job', onNewJob);
        });
      }
    }
  }

  /**
   * Lease/timeout recovery: Identifies jobs stuck in 'processing' status 
   * (e.g. from a server/worker crash) and recovers them back to pending or failed.
   */
  private static async recoverStuckJobs(): Promise<void> {
    try {
      const leaseThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const stuckJobs = await JobQueue.find({
        status: 'processing',
        updatedAt: { $lt: leaseThreshold }
      });

      for (const job of stuckJobs) {
        Logger.error(`Recovering stuck job ${job._id} (type: ${job.name}). Stuck in processing since ${job.updatedAt}`, null, 'WorkerService');
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          job.lastError = 'Job lease timed out in processing state (Worker likely crashed or hung).';
        } else {
          job.status = 'pending';
          job.lastError = 'Job lease expired, reset to pending.';
        }
        job.updatedAt = new Date();
        await job.save();
      }
    } catch (err) {
      Logger.error('Failed to recover stuck jobs', err, 'WorkerService');
    }
  }

  public static stop(): void {
    this.isRunning = false;
  }
}

// 3. TTL Cache Invalidation Service with L1/L2 High Availability design
export class CacheService {
  private static localCache: Map<string, { value: any; expiresAt: number }> = new Map();

  /**
   * Sets cache key across both L1 local memory and distributed L2 database
   */
  public static async set(key: string, value: any, ttlMs: number = 60000): Promise<void> {
    const expiresAt = Date.now() + ttlMs;
    // Set L1 Local Cache
    this.localCache.set(key, { value, expiresAt });

    // Set L2 Distributed Cache if Mongo is connected
    if (mongoose.connection.readyState === 1) {
      try {
        await CacheEntry.findOneAndUpdate(
          { key },
          { value, expiresAt: new Date(expiresAt) },
          { upsert: true, new: true }
        );
      } catch (err) {
        Logger.error('CacheService.set distributed write failed', err, 'CacheService');
      }
    }
  }

  /**
   * Fetches cache key, falls back from L1 local memory to distributed L2 database gracefully
   */
  public static async get<T>(key: string): Promise<T | null> {
    // Check local L1 cache
    const localEntry = this.localCache.get(key);
    if (localEntry && Date.now() <= localEntry.expiresAt) {
      return localEntry.value as T;
    }

    if (localEntry && Date.now() > localEntry.expiresAt) {
      this.localCache.delete(key);
    }

    // Check distributed L2 cache
    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await CacheEntry.findOne({ key });
        if (doc) {
          if (doc.expiresAt.getTime() > Date.now()) {
            // Populate L1 cache for subsequent fast reads
            this.localCache.set(key, { value: doc.value, expiresAt: doc.expiresAt.getTime() });
            return doc.value as T;
          } else {
            await CacheEntry.deleteOne({ key });
          }
        }
      } catch (err) {
        Logger.error('CacheService.get distributed read failed', err, 'CacheService');
      }
    }

    return null;
  }

  /**
   * Invalidates cache key across L1 local memory and distributed L2 database
   */
  public static async invalidate(keyPattern: string): Promise<void> {
    // Invalidate local L1
    for (const key of this.localCache.keys()) {
      if (key.includes(keyPattern)) {
        this.localCache.delete(key);
      }
    }

    // Invalidate distributed L2
    if (mongoose.connection.readyState === 1) {
      try {
        const escapedPattern = keyPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await CacheEntry.deleteMany({ key: { $regex: escapedPattern, $options: 'i' } });
      } catch (err) {
        Logger.error('CacheService.invalidate distributed delete failed', err, 'CacheService');
      }
    }
  }

  /**
   * Clears all cache entries across local memory and distributed DB
   */
  public static async clear(): Promise<void> {
    this.localCache.clear();
    if (mongoose.connection.readyState === 1) {
      try {
        await CacheEntry.deleteMany({});
      } catch (err) {
        Logger.error('CacheService.clear distributed clear failed', err, 'CacheService');
      }
    }
  }
}

// 4. Logs Archiving & Data Retention Engine
export class ArchiveService {
  /**
   * Safe data retention engine targeting log/history pruning
   */
  public static async runArchiving(retentionDays = 90): Promise<{ archivedCount: number }> {
    if (mongoose.connection.readyState !== 1) {
      return { archivedCount: 0 };
    }
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    // In our system we can archive old UserSession or temporary records
    try {
      const result = await UserSession.deleteMany({
        $or: [
          { revoked: true, createdAt: { $lt: cutoffDate } },
          { expiresAt: { $lt: new Date() } }
        ]
      });
      return { archivedCount: result.deletedCount || 0 };
    } catch (e) {
      Logger.error('Archive engine execution failure', e, 'ArchiveService');
      return { archivedCount: 0 };
    }
  }
}
