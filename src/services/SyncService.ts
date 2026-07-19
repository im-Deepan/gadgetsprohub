import mongoose from 'mongoose';

// ==========================================
// SCHEMAS & MODELS FOR PRICE MONITORING
// ==========================================

const priceHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  discount: { type: Number },
  seller: { type: String, default: 'Amazon.com' },
  buyBoxOwner: { type: String, default: 'Amazon' },
  inStock: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const productChangesSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  changedFields: { type: Map, of: mongoose.Schema.Types.Mixed }, // FieldName -> { oldValue, newValue }
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const syncJobsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'running', 'completed', 'failed', 'retrying', 'cancelled'], default: 'waiting', index: true },
  priority: { type: Number, default: 1 },
  progress: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  processedItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },
  results: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    status: { type: String, enum: ['success', 'failed'] },
    error: { type: String }
  }],
  workerId: { type: String },
  error: { type: String }
}, { timestamps: true });

const schedulerTasksSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  interval: { type: String, required: true }, // e.g. '5m', '15m', '30m', 'hourly', 'daily', 'weekly', or cron
  cron: { type: String },
  targetType: { type: String, enum: ['all', 'category', 'product'], default: 'all' },
  targetId: { type: String }, // category slug/ID or product ID
  active: { type: Boolean, default: true },
  lastRun: { type: Date },
  nextRun: { type: Date },
  successCount: { type: Number, default: 0 },
  failCount: { type: Number, default: 0 },
  averageDurationMs: { type: Number, default: 0 }
}, { timestamps: true });

const alertRulesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true }, // optional, otherwise global
  triggerType: { 
    type: String, 
    enum: ['price_drop_pct', 'price_drop_abs', 'price_increase', 'target_price', 'out_of_stock', 'back_in_stock', 'coupon_available', 'large_discount'],
    required: true 
  },
  threshold: { type: Number, default: 0 },
  channels: [{ type: String }], // 'browser', 'email', 'telegram', 'discord', 'slack', 'webhook'
  active: { type: Boolean, default: true }
}, { timestamps: true });

const productHealthSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
  healthScore: { type: Number, default: 100, min: 0, max: 100 },
  lastSyncStatus: { type: String, default: 'success' },
  issues: [{ type: String }],
  updateFrequencyDays: { type: Number, default: 1 },
  lastCalculated: { type: Date, default: Date.now }
}, { timestamps: true });

const automationRulesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  triggerType: { type: String, required: true }, // e.g., 'price_drop_pct', 'out_of_stock', 'back_in_stock'
  triggerThreshold: { type: Number, default: 0 },
  actions: [{
    actionType: { type: String, required: true }, // 'update_website', 'send_telegram', 'send_discord', 'regenerate_ai', 'mark_best_deal'
    payload: { type: mongoose.Schema.Types.Mixed }
  }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

const notificationHistorySchema = new mongoose.Schema({
  recipient: { type: String },
  channel: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent', index: true },
  error: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Prevent duplicate models in Mongoose HMR
export const PriceHistory = mongoose.models.PriceHistory || mongoose.model('PriceHistory', priceHistorySchema);
export const ProductChange = mongoose.models.ProductChange || mongoose.model('ProductChange', productChangesSchema);
export const SyncJob = mongoose.models.SyncJob || mongoose.model('SyncJob', syncJobsSchema);
export const SchedulerTask = mongoose.models.SchedulerTask || mongoose.model('SchedulerTask', schedulerTasksSchema);
export const AlertRule = mongoose.models.AlertRule || mongoose.model('AlertRule', alertRulesSchema);
export const ProductHealth = mongoose.models.ProductHealth || mongoose.model('ProductHealth', productHealthSchema);
export const AutomationRule = mongoose.models.AutomationRule || mongoose.model('AutomationRule', automationRulesSchema);
export const NotificationHistory = mongoose.models.NotificationHistory || mongoose.model('NotificationHistory', notificationHistorySchema);

// ==========================================
// ENTERPRISE SYNC SERVICE IMPLEMENTATION
// ==========================================

export class SyncService {
  private static instance: SyncService;
  private isProcessingQueue = false;

  private constructor() {
    this.initDefaultSchedulerTasks();
    this.startBackgroundQueueWatcher();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Populates default scheduler intervals if table is empty.
   */
  private async initDefaultSchedulerTasks() {
    if (mongoose.connection.readyState !== 1) {
      return; // Skip when MongoDB is not connected
    }
    try {
      const count = await SchedulerTask.countDocuments();
      if (count === 0) {
        const defaults = [
          { name: 'Fast Alert Tracker (5m)', interval: '5m', targetType: 'all', active: true, nextRun: new Date() },
          { name: 'Critical Stock Checker (15m)', interval: '15m', targetType: 'all', active: true, nextRun: new Date() },
          { name: 'Standard Price Synchronizer (30m)', interval: '30m', targetType: 'all', active: true, nextRun: new Date() },
          { name: 'Hourly Comprehensive Sync', interval: 'hourly', targetType: 'all', active: true, nextRun: new Date() },
          { name: 'Daily SEO & Media Audit', interval: 'daily', targetType: 'all', active: true, nextRun: new Date() }
        ];
        await SchedulerTask.insertMany(defaults);
        console.log('✅ Initialized default automation scheduler tasks successfully.');
      }
    } catch (err) {
      console.error('Failed to pre-seed default scheduler tasks:', err);
    }
  }

  /**
   * Background queue process watcher that loops.
   */
  private startBackgroundQueueWatcher() {
    setInterval(async () => {
      if (mongoose.connection.readyState !== 1) return;
      if (this.isProcessingQueue) return;
      try {
        const nextJob = await SyncJob.findOne({ status: 'waiting' }).sort({ priority: -1, createdAt: 1 });
        if (nextJob) {
          this.isProcessingQueue = true;
          await this.processJob(nextJob._id.toString());
        }
      } catch (err) {
        console.error('Queue processing loop error:', err);
      } finally {
        this.isProcessingQueue = false;
      }
    }, 15000); // Check for jobs every 15 seconds
  }

  /**
   * Processes a queued bulk sync job
   */
  public async processJob(jobId: string): Promise<void> {
    const job = await SyncJob.findById(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.workerId = `Worker-${Math.floor(Math.random() * 1000)}`;
      await job.save();

      // Find products to synchronize
      const ProductModel = mongoose.model('Product');
      const products = await ProductModel.find({});
      job.totalItems = products.length;
      await job.save();

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < products.length; i++) {
        // Fetch current job status to support external cancellations or pauses
        const liveJob = await SyncJob.findById(jobId);
        if (!liveJob || liveJob.status === 'cancelled' || liveJob.status === 'paused') {
          console.log(`Job ${jobId} was paused or cancelled by administrator.`);
          return;
        }

        const product = products[i];
        try {
          // Trigger synchronization on this product (simulate update/scraping)
          await this.runLiveProductSync(product._id.toString());
          
          successCount++;
          liveJob.results.push({
            productId: product._id,
            productName: product.name,
            status: 'success'
          });
        } catch (err: any) {
          failCount++;
          liveJob.results.push({
            productId: product._id,
            productName: product.name,
            status: 'failed',
            error: err.message || 'Unknown synchronizer error'
          });
        }

        liveJob.processedItems = i + 1;
        liveJob.failedItems = failCount;
        liveJob.progress = Math.round(((i + 1) / products.length) * 100);
        await liveJob.save();
      }

      const finalJob = await SyncJob.findById(jobId);
      if (finalJob) {
        finalJob.status = 'completed';
        await finalJob.save();
      }
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'Fatal synchronization worker failure';
      await job.save();
    }
  }

  /**
   * Run synchronization on a single product with full automation triggers.
   */
  public async runLiveProductSync(productId: string, overrideFields?: any): Promise<any> {
    const ProductModel = mongoose.model('Product');
    const product = await ProductModel.findById(productId);
    if (!product) throw new Error('Product not found for synchronization');

    // 1. Gather original fields for Smart Change Detection
    const previousState = {
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      discount: product.discount || 0,
      inStock: product.inStock,
      rating: product.rating,
      totalReviews: product.totalReviews
    };

    // 2. Fetch new details (simulated dynamic update, but supports manual override inputs)
    // For realistic demo automation, if overrideFields are absent we walk the price down or up.
    let nextPrice = previousState.price;
    let nextInStock = previousState.inStock;
    let nextDiscount = previousState.discount;
    let nextOriginalPrice = previousState.originalPrice;
    let nextRating = previousState.rating;
    let nextTotalReviews = previousState.totalReviews;

    if (overrideFields) {
      if (overrideFields.price !== undefined) nextPrice = Number(overrideFields.price);
      if (overrideFields.inStock !== undefined) nextInStock = Boolean(overrideFields.inStock);
      if (overrideFields.originalPrice !== undefined) nextOriginalPrice = Number(overrideFields.originalPrice);
      if (overrideFields.discount !== undefined) nextDiscount = Number(overrideFields.discount);
      if (overrideFields.rating !== undefined) nextRating = Number(overrideFields.rating);
      if (overrideFields.totalReviews !== undefined) nextTotalReviews = Number(overrideFields.totalReviews);
    } else {
      // Automatic real-time live synchronization using the detected MarketplaceProvider
      try {
        const { MarketplaceService } = require('./MarketplaceService');
        const mService = MarketplaceService.getInstance();
        const provider = mService.detectMarketplace(product.affiliateLink || '');
        if (provider) {
          const pricing = await provider.extractPricing(product.affiliateLink || '');
          if (pricing && pricing.price) {
            nextPrice = pricing.price;
            if (pricing.originalPrice) nextOriginalPrice = pricing.originalPrice;
            if (pricing.discount !== undefined) nextDiscount = pricing.discount;
            if (pricing.inStock !== undefined) nextInStock = pricing.inStock;
          }
        }
      } catch (err) {
        console.warn('Live background synchronization fetch failed, preserving old values:', err);
      }
    }

    // 3. Smart Change Detection mapping
    const changedFields: Record<string, any> = {};
    if (nextPrice !== previousState.price) changedFields['price'] = { old: previousState.price, new: nextPrice };
    if (nextOriginalPrice !== previousState.originalPrice) changedFields['originalPrice'] = { old: previousState.originalPrice, new: nextOriginalPrice };
    if (nextDiscount !== previousState.discount) changedFields['discount'] = { old: previousState.discount, new: nextDiscount };
    if (nextInStock !== previousState.inStock) changedFields['inStock'] = { old: previousState.inStock, new: nextInStock };
    if (nextRating !== previousState.rating) changedFields['rating'] = { old: previousState.rating, new: nextRating };
    if (nextTotalReviews !== previousState.totalReviews) changedFields['totalReviews'] = { old: previousState.totalReviews, new: nextTotalReviews };

    const hasChanges = Object.keys(changedFields).length > 0;

    // 4. Update the actual Product document in the catalog
    product.price = nextPrice;
    product.originalPrice = nextOriginalPrice;
    product.discount = nextDiscount;
    product.inStock = nextInStock;
    product.rating = nextRating;
    product.totalReviews = nextTotalReviews;
    product.lastPriceCheck = new Date();
    await product.save();

    // 5. Store Historical Price record
    await new PriceHistory({
      productId: product._id,
      price: nextPrice,
      originalPrice: nextOriginalPrice,
      discount: nextDiscount,
      inStock: nextInStock,
      seller: overrideFields?.seller || 'Amazon.com',
      buyBoxOwner: overrideFields?.buyBoxOwner || 'Amazon'
    }).save();

    // 6. Save smart changes document
    if (hasChanges) {
      await new ProductChange({
        productId: product._id,
        changedFields
      }).save();

      // 7. Evaluate and trigger Alerts and Automation Rules
      await this.evaluateAlertsAndAutomation(product, changedFields);
    }

    // 8. Re-calculate Product Health Score
    await this.calculateAndSaveProductHealth(product._id.toString());

    return {
      productName: product.name,
      hasChanges,
      changedFields,
      currentPrice: nextPrice,
      inStock: nextInStock
    };
  }

  /**
   * Validates Amazon Affiliate link structure and tracking tag correctness.
   */
  public validateAffiliateLink(link: string, tag?: string): { valid: boolean; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!link) {
      return { valid: false, issues: ['Affiliate link is missing completely.'], suggestions: ['Add a valid Amazon link.'] };
    }

    // Check for Amazon standard domain
    if (!link.includes('amazon.') && !link.includes('amzn.to') && !link.includes('amzn.eu')) {
      issues.push('Link does not point to a recognized Amazon marketplace domain or amzn shortener.');
      suggestions.push('Verify the link is imported from an official Amazon marketplace (e.g. amazon.in, amazon.com).');
    }

    // Check for tracking code / tag
    if (tag) {
      const tagParam = `tag=${tag}`;
      if (!link.includes(tagParam)) {
        issues.push(`The required tracking code parameter "${tagParam}" was not found in the redirect parameters.`);
        suggestions.push(`Append "&tag=${tag}" or "?tag=${tag}" to ensure commission referral credits are tracked.`);
      }
    } else {
      if (!link.includes('tag=')) {
        issues.push('No tracking tag detected in link.');
        suggestions.push('Provide a standard Amazon Associate tracking tag like "yourtag-20".');
      }
    }

    // Check link length or possible broken params
    if (link.startsWith('http://')) {
      issues.push('Link uses insecure HTTP schema.');
      suggestions.push('Convert the link prefix to secure HTTPS.');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Health Score Calculator logic
   */
  public async calculateAndSaveProductHealth(productId: string): Promise<any> {
    const ProductModel = mongoose.model('Product');
    const product = await ProductModel.findById(productId);
    if (!product) return;

    let score = 100;
    const issues: string[] = [];

    // 1. Missing Specifications
    if (!product.specifications || product.specifications.size === 0) {
      score -= 15;
      issues.push('Missing specifications table data.');
    }

    // 2. Missing images
    if (!product.images || product.images.length === 0) {
      score -= 25;
      issues.push('No product images configured.');
    }

    // 3. SEO Completeness
    if (!product.seoTitle || !product.seoDescription) {
      score -= 15;
      issues.push('Incomplete SEO metadata configuration.');
    }

    // 4. Broken/Invalid Link Checks
    const linkValidation = this.validateAffiliateLink(product.affiliateLink, product.affiliateCode);
    if (!linkValidation.valid) {
      score -= 25;
      issues.push(...linkValidation.issues);
    }

    // 5. Stock Status issue
    if (!product.inStock) {
      score -= 10;
      issues.push('Product is currently marked as OUT OF STOCK.');
    }

    score = Math.max(0, score);

    await ProductHealth.findOneAndUpdate(
      { productId: product._id },
      { 
        healthScore: score,
        issues,
        lastSyncStatus: linkValidation.valid ? 'success' : 'warning',
        lastCalculated: new Date()
      },
      { upsert: true, new: true }
    );

    return { score, issues };
  }

  /**
   * Evaluation & triggers of Alerts and custom Automation Rules
   */
  private async evaluateAlertsAndAutomation(product: any, changedFields: Record<string, any>) {
    // Check for alerts triggered
    const alerts = await AlertRule.find({ active: true, $or: [{ productId: product._id }, { productId: { $exists: false } }, { productId: null }] });
    
    for (const alert of alerts) {
      let isTriggered = false;
      let alertMessage = '';

      if (alert.triggerType === 'price_drop_pct' && changedFields['price']) {
        const { old, new: currentPrice } = changedFields['price'];
        const dropPct = ((old - currentPrice) / old) * 100;
        if (dropPct >= alert.threshold) {
          isTriggered = true;
          alertMessage = `🚨 Price Drop alert! ${product.name} fell by ${Math.round(dropPct)}% (Now $${currentPrice}, previously $${old}).`;
        }
      } else if (alert.triggerType === 'out_of_stock' && changedFields['inStock']) {
        const { old, new: inStock } = changedFields['inStock'];
        if (old === true && inStock === false) {
          isTriggered = true;
          alertMessage = `⚠️ Inventory Alert: ${product.name} has run out of stock!`;
        }
      } else if (alert.triggerType === 'back_in_stock' && changedFields['inStock']) {
        const { old, new: inStock } = changedFields['inStock'];
        if (old === false && inStock === true) {
          isTriggered = true;
          alertMessage = `🎉 Inventory Restock: ${product.name} is back in stock at $${product.price}!`;
        }
      }

      if (isTriggered) {
        // Send alert messages across channels
        for (const channel of alert.channels) {
          await new NotificationHistory({
            recipient: 'Admin/Subscriber Team',
            channel,
            title: `Product Sync Alert: ${alert.name}`,
            message: alertMessage,
            status: 'sent'
          }).save();
        }
      }
    }

    // Check Automation Rules
    const autoRules = await AutomationRule.find({ active: true });
    for (const rule of autoRules) {
      let runAction = false;
      if (rule.triggerType === 'price_drop_pct' && changedFields['price']) {
        const { old, new: currentPrice } = changedFields['price'];
        const dropPct = ((old - currentPrice) / old) * 100;
        if (dropPct >= rule.triggerThreshold) {
          runAction = true;
        }
      }

      if (runAction) {
        // Execute rule actions
        for (const act of rule.actions) {
          // Register audit log
          await new NotificationHistory({
            recipient: 'Automation Exec',
            channel: 'system',
            title: `Executed Action: ${act.actionType}`,
            message: `Rule "${rule.name}" triggered on ${product.name} changes. Triggered ${act.actionType}`,
            status: 'sent'
          }).save();

          // Apply specific behaviors
          if (act.actionType === 'mark_best_deal') {
            product.trending = true;
            await product.save();
          }
        }
      }
    }
  }

  /**
   * Retrieves overall synchronization stats for the charts.
   */
  public async getSyncDashboardAnalytics(): Promise<any> {
    const ProductModel = mongoose.model('Product');
    const totalProducts = await ProductModel.countDocuments({});
    const oosCount = await ProductModel.countDocuments({ inStock: false });
    const syncedCount = await ProductModel.countDocuments({ lastPriceCheck: { $ne: null } });
    
    // Average health
    const healths = await ProductHealth.find({});
    const averageHealth = healths.length > 0 
      ? Math.round(healths.reduce((acc, curr) => acc + curr.healthScore, 0) / healths.length)
      : 100;

    // Failures count
    const failedJobs = await SyncJob.countDocuments({ status: 'failed' });
    const totalJobs = await SyncJob.countDocuments({});

    // Price drop trend count in history (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const changes = await ProductChange.find({ createdAt: { $gte: sevenDaysAgo } });

    return {
      totalProducts,
      outOfStock: oosCount,
      synchronized: syncedCount,
      averageHealth,
      jobsProcessed: totalJobs,
      failedJobs,
      recentPriceChangesCount: changes.length
    };
  }
}
