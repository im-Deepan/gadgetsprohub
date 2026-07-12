/**
 * BulkImportService - Architectural Foundation
 * Lays down the queueing, execution, retry strategy, progress tracking,
 * and cancellation logic for high-volume product ingestions.
 */

export interface BulkImportJob {
  id: string;
  source: 'CSV' | 'MultipleTabs' | 'AmazonWishlist';
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  items: Array<{
    asin: string;
    productData?: any;
    status: 'pending' | 'success' | 'failed' | 'skipped';
    error?: string;
    retryCount: number;
  }>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledBy?: string;
}

export interface BulkImportProgress {
  jobId: string;
  status: BulkImportJob['status'];
  progressPercentage: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  estimatedTimeRemainingMs: number;
}

export class BulkImportService {
  private activeJobs = new Map<string, BulkImportJob>();
  private maxConcurrentJobs = 2;
  private maxRetriesPerItem = 3;
  private retryDelayMs = 1000;

  constructor() {
    console.log('[BulkImportService] Initialized with parallel capacity:', this.maxConcurrentJobs);
  }

  /**
   * Creates a new bulk import job from standard inputs (such as CSV string, raw wishlist URL, or parsed arrays).
   */
  public createJob(
    source: BulkImportJob['source'],
    asins: string[],
    adminId: string
  ): BulkImportJob {
    const jobId = `bulk-job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const job: BulkImportJob = {
      id: jobId,
      source,
      status: 'pending',
      totalItems: asins.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      items: asins.map(asin => ({
        asin: asin.trim().toUpperCase(),
        status: 'pending',
        retryCount: 0
      })),
      createdAt: new Date()
    };

    this.activeJobs.set(jobId, job);
    console.log(`[BulkImportService] Created bulk import job: ${jobId}, Total ASINs: ${asins.length}`);
    
    // Auto-trigger queue processing asynchronously
    this.processQueue().catch(err => {
      console.error('[BulkImportService] Queue processing error:', err.message);
    });

    return job;
  }

  /**
   * Orchestrates the concurrency limits and processes pending jobs
   */
  private async processQueue(): Promise<void> {
    const runningJobsCount = Array.from(this.activeJobs.values()).filter(
      j => j.status === 'processing'
    ).length;

    if (runningJobsCount >= this.maxConcurrentJobs) {
      return; // Cap concurrency limit
    }

    const nextPendingJob = Array.from(this.activeJobs.values()).find(
      j => j.status === 'pending'
    );

    if (!nextPendingJob) return;

    await this.executeJob(nextPendingJob.id);
  }

  /**
   * Executes a job item-by-item with robust retry policies, pause/resume compatibility, and error wrapping.
   */
  private async executeJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = new Date();
    console.log(`[BulkImportService] [${jobId}] Starting processing...`);

    for (const item of job.items) {
      // Respect cancel instructions gracefully before starting each item
      if ((job as any).status === 'cancelled') {
        console.log(`[BulkImportService] [${jobId}] Execution halted midway due to user cancellation.`);
        break;
      }

      try {
        await this.importItemWithRetry(item, jobId);
        job.successfulItems++;
      } catch (err: any) {
        job.failedItems++;
        item.status = 'failed';
        item.error = err.message || 'Unknown import failure';
      } finally {
        job.processedItems++;
        // Trigger potential state changes, websocket broadcasts or db sync here
      }
    }

    if ((job as any).status !== 'cancelled') {
      job.status = job.failedItems === job.totalItems ? 'failed' : 'completed';
    }
    job.completedAt = new Date();
    console.log(`[BulkImportService] [${jobId}] Completed. Success: ${job.successfulItems}, Failed: ${job.failedItems}`);

    // Free up capacity and start the next pending job
    this.processQueue().catch(() => {});
  }

  /**
   * Resilient single-item import pipeline using exponential or linear backoff retries.
   */
  private async importItemWithRetry(
    item: BulkImportJob['items'][0],
    jobId: string
  ): Promise<any> {
    while (item.retryCount < this.maxRetriesPerItem) {
      try {
        console.log(`[BulkImportService] [${jobId}] Importing ASIN ${item.asin} (Attempt ${item.retryCount + 1})`);
        
        // FUTURE IMPLEMENTATION:
        // Connect with the real scraper / API controller import endpoint
        // const result = await performScrapeAndImport(item.asin);
        
        // Simulating artificial rate delays & processing
        await new Promise(resolve => setTimeout(resolve, 300));
        
        item.status = 'success';
        return { success: true, asin: item.asin };
      } catch (err: any) {
        item.retryCount++;
        if (item.retryCount >= this.maxRetriesPerItem) {
          throw new Error(`Failed after ${this.maxRetriesPerItem} retries. Last error: ${err.message}`);
        }
        const delay = this.retryDelayMs * item.retryCount;
        console.warn(`[BulkImportService] [${jobId}] Retrying ASIN ${item.asin} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cancels a currently running job mid-execution
   */
  public cancelJob(jobId: string, adminEmail: string): boolean {
    const job = this.activeJobs.get(jobId);
    if (!job) return false;

    if (job.status === 'processing' || job.status === 'pending') {
      job.status = 'cancelled';
      job.cancelledBy = adminEmail;
      job.completedAt = new Date();
      console.log(`[BulkImportService] [${jobId}] Marked as CANCELLED by ${adminEmail}`);
      return true;
    }

    return false;
  }

  /**
   * Retrieves fine-grained progress stats for the UI
   */
  public getProgress(jobId: string): BulkImportProgress | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    const progressPercentage = job.totalItems > 0 
      ? Math.round((job.processedItems / job.totalItems) * 100) 
      : 0;

    // Estimate remaining time: 1.5 seconds average per product scrape/processing
    const itemsLeft = job.totalItems - job.processedItems;
    const estimatedTimeRemainingMs = itemsLeft * 1500;

    return {
      jobId,
      status: job.status,
      progressPercentage,
      processedCount: job.processedItems,
      successCount: job.successfulItems,
      failedCount: job.failedItems,
      estimatedTimeRemainingMs
    };
  }

  /**
   * Future CSV Parser integration hook
   */
  public parseCSVAndQueue(csvContent: string, adminId: string): BulkImportJob {
    // 1. Parse CSV string (using PapaParse or raw line parsing)
    // 2. Extract ASIN column values
    // 3. Call createJob
    console.log('[BulkImportService] Simulating CSV parsing and job enqueueing...');
    const parsedAsins = ['B08F7PTF53', 'B07WDKLDRX', 'B08GD8M6S7']; // Mock parsed ASINs
    return this.createJob('CSV', parsedAsins, adminId);
  }

  /**
   * Future Multi-Tab Extractor hook
   */
  public queueMultiTabImports(asins: string[], adminId: string): BulkImportJob {
    return this.createJob('MultipleTabs', asins, adminId);
  }

  /**
   * Future Amazon Wishlist crawler hook
   */
  public queueWishlistImport(wishlistUrl: string, adminId: string): BulkImportJob {
    // Extract ID and trigger job
    console.log('[BulkImportService] Parsing Wishlist URL:', wishlistUrl);
    const mockWishlistAsins = ['B00X4WHP55', 'B01DFKC2SO'];
    return this.createJob('AmazonWishlist', mockWishlistAsins, adminId);
  }
}

export const bulkImportService = new BulkImportService();
