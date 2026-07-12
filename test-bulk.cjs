const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');

// Insert BulkImportJob Schema
const schemaInjection = `
const bulkImportJobSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
  status: { type: String, enum: ['waiting', 'running', 'completed', 'failed', 'cancelled', 'paused'], default: 'waiting' },
  totalItems: { type: Number, default: 0 },
  processedItems: { type: Number, default: 0 },
  successfulItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },
  skippedItems: { type: Number, default: 0 },
  items: [{
    asin: { type: String },
    url: { type: String },
    status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped', 'cancelled'], default: 'pending' },
    error: { type: String },
    retryCount: { type: Number, default: 0 }
  }],
  concurrency: { type: Number, default: 3 },
  maxRetries: { type: Number, default: 3 },
  conflictStrategy: { type: String, default: 'skip' },
  startedAt: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });
const BulkImportJob = mongoose.model('BulkImportJob', bulkImportJobSchema);
`;

const afterHistorySchema = code.indexOf('const importHistorySchema');
const insertPoint = code.indexOf('\n', code.indexOf('}', afterHistorySchema)) + 1;

let newCode = code.slice(0, insertPoint) + schemaInjection + code.slice(insertPoint);

// Insert API endpoints
const apiInjection = `
  // ================= BULK IMPORT QUEUE ENDPOINTS ================= //

  app.post('/api/admin/products/bulk/start', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { items, concurrency, maxRetries, conflictStrategy } = req.body;
      const adminId = (req as any).userId;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required and cannot be empty.' });
      }

      const job = new BulkImportJob({
        adminId,
        status: 'running',
        totalItems: items.length,
        items: items.map((i: any) => ({
          asin: i.asin,
          url: i.url,
          status: 'pending',
          retryCount: 0
        })),
        concurrency: concurrency || 3,
        maxRetries: maxRetries || 3,
        conflictStrategy: conflictStrategy || 'skip',
        startedAt: new Date()
      });

      await job.save();
      res.status(200).json({ success: true, jobId: job._id });
    } catch (err: any) {
      logStructured('ERROR', 'Failed to start bulk import', { error: err.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/products/bulk/status/:jobId', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const job = await BulkImportJob.findById(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.status(200).json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/products/bulk/active', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const adminId = (req as any).userId;
      const job = await BulkImportJob.findOne({ adminId, status: { $in: ['waiting', 'running', 'paused'] } }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/products/bulk/:jobId/action', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { action } = req.body; // pause, resume, cancel
      const job = await BulkImportJob.findById(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (action === 'pause') job.status = 'paused';
      else if (action === 'resume') job.status = 'running';
      else if (action === 'cancel') {
        job.status = 'cancelled';
        job.completedAt = new Date();
      }
      
      await job.save();
      res.status(200).json({ success: true, status: job.status });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/products/bulk/:jobId/item', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { itemIndex, status, error, retryCount } = req.body;
      const job = await BulkImportJob.findById(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (itemIndex >= 0 && itemIndex < job.items.length) {
        const item = job.items[itemIndex];
        const oldStatus = item.status;
        item.status = status;
        if (error) item.error = error;
        if (retryCount !== undefined) item.retryCount = retryCount;

        // Update counts
        if (oldStatus !== status) {
          if (status === 'success') job.successfulItems += 1;
          else if (status === 'failed') job.failedItems += 1;
          else if (status === 'skipped') job.skippedItems += 1;

          if (['success', 'failed', 'skipped', 'cancelled'].includes(status) && !['success', 'failed', 'skipped', 'cancelled'].includes(oldStatus)) {
            job.processedItems += 1;
          }
        }

        if (job.processedItems === job.totalItems && job.status === 'running') {
          job.status = 'completed';
          job.completedAt = new Date();
        }

        await job.save();
      }
      res.status(200).json({ success: true, jobStatus: job.status });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/products/bulk/history', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const adminId = (req as any).userId;
      const jobs = await BulkImportJob.find({ adminId }).sort({ createdAt: -1 }).limit(20);
      res.status(200).json({ success: true, jobs });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
`;

const routeInsertPoint = newCode.indexOf("app.get('/api/admin/products/import/history'");
newCode = newCode.slice(0, routeInsertPoint) + apiInjection + newCode.slice(routeInsertPoint);

fs.writeFileSync('server.ts', newCode);
console.log('Done modifying server.ts');
