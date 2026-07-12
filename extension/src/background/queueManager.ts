import { logger } from '../services/logger';

export interface QueueJob {
  jobId: string;
  items: any[];
  concurrency: number;
  maxRetries: number;
  conflictStrategy: string;
  status: 'waiting' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  options?: any;
}

class QueueManager {
  private currentJob: QueueJob | null = null;
  private runningTasks: number = 0;
  private isProcessing: boolean = false;
  private isProcessingQueue: boolean = false;
  private alarmName = 'QUEUE_MANAGER_TICK';

  constructor() {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === this.alarmName) {
        this.processQueue();
      }
    });
  }

  public async startJob(jobId: string, items: any[], concurrency: number, maxRetries: number, conflictStrategy: string, options: any) {
    this.currentJob = {
      jobId,
      items,
      concurrency,
      maxRetries,
      conflictStrategy,
      status: 'running',
      options
    };
    await chrome.storage.local.set({ currentBulkJob: this.currentJob });
    this.isProcessing = true;
    
    // Keep service worker alive and ticking
    chrome.alarms.create(this.alarmName, { periodInMinutes: 0.25 }); // every 15 secs
    
    this.processQueue();
  }

  public async restoreJob() {
    const data = await chrome.storage.local.get('currentBulkJob');
    if (data.currentBulkJob && data.currentBulkJob.status === 'running') {
      this.currentJob = data.currentBulkJob;
      this.isProcessing = true;
      chrome.alarms.create(this.alarmName, { periodInMinutes: 0.25 });
      this.processQueue();
    }
  }

  public async pauseJob() {
    if (this.currentJob) {
      this.currentJob.status = 'paused';
      await chrome.storage.local.set({ currentBulkJob: this.currentJob });
    }
    this.isProcessing = false;
    chrome.alarms.clear(this.alarmName);
  }

  public async resumeJob() {
    if (this.currentJob && this.currentJob.status === 'paused') {
      this.currentJob.status = 'running';
      await chrome.storage.local.set({ currentBulkJob: this.currentJob });
      this.isProcessing = true;
      chrome.alarms.create(this.alarmName, { periodInMinutes: 0.25 });
      this.processQueue();
    }
  }

  public async cancelJob() {
    if (this.currentJob) {
      this.currentJob.status = 'cancelled';
      await chrome.storage.local.set({ currentBulkJob: this.currentJob });
    }
    this.isProcessing = false;
    chrome.alarms.clear(this.alarmName);
    this.notify('Bulk Import Cancelled', 'The bulk import job was cancelled.');
  }

  private async processQueue() {
    if (!this.currentJob || !this.isProcessing) return;
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      // Remove any items that are done
      const pendingItems = this.currentJob.items.map((item, index) => ({...item, index}))
        .filter(i => i.status === 'pending');

      if (pendingItems.length === 0 && this.runningTasks === 0) {
        this.currentJob.status = 'completed';
        await chrome.storage.local.set({ currentBulkJob: this.currentJob });
        this.isProcessing = false;
        chrome.alarms.clear(this.alarmName);
        this.notify('Bulk Import Completed', 'All items have been processed successfully.');
        return;
      }

      const availableSlots = this.currentJob.concurrency - this.runningTasks;
      if (availableSlots > 0 && pendingItems.length > 0) {
        const itemsToStart = pendingItems.slice(0, availableSlots);
        
        for (const item of itemsToStart) {
          // Mark as running
          this.currentJob.items[item.index].status = 'running';
          await chrome.storage.local.set({ currentBulkJob: this.currentJob });
          this.runningTasks++;
          
          // Start processing without awaiting so we can launch parallel tasks
          this.processItem(this.currentJob.items[item.index], item.index, this.currentJob.jobId, this.currentJob.maxRetries, this.currentJob.conflictStrategy, this.currentJob.options)
            .catch(err => logger.error('Process item error', err));
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processItem(item: any, index: number, jobId: string, maxRetries: number, strategy: string, options: any) {
    if (typeof item.retryCount !== 'number') {
      item.retryCount = 0;
    }
    let success = false;
    let finalError = '';
    let finalStatus = 'failed';
    
    const asin = item.asin || this.extractAsin(item.url);
    const url = item.url || `https://www.amazon.com/dp/${asin}`;

    while (item.retryCount <= maxRetries && !success) {
      if (!this.isProcessing || !this.currentJob || this.currentJob.status !== 'running') {
        this.runningTasks--;
        item.status = 'pending';
        return; // Job paused or cancelled
      }

      try {
        const payload = await this.scrapeViaTab(url);
        
        // Import to backend
        const res = await fetch('http://localhost:3000/api/admin/products/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await chrome.storage.local.get('token')).token}`
          },
          body: JSON.stringify({ product: payload, strategy, options })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          success = true;
          finalStatus = data.data?.status === 'skipped' ? 'skipped' : 'success';
        } else {
          throw new Error(data.error?.message || 'Import API failed');
        }
      } catch (err: any) {
        item.retryCount++;
        finalError = err.message;
        logger.warn(`Retry ${item.retryCount} for ${asin}: ${finalError}`);
        // exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, item.retryCount) * 1000));
      }
    }

    if (!success && item.retryCount > maxRetries) {
      finalStatus = 'failed';
    }

    // Update item locally
    if (this.currentJob) {
      this.currentJob.items[index].status = finalStatus;
      this.currentJob.items[index].error = finalError;
      await chrome.storage.local.set({ currentBulkJob: this.currentJob });
    }

    // Update backend item status
    try {
      await fetch(`http://localhost:3000/api/admin/products/bulk/${jobId}/item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await chrome.storage.local.get('token')).token}`
        },
        body: JSON.stringify({ itemIndex: index, status: finalStatus, error: finalError, retryCount: item.retryCount })
      });
    } catch (e) {
      logger.error('Failed to update backend item status', e);
    }

    this.runningTasks--;
    this.processQueue(); // Process next items
  }

  private scrapeViaTab(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active: false }, (tab) => {
        if (!tab.id) return reject(new Error("Failed to create tab"));
        
        const tabId = tab.id;
        
        // Timeout
        const timeout = setTimeout(() => {
          chrome.tabs.remove(tabId);
          reject(new Error("Scraping timeout"));
        }, 30000); // 30s timeout

        const listener = (_message: any, sender: chrome.runtime.MessageSender, _sendResponse: any) => {
          // If the tab just loaded the content script, we can ping it
          if (sender.tab?.id === tabId) {
            // we could listen for a "ready" message, but chrome.tabs.onUpdated is safer
          }
        };
        chrome.runtime.onMessage.addListener(listener);

        const checkTabStatus = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(checkTabStatus);
            // Tab finished loading, tell it to scrape
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action: "SCRAPE_AMAZON_PRODUCT" }, (response: any) => {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(listener);
                chrome.tabs.remove(tabId);
                
                if (chrome.runtime.lastError || !response) {
                  return reject(new Error(chrome.runtime.lastError?.message || "No response from tab"));
                }
                
                if (response.success) {
                  resolve(response.data);
                } else {
                  reject(new Error(response.error?.message || "Scrape failed"));
                }
              });
            }, 2000); // wait 2s for JS to execute on page
          }
        };

        chrome.tabs.onUpdated.addListener(checkTabStatus);
      });
    });
  }

  private extractAsin(url: string | undefined): string {
    if (!url) return '';
    const match = url.match(/\/([A-Z0-9]{10})(?:[/?]|$)/);
    return match ? match[1] : '';
  }

  private notify(title: string, message: string) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message
    });
  }
}

export const queueManager = new QueueManager();
