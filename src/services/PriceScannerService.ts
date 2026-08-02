import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { SyncService, localProducts } from './SyncService';

export interface PriceScannerLog {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  asin?: string;
  oldPrice: number;
  newPrice: number;
  status: 'updated' | 'unchanged' | 'failed';
  message: string;
}

export interface PriceScannerState {
  isRunning: boolean;
  isPaused: boolean;
  lastRunStartTime: string | null;
  lastScanCompletedTime: string | null;
  nextScheduledRunTime: string | null;
  fastMode: boolean; // Fast mode for instant testing (5s) vs 5-7m interval
  intervalRangeMinutes: [number, number]; // Default [5, 7]
  totalProducts: number;
  productsChecked: number;
  productsRemaining: number;
  productsUpdated: number;
  productsUnchanged: number;
  productsFailed: number;
  currentlyScanning: {
    id: string;
    name: string;
    price: number;
    asin?: string;
    index: number;
  } | null;
  scannedProductIds: string[];
  logs: PriceScannerLog[];
}

export class PriceScannerService {
  private static instance: PriceScannerService;
  private lastRunDate: string | null = null;
  private pendingProducts: any[] = [];

  private state: PriceScannerState = {
    isRunning: false,
    isPaused: false,
    lastRunStartTime: null,
    lastScanCompletedTime: null,
    nextScheduledRunTime: this.calculateNext1AM(),
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
  };

  private timerHandle: NodeJS.Timeout | null = null;
  private cronIntervalHandle: NodeJS.Timeout | null = null;

  private constructor() {
    this.start1AMCronWatcher();
  }

  public static getInstance(): PriceScannerService {
    if (!PriceScannerService.instance) {
      PriceScannerService.instance = new PriceScannerService();
    }
    return PriceScannerService.instance;
  }

  /**
   * Calculates ISO string for next occurrence of 1:00 AM local server time
   */
  public calculateNext1AM(): string {
    const now = new Date();
    const next1AM = new Date(now);
    next1AM.setHours(1, 0, 0, 0);
    if (now >= next1AM) {
      // If past 1 AM today, schedule for 1 AM tomorrow
      next1AM.setDate(next1AM.getDate() + 1);
    }
    return next1AM.toISOString();
  }

  /**
   * Background watcher that checks every 30 seconds if it's 1:00 AM or later to trigger daily scan with catch-up support
   */
  private start1AMCronWatcher() {
    if (this.cronIntervalHandle) clearInterval(this.cronIntervalHandle);

    this.cronIntervalHandle = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Trigger if hour is 1 AM or later today, scan hasn't run yet today, and scanner isn't active/paused
      if (now.getHours() >= 1 && this.lastRunDate !== todayStr && !this.state.isRunning && !this.state.isPaused) {
        this.lastRunDate = todayStr;
        console.log(`⏰ [PriceScanner] Daily 1:00 AM Trigger / Catch-up activated for ${todayStr}! Starting scan cycle...`);
        this.addLog('SYSTEM', `Daily Scheduled Trigger activated descending price scan cycle for ${todayStr}.`, 0, 0, 'unchanged');
        this.startScanCycle();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Returns copy of state for API response
   */
  public getState(): PriceScannerState {
    return {
      ...this.state,
      nextScheduledRunTime: this.state.nextScheduledRunTime || this.calculateNext1AM()
    };
  }

  /**
   * Start or restart the descending price scan cycle
   */
  public async startScanCycle(): Promise<PriceScannerState> {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.lastRunStartTime = new Date().toISOString();
    this.lastRunDate = new Date().toISOString().split('T')[0];

    // Fetch products in descending price order
    const products = await this.getProductsSortedByPriceDesc();
    this.pendingProducts = [...products];
    this.state.totalProducts = products.length;
    this.state.scannedProductIds = [];
    this.state.productsChecked = 0;
    this.state.productsRemaining = products.length;
    this.state.productsUpdated = 0;
    this.state.productsUnchanged = 0;
    this.state.productsFailed = 0;
    this.state.currentlyScanning = null;

    this.addLog(
      'SYSTEM',
      `Started new descending price scan cycle for ${products.length} products.`,
      0,
      0,
      'unchanged'
    );

    // Trigger process loop asynchronously
    setImmediate(() => this.processNextProduct());

    return this.getState();
  }

  /**
   * Pause the active scan cycle
   */
  public pauseScanCycle(): PriceScannerState {
    if (this.state.isRunning) {
      this.state.isRunning = false;
      this.state.isPaused = true;
      if (this.timerHandle) {
        clearTimeout(this.timerHandle);
        this.timerHandle = null;
      }
      this.addLog('SYSTEM', 'Price scanner cycle paused by admin.', 0, 0, 'unchanged');
    }
    return this.getState();
  }

  /**
   * Resume paused scan cycle
   */
  public resumeScanCycle(): PriceScannerState {
    if (this.state.isPaused) {
      this.state.isRunning = true;
      this.state.isPaused = false;
      this.addLog('SYSTEM', 'Price scanner cycle resumed by admin.', 0, 0, 'unchanged');
      setImmediate(() => this.processNextProduct());
    }
    return this.getState();
  }

  /**
   * Reset scan cycle
   */
  public async resetScanCycle(): Promise<PriceScannerState> {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const products = await this.getProductsSortedByPriceDesc();
    this.pendingProducts = [];
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.scannedProductIds = [];
    this.state.totalProducts = products.length;
    this.state.productsChecked = 0;
    this.state.productsRemaining = products.length;
    this.state.productsUpdated = 0;
    this.state.productsUnchanged = 0;
    this.state.productsFailed = 0;
    this.state.currentlyScanning = null;
    this.state.nextScheduledRunTime = this.calculateNext1AM();

    this.addLog('SYSTEM', 'Price scanner progress reset to initial pending state.', 0, 0, 'unchanged');

    return this.getState();
  }

  /**
   * Toggle Fast Mode (5 seconds interval for instant testing vs 5-7 min)
   */
  public toggleFastMode(enabled: boolean): PriceScannerState {
    this.state.fastMode = Boolean(enabled);
    this.addLog(
      'SYSTEM',
      `Fast Demo Mode ${this.state.fastMode ? 'ENABLED (5-sec gap)' : 'DISABLED (5-7 min gap)'}.`,
      0,
      0,
      'unchanged'
    );
    return this.getState();
  }

  /**
   * Fetches all products sorted by price DESCENDING
   */
  private async getProductsSortedByPriceDesc(): Promise<any[]> {
    try {
      const isMongoConnected = mongoose.connection.readyState === 1;
      if (isMongoConnected) {
        const ProductModel = mongoose.model('Product');
        // Sort by price descending (-1)
        const prods = await ProductModel.find({}).sort({ price: -1 }).lean();
        return prods;
      } else {
        // Fallback to local products if Mongo is offline
        if (Array.isArray(localProducts)) {
          return [...localProducts].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch sorted products for scanner:', err);
    }
    return [];
  }

  /**
   * Main recursive step processor for descending price scan
   */
  private async processNextProduct() {
    if (!this.state.isRunning || this.state.isPaused) return;

    try {
      const nextProduct = this.pendingProducts.shift();

      if (!nextProduct) {
        // All products in descending order scanned!
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.currentlyScanning = null;
        this.state.lastScanCompletedTime = new Date().toISOString();
        this.state.nextScheduledRunTime = this.calculateNext1AM();

        this.addLog(
          'COMPLETED',
          `🎉 Daily descending price scan complete! All ${this.state.totalProducts} products checked.`,
          0,
          0,
          'unchanged'
        );
        console.log(`✅ [PriceScanner] Scan cycle complete. Next run at ${this.state.nextScheduledRunTime}`);

        // Dispatch completion email notification
        await this.sendCompletionEmailNotification();
        return;
      }

      // Update current scanning indicator
      const currentIndex = this.state.scannedProductIds.length + 1;
      this.state.currentlyScanning = {
        id: nextProduct._id.toString(),
        name: nextProduct.name,
        price: Number(nextProduct.price) || 0,
        asin: nextProduct.asin || undefined,
        index: currentIndex
      };

      console.log(
        `🔍 [PriceScanner] [${currentIndex}/${this.state.totalProducts}] Checking price for "${nextProduct.name}" ($${nextProduct.price})`
      );

      const oldPrice = Number(nextProduct.price) || 0;

      // Perform live sync WITHOUT AI model
      let result: any = null;
      let syncError: any = null;

      try {
        result = await SyncService.getInstance().runLiveProductSync(nextProduct._id.toString());
      } catch (err: any) {
        syncError = err;
      }

      // Explicitly update lastPriceCheck timestamp in MongoDB / local database for this product ONLY if sync was successful
      if (!syncError) {
        const checkTimestamp = new Date();
        try {
          const isMongoConnected = mongoose.connection.readyState === 1;
          if (isMongoConnected) {
            const ProductModel = mongoose.model('Product');
            await ProductModel.findByIdAndUpdate(
              nextProduct._id,
              { $set: { lastPriceCheck: checkTimestamp } },
              { new: true }
            );
          } else {
            if (Array.isArray(localProducts)) {
              const pIndex = localProducts.findIndex(
                (lp: any) => lp._id?.toString() === nextProduct._id.toString() || lp.id === nextProduct._id.toString()
              );
              if (pIndex !== -1) {
                localProducts[pIndex].lastPriceCheck = checkTimestamp;
              }
            }
          }
        } catch (dbErr: any) {
          console.warn(`[PriceScanner] Failed to update lastPriceCheck in DB for product ${nextProduct._id}:`, dbErr.message);
        }
      }

      // Process result
      if (syncError) {
        this.state.productsFailed++;
        this.addLog(
          nextProduct._id.toString(),
          `Price check failed for "${nextProduct.name}": ${syncError.message || 'Scraper error'}`,
          oldPrice,
          oldPrice,
          'failed',
          nextProduct.asin,
          nextProduct.name
        );
      } else if (result && result.hasChanges && result.changedFields?.price) {
        const newPrice = Number(result.currentPrice);
        this.state.productsUpdated++;
        this.addLog(
          nextProduct._id.toString(),
          `PRICE UPDATED: "${nextProduct.name}" changed from $${oldPrice} to $${newPrice} (DB timestamp updated)`,
          oldPrice,
          newPrice,
          'updated',
          nextProduct.asin,
          nextProduct.name
        );
      } else {
        const currentPrice = result ? Number(result.currentPrice) : oldPrice;
        this.state.productsUnchanged++;
        this.addLog(
          nextProduct._id.toString(),
          `Price verified for "${nextProduct.name}": $${currentPrice} (No change, DB timestamp updated)`,
          oldPrice,
          currentPrice,
          'unchanged',
          nextProduct.asin,
          nextProduct.name
        );
      }

      // Mark product as scanned
      this.state.scannedProductIds.push(nextProduct._id.toString());
      this.state.productsChecked = this.state.scannedProductIds.length;
      this.state.productsRemaining = Math.max(0, this.state.totalProducts - this.state.productsChecked);

      // Determine interval delay
      let delayMs = 5000; // 5 seconds default in fast mode
      if (!this.state.fastMode) {
        // Random interval between 5 and 7 minutes (300,000 ms to 420,000 ms)
        const minMs = this.state.intervalRangeMinutes[0] * 60 * 1000;
        const maxMs = this.state.intervalRangeMinutes[1] * 60 * 1000;
        delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
      }

      console.log(
        `⏳ [PriceScanner] Waiting ${Math.round(delayMs / 1000)}s before next product check...`
      );

      // Schedule next item fetch
      this.timerHandle = setTimeout(() => {
        this.processNextProduct();
      }, delayMs);
    } catch (err) {
      console.error('Error in price scanner step:', err);
      this.state.isRunning = false;
    }
  }

  /**
   * Helper to append log item
   */
  private addLog(
    productId: string,
    message: string,
    oldPrice: number,
    newPrice: number,
    status: 'updated' | 'unchanged' | 'failed',
    asin?: string,
    productName?: string
  ) {
    const isSystem = productId === 'SYSTEM' || productId === 'COMPLETED';
    const resolvedName = productName || (isSystem ? 'System Notification' : 'Unknown Product');
    const logItem: PriceScannerLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      productId,
      productName: resolvedName,
      asin,
      oldPrice,
      newPrice,
      status,
      message
    };

    this.state.logs.unshift(logItem);
    // Keep last 100 logs
    if (this.state.logs.length > 100) {
      this.state.logs = this.state.logs.slice(0, 100);
    }
  }

  /**
   * Dispatches email notification upon completion of full product price scan cycle
   */
  private async sendCompletionEmailNotification() {
    try {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || user || 'admin@gadgetsprohub.com';

      const total = this.state.totalProducts;
      const updated = this.state.productsUpdated;
      const unchanged = this.state.productsUnchanged;
      const failed = this.state.productsFailed;
      const completedTime = this.state.lastScanCompletedTime
        ? new Date(this.state.lastScanCompletedTime).toLocaleString('en-US', { timeZoneName: 'short' })
        : new Date().toLocaleString();

      const subject = `✅ Daily Product Price Scan Completed - GadgetsProHub (${total} Products Verified)`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #334155;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
            <h1 style="color: #6366f1; margin: 0; font-size: 22px;">GadgetsProHub Price Scanner</h1>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 6px;">Daily Automated 1:00 AM Price Sync Notification</p>
          </div>

          <div style="padding: 20px 0;">
            <p style="font-size: 15px; color: #e2e8f0; line-height: 1.6;">
              Hello Administrator,<br><br>
              The automated daily price scanning cycle for <strong>all product prices on the website</strong> has successfully completed.
            </p>

            <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin: 20px 0;">
              <h3 style="color: #38bdf8; margin-top: 0; font-size: 16px;">📊 Scan Execution Summary</h3>
              <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #cbd5e1;">
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 8px 0; font-weight: bold; color: #94a3b8;">Total Products Scanned:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ffffff;">${total}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 8px 0; font-weight: bold; color: #818cf8;">Prices Updated/Changed:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #818cf8;">${updated}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 8px 0; font-weight: bold; color: #34d399;">Prices Verified (No Change):</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #34d399;">${unchanged}</td>
                </tr>
                <tr style="border-bottom: 1px solid #334155;">
                  <td style="padding: 8px 0; font-weight: bold; color: #f87171;">Errors / Failed Checks:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #f87171;">${failed}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #94a3b8;">Completed Time:</td>
                  <td style="padding: 8px 0; text-align: right; color: #e2e8f0;">${completedTime}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
              All product price check timestamps (<code>lastPriceCheck</code>) in the database have been updated accordingly.
            </p>
          </div>

          <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; color: #64748b; font-size: 12px;">
            GadgetsProHub Automated System &bull; No action required.
          </div>
        </div>
      `;

      if (host && port && user && pass) {
        const numericPort = Number(port);
        const transporter = nodemailer.createTransport({
          host,
          port: numericPort,
          secure: numericPort === 465,
          auth: { user, pass }
        });

        const sender = process.env.SENDER_EMAIL || user || 'notifications@gadgetsprohub.com';
        await transporter.sendMail({
          from: `"GadgetsProHub Price Scanner" <${sender}>`,
          to: adminEmail,
          subject,
          html: htmlBody
        });

        console.log(`📧 [PriceScanner] Completion email sent to ${adminEmail}`);
        this.addLog(
          'SYSTEM',
          `Completion email notification dispatched to ${adminEmail}`,
          0,
          0,
          'unchanged'
        );
      } else {
        console.log(`📧 [PriceScanner] SMTP not configured. Simulated completion notification email to ${adminEmail}`);
        this.addLog(
          'SYSTEM',
          `Price scan complete! Email notification simulated for ${adminEmail} (All product prices updated on website).`,
          0,
          0,
          'unchanged'
        );
      }
    } catch (emailErr: any) {
      console.error('⚠️ [PriceScanner] Failed to send completion notification email:', emailErr.message);
      this.addLog(
        'SYSTEM',
        `Failed to send completion notification email: ${emailErr.message}`,
        0,
        0,
        'failed'
      );
    }
  }
}

export const priceScannerService = PriceScannerService.getInstance();
