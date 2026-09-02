import fs from 'fs';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import { seedOrders, seedCategories, seedProducts, seedBlogs, seedUsers, seedMessages, LocalUserType } from '../../seeddata';
import { hashHelper } from './utils';
import {
  Product,
  Category,
  Blog,
  SecurityLog,
  ImportHistory,
  SiteSettingsModel,
  BlacklistedToken
} from './models';
import { captureError } from '../utils/errorTracker';

// ========== ATOMIC FILE WRITE UTILITY ==========
const writeQueues: Record<string, { pendingData: string | Buffer | null, isWriting: boolean }> = {};

export const atomicWriteFileAsync = async (filePath: string, data: string | Buffer, encoding: BufferEncoding = 'utf8') => {
  if (!writeQueues[filePath]) {
    writeQueues[filePath] = { pendingData: null, isWriting: false };
  }
  
  const queue = writeQueues[filePath];
  queue.pendingData = data;
  
  if (queue.isWriting) return;
  queue.isWriting = true;
  
  while (queue.pendingData !== null) {
    const currentData = queue.pendingData;
    queue.pendingData = null;
    
    const tempPath = `${filePath}.${Date.now()}.${Math.floor(Math.random() * 100000)}.tmp`;
    try {
      if (Buffer.isBuffer(currentData)) {
        await fs.promises.writeFile(tempPath, currentData);
      } else {
        await fs.promises.writeFile(tempPath, currentData, encoding);
      }
      await fs.promises.rename(tempPath, filePath);
    } catch (err: any) {
      const errorLog = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        module: 'Persistence',
        file: filePath,
        error: err.message,
        stack: err.stack
      };
      console.error(`[FATAL Persistence Error] Atomic write failed for ${filePath}:`, JSON.stringify(errorLog));
      try {
        await fs.promises.unlink(tempPath).catch(() => {});
      } catch (e) {}
    }
  }
  
  queue.isWriting = false;
};

// Database Connection Flag
let isMongoConnected = false;
export const getIsMongoConnected = (): boolean => isMongoConnected;
export const setIsMongoConnected = (val: boolean): void => {
  isMongoConnected = val;
};

// Persistent File Paths for Offline Fallback System
export const LOCAL_USERS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_users.json');
export const LOCAL_PRODUCTS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_products.json');
export const LOCAL_ORDERS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_orders.json');
export const LOCAL_SUNDAY_LOGS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_sunday_logs.json');
export const LOCAL_SUBSCRIBERS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_subscribers.json');
export const LOCAL_PICK_LEFT_INTERESTS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_pick_left_interests.json');
export const LOCAL_SECURITY_LOGS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_security_logs.json');
export const LOCAL_IMPORT_HISTORY_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_import_history.json');
export const LOCAL_BULK_JOBS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_bulk_jobs.json');
export const LOCAL_ALERT_RULES_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_alert_rules.json');
export const LOCAL_AUTOMATION_RULES_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_automation_rules.json');
export const LOCAL_PRODUCT_HEALTH_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_product_health.json');
export const LOCAL_PRICE_HISTORY_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_price_history.json');
export const LOCAL_PRODUCT_CHANGES_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_product_changes.json');
export const LOCAL_SITE_SETTINGS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'local_site_settings.json');
export const SOCIAL_CLICKS_FILE = path.join(process.env.DATA_DIR || process.cwd(), 'social_clicks.json');

// Memory Datasets & Loaders
export let localCategories: any[] = structuredClone(seedCategories);

export let localProducts: any[] = structuredClone(seedProducts);
if (fs.existsSync(LOCAL_PRODUCTS_FILE)) {
  try {
    localProducts = JSON.parse(fs.readFileSync(LOCAL_PRODUCTS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_products.json fallback:", err.message);
  }
}

export let localBlogs: any[] = structuredClone(seedBlogs);

export let localUsers: LocalUserType[] = structuredClone(seedUsers);
if (fs.existsSync(LOCAL_USERS_FILE)) {
  try {
    localUsers = JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_users.json fallback:", err.message);
  }
}

// Secure fallback users dynamically by hashing plaintext passwords on startup
Promise.all(localUsers.map(async (u) => {
  if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
    u.password = await hashHelper(u.password);
  }
})).then(() => {
  try {
    atomicWriteFileAsync(LOCAL_USERS_FILE, JSON.stringify(localUsers, null, 2), 'utf8');
  } catch (err: any) {}
}).catch(err => console.warn("Error hashing initial users in-memory:", err));

export let localOrders: any[] = structuredClone(seedOrders);
if (fs.existsSync(LOCAL_ORDERS_FILE)) {
  try {
    localOrders = JSON.parse(fs.readFileSync(LOCAL_ORDERS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_orders.json fallback:", err.message);
  }
}

export let localMessages: any[] = JSON.parse(JSON.stringify(seedMessages));

export let localVisitors: string[] = [];
export let localFilterLogs: any[] = [];

export let localSubscribers: any[] = [];
if (fs.existsSync(LOCAL_SUBSCRIBERS_FILE)) {
  try {
    localSubscribers = JSON.parse(fs.readFileSync(LOCAL_SUBSCRIBERS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_subscribers.json fallback:", err.message);
  }
}

export let localPickLeftInterests: any[] = [];
if (fs.existsSync(LOCAL_PICK_LEFT_INTERESTS_FILE)) {
  try {
    localPickLeftInterests = JSON.parse(fs.readFileSync(LOCAL_PICK_LEFT_INTERESTS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_pick_left_interests.json fallback:", err.message);
  }
}

export let localSundayAutomationLogs: any[] = [];
if (fs.existsSync(LOCAL_SUNDAY_LOGS_FILE)) {
  try {
    localSundayAutomationLogs = JSON.parse(fs.readFileSync(LOCAL_SUNDAY_LOGS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_sunday_logs.json fallback:", err.message);
  }
}

export let localSecurityLogs: any[] = [];
if (fs.existsSync(LOCAL_SECURITY_LOGS_FILE)) {
  try {
    localSecurityLogs = JSON.parse(fs.readFileSync(LOCAL_SECURITY_LOGS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_security_logs.json fallback:", err.message);
  }
}

export let localImportHistory: any[] = [];
if (fs.existsSync(LOCAL_IMPORT_HISTORY_FILE)) {
  try {
    localImportHistory = JSON.parse(fs.readFileSync(LOCAL_IMPORT_HISTORY_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_import_history.json fallback:", err.message);
  }
}

export let localBulkImportJobs: any[] = [];
if (fs.existsSync(LOCAL_BULK_JOBS_FILE)) {
  try {
    localBulkImportJobs = JSON.parse(fs.readFileSync(LOCAL_BULK_JOBS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_bulk_jobs.json fallback:", err.message);
  }
}

export let localAlertRules: any[] = [];
if (fs.existsSync(LOCAL_ALERT_RULES_FILE)) {
  try {
    localAlertRules = JSON.parse(fs.readFileSync(LOCAL_ALERT_RULES_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_alert_rules.json fallback:", err.message);
  }
}

export let localAutomationRules: any[] = [];
if (fs.existsSync(LOCAL_AUTOMATION_RULES_FILE)) {
  try {
    localAutomationRules = JSON.parse(fs.readFileSync(LOCAL_AUTOMATION_RULES_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_automation_rules.json fallback:", err.message);
  }
}

export let localProductHealth: any[] = [];
if (fs.existsSync(LOCAL_PRODUCT_HEALTH_FILE)) {
  try {
    localProductHealth = JSON.parse(fs.readFileSync(LOCAL_PRODUCT_HEALTH_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_product_health.json fallback:", err.message);
  }
}

export let localPriceHistory: any[] = [];
if (fs.existsSync(LOCAL_PRICE_HISTORY_FILE)) {
  try {
    localPriceHistory = JSON.parse(fs.readFileSync(LOCAL_PRICE_HISTORY_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_price_history.json fallback:", err.message);
  }
}

export let localProductChanges: any[] = [];
if (fs.existsSync(LOCAL_PRODUCT_CHANGES_FILE)) {
  try {
    localProductChanges = JSON.parse(fs.readFileSync(LOCAL_PRODUCT_CHANGES_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read local_product_changes.json fallback:", err.message);
  }
}

export let socialClicks = { instagram: 0, linkedin: 0 };
if (fs.existsSync(SOCIAL_CLICKS_FILE)) {
  try {
    socialClicks = JSON.parse(fs.readFileSync(SOCIAL_CLICKS_FILE, 'utf8'));
  } catch (err: any) {
    console.warn("Could not read social_clicks.json:", err.message);
  }
}

export let localSiteSettings = {
  adsenseClientId: process.env.VITE_ADSENSE_CLIENT_ID || process.env.ADSENSE_CLIENT_ID || 'ca-pub-1234567890123456',
  adsenseEnabled: true,
  adsenseSlots: {
    headerBannerSlot: '6223881151',
    productDetailSlot: '7898031267',
    blogSlot: '1223904982',
    sidebarSlot: '9876543210',
    homeSlot: '6223881151'
  },
  siteName: 'gadgetsprohub',
  supportEmail: 'support@gadgetsprohub.com',
  updatedAt: new Date().toISOString()
};

if (fs.existsSync(LOCAL_SITE_SETTINGS_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(LOCAL_SITE_SETTINGS_FILE, 'utf8'));
    localSiteSettings = { ...localSiteSettings, ...loaded };
  } catch (e: any) {
    console.warn("Failed reading local site settings:", e.message);
  }
}

export let localAnalytics: any[] = [
  { productId: "665a0002bc93ef2d8c000010", affiliateCode: "AUDIO001", eventType: "click", district: "Chennai", timestamp: new Date() },
  { productId: "665a0002bc93ef2d8c000010", affiliateCode: "AUDIO001", eventType: "view", district: "Madurai", timestamp: new Date() },
  { productId: "665a0002bc93ef2d8c000011", affiliateCode: "WATCH001", eventType: "click", district: "Tirunelveli", timestamp: new Date() },
  { productId: "665a0002bc93ef2d8c000011", affiliateCode: "WATCH001", eventType: "conversion", district: "Virudhunagar", timestamp: new Date() }
];

// Savers
export const saveLocalUsers = () => {
  try { atomicWriteFileAsync(LOCAL_USERS_FILE, JSON.stringify(localUsers, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local users:", e.message, e.stack); }
};
export const saveLocalProducts = () => {
  try { atomicWriteFileAsync(LOCAL_PRODUCTS_FILE, JSON.stringify(localProducts, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local products:", e.message, e.stack); }
};
export const saveLocalOrders = () => {
  try { atomicWriteFileAsync(LOCAL_ORDERS_FILE, JSON.stringify(localOrders, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local orders:", e.message, e.stack); }
};
export const saveLocalSundayLogs = () => {
  try { atomicWriteFileAsync(LOCAL_SUNDAY_LOGS_FILE, JSON.stringify(localSundayAutomationLogs, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local logs:", e.message, e.stack); }
};
export const saveLocalSubscribers = () => {
  try { atomicWriteFileAsync(LOCAL_SUBSCRIBERS_FILE, JSON.stringify(localSubscribers, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local subscribers:", e.message, e.stack); }
};
export const syncPickLeftInterestsToLocalFile = async () => {
  try { atomicWriteFileAsync(LOCAL_PICK_LEFT_INTERESTS_FILE, JSON.stringify(localPickLeftInterests, null, 2)); } catch (err: any) { console.warn("Could not write to local_pick_left_interests.json:", err.message); }
};
export const saveLocalSecurityLogs = () => {
  try { atomicWriteFileAsync(LOCAL_SECURITY_LOGS_FILE, JSON.stringify(localSecurityLogs, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local security logs:", e.message, e.stack); }
};
export const saveLocalImportHistory = () => {
  try { atomicWriteFileAsync(LOCAL_IMPORT_HISTORY_FILE, JSON.stringify(localImportHistory, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local import history:", e.message, e.stack); }
};
export const saveSocialClicks = () => {
  try { atomicWriteFileAsync(SOCIAL_CLICKS_FILE, JSON.stringify(socialClicks, null, 2), 'utf8'); } catch (err: any) { console.warn("Could not save social_clicks.json:", err.message); }
};
export const saveLocalBulkImportJobs = () => {
  try { atomicWriteFileAsync(LOCAL_BULK_JOBS_FILE, JSON.stringify(localBulkImportJobs, null, 2), 'utf8'); } catch (err: any) { console.error("[Persistence Error] Could not save local_bulk_jobs.json:", err.message, err.stack); }
};
export const saveLocalAlertRules = () => {
  try { atomicWriteFileAsync(LOCAL_ALERT_RULES_FILE, JSON.stringify(localAlertRules, null, 2), 'utf8'); } catch (err: any) { console.error('[Persistence Error] Failed to save local_alert_rules.json:', err.message); }
};
export const saveLocalAutomationRules = () => {
  try { atomicWriteFileAsync(LOCAL_AUTOMATION_RULES_FILE, JSON.stringify(localAutomationRules, null, 2), 'utf8'); } catch (err: any) { console.error('[Persistence Error] Failed to save local_automation_rules.json:', err.message); }
};
export const saveLocalProductHealth = () => {
  try { atomicWriteFileAsync(LOCAL_PRODUCT_HEALTH_FILE, JSON.stringify(localProductHealth, null, 2), 'utf8'); } catch (err: any) { console.error('[Persistence Error] Failed to save local_product_health.json:', err.message); }
};
export const saveLocalPriceHistory = () => {
  try { atomicWriteFileAsync(LOCAL_PRICE_HISTORY_FILE, JSON.stringify(localPriceHistory, null, 2), 'utf8'); } catch (err: any) { console.error('[Persistence Error] Failed to save local_price_history.json:', err.message); }
};
export const saveLocalProductChanges = () => {
  try { atomicWriteFileAsync(LOCAL_PRODUCT_CHANGES_FILE, JSON.stringify(localProductChanges, null, 2), 'utf8'); } catch (err: any) { console.error('[Persistence Error] Failed to save local_product_changes.json:', err.message); }
};
export const saveLocalSiteSettings = () => {
  try { atomicWriteFileAsync(LOCAL_SITE_SETTINGS_FILE, JSON.stringify(localSiteSettings, null, 2), 'utf8'); } catch (e: any) { console.error("[Persistence Error] Failed saving local site settings:", e.message, e.stack); }
};

export async function getSiteSettingsData() {
  if (isMongoConnected) {
    try {
      let dbSettings = await SiteSettingsModel.findOne({});
      if (!dbSettings) {
        dbSettings = await SiteSettingsModel.create(localSiteSettings);
      }
      return dbSettings.toObject ? dbSettings.toObject() : dbSettings;
    } catch (e) {
      return localSiteSettings;
    }
  }
  return localSiteSettings;
}

export const logSecurityAction = async (
  req: express.Request,
  action: string,
  targetId: string | undefined,
  details: any
) => {
  const adminId = (req as any).userId || 'system';
  const adminEmail = (req as any).userEmail || 'unknown';
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const logEntry = {
    action,
    adminId: adminId.toString(),
    adminEmail,
    targetId,
    details,
    ipAddress: Array.isArray(ipAddress) ? ipAddress.join(', ') : String(ipAddress),
    userAgent,
    timestamp: new Date()
  };

  localSecurityLogs.unshift(logEntry);
  if (localSecurityLogs.length > 2000) {
    localSecurityLogs = localSecurityLogs.slice(0, 2000);
  }
  saveLocalSecurityLogs();

  if (isMongoConnected) {
    try {
      const log = new SecurityLog(logEntry);
      await log.save();
    } catch (err: any) {
      console.warn("Failed saving security log to MongoDB:", err.message);
    }
  }
};

export const logImportHistory = async (entry: {
  productName: string;
  asin: string;
  productId?: string;
  adminEmail: string;
  adminId: string;
  result: 'success' | 'failed' | 'skipped';
  correlationId: string;
  processingTimeMs: number;
  duplicateStatus: 'new' | 'skip' | 'update' | 'merge' | 'replace' | 'duplicate_blocked';
  errorMessage?: string;
  details?: any;
}) => {
  const finalEntry = {
    ...entry,
    importTime: new Date()
  };

  localImportHistory.unshift(finalEntry);
  if (localImportHistory.length > 5000) {
    localImportHistory = localImportHistory.slice(0, 5000);
  }
  saveLocalImportHistory();

  if (isMongoConnected) {
    try {
      const log = new ImportHistory(finalEntry);
      await log.save();
    } catch (err: any) {
      console.warn("Failed saving import history to MongoDB:", err.message);
    }
  }
};

// Token Blacklist
export const localBlacklistedTokens = new Map<string, number>();
export const blacklistTokenLocal = (token: string) => {
  localBlacklistedTokens.set(token, Date.now() + 30 * 24 * 60 * 60 * 1000);
};

export const isTokenLocalBlacklisted = (token: string): boolean => {
  const expiresAt = localBlacklistedTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    localBlacklistedTokens.delete(token);
    return false;
  }
  return true;
};

// Importer observability
export const importerMetrics = {
  totalImports: 0,
  successfulImports: 0,
  failedImports: 0,
  duplicateRejections: 0,
  totalProcessingTimeMs: 0
};

export const processedImportsCache = new Map<string, any>();

export function cacheProcessedImport(requestId: string, payload: any) {
  if (processedImportsCache.size >= 1000) {
    const oldestKey = processedImportsCache.keys().next().value;
    if (oldestKey) {
      processedImportsCache.delete(oldestKey);
    }
  }
  processedImportsCache.set(requestId, payload);
}

export function logStructured(level: 'INFO' | 'WARN' | 'ERROR', event: string, metadata: Record<string, any>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata
  }));
}

export function sanitizeInput(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .trim();
}

export async function syncProductsToSeedFile(): Promise<void> {
  try {
    saveLocalProducts();
  } catch (e: any) {
    console.warn("Failed syncing products to local store:", e.message);
  }
  return Promise.resolve();
}

export async function syncCategoriesToSeedFile(): Promise<void> {
  return Promise.resolve();
}

export async function syncBlogsToSeedFile(): Promise<void> {
  return Promise.resolve();
}

export async function syncMessagesToSeedFile(): Promise<void> {
  return Promise.resolve();
}

export async function resolveUniqueSlug(
  baseSlug: string,
  type: 'product' | 'blog',
  excludeId?: string
): Promise<{ exists: boolean; finalSlug: string }> {
  const safeBaseSlug = String(baseSlug || '').toLowerCase();
  let slug = safeBaseSlug.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  if (slug.length > 100) {
    slug = slug.substring(0, 100);
  }
  if (!slug) {
    slug = 'item-' + Math.random().toString(36).substring(2, 6);
  }

  let exists = false;
  let finalSlug = slug;

  const checkIfExist = async (testSlug: string): Promise<boolean> => {
    if (isMongoConnected) {
      if (type === 'product') {
        const query: any = { slug: testSlug };
        if (excludeId) {
          const idsToExclude: any[] = [excludeId];
          if (mongoose.Types.ObjectId.isValid(excludeId)) {
            idsToExclude.push(new mongoose.Types.ObjectId(excludeId));
          }
          query._id = { $nin: idsToExclude };
        }
        const item = await Product.findOne(query);
        return !!item;
      } else {
        const query: any = { slug: testSlug };
        if (excludeId) {
          const idsToExclude: any[] = [excludeId];
          if (mongoose.Types.ObjectId.isValid(excludeId)) {
            idsToExclude.push(new mongoose.Types.ObjectId(excludeId));
          }
          query._id = { $nin: idsToExclude };
        }
        const item = await Blog.findOne(query);
        return !!item;
      }
    } else {
      if (type === 'product') {
        return localProducts.some((p: any) => p.slug === testSlug && p._id !== excludeId);
      } else {
        return localBlogs.some((b: any) => b.slug === testSlug && b._id !== excludeId);
      }
    }
  };

  exists = await checkIfExist(slug);

  if (exists) {
    let i = 1;
    while (true) {
      finalSlug = `${slug}-${i}`;
      const stillExists = await checkIfExist(finalSlug);
      if (!stillExists) {
        break;
      }
      i++;
    }
  }

  return { exists, finalSlug };
}

export async function cleanExpiredTrendingProducts() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (isMongoConnected) {
    try {
      const result = await Product.updateMany(
        { trending: true, trendingStartedAt: { $lt: oneWeekAgo } },
        { $set: { trending: false } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Auto-reverted ${result.modifiedCount} products from trending to normal.`);
      }

      await Product.updateMany(
        { trending: true, trendingStartedAt: { $exists: false } },
        { $set: { trendingStartedAt: new Date() } }
      );
    } catch (err: any) {
      captureError(err, { context: 'cleanExpiredTrendingProducts' });
    }
  } else {
    let modified = false;
    localProducts.forEach((p: any) => {
      if (p.trending) {
        if (!p.trendingStartedAt) {
          p.trendingStartedAt = p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString();
          modified = true;
        } else {
          const startedAt = new Date(p.trendingStartedAt);
          if (startedAt < oneWeekAgo) {
            p.trending = false;
            modified = true;
            console.log(`Local product ${p.name} auto-reverted from trending to normal.`);
          }
        }
      }
    });
    if (modified) {
      syncProductsToSeedFile().catch(e => console.warn(e));
    }
  }
}

export async function cleanExpiredBlacklistedTokens() {
  if (isMongoConnected) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await BlacklistedToken.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
      if (result.deletedCount > 0) {
        console.log(`[Maintenance] Purged ${result.deletedCount} expired blacklisted tokens from database.`);
      }
    } catch (err: any) {
      console.error('[Maintenance Error] Failed to purge blacklisted tokens:', err.message);
    }
  }
}
