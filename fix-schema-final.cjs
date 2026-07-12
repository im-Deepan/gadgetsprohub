const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldStr = `const importHistorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  asin: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  result: { type: String, enum: ['success', 'skip', 'failed'], required: true },
  strategy: { type: String },
  error: { type: String },
  details: { type: mongoose.Schema.Types.Mixed }
});

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
  asin: { type: String, required: true },`;

const newStr = `const importHistorySchema = new mongoose.Schema({
  productName: { type: String, required: true },
  asin: { type: String, required: true },`;

code = code.replace(oldStr, newStr);

const bulkStr = `
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

const insertIndex = code.indexOf(`const ImportHistory = mongoose.model('ImportHistory', importHistorySchema);`) + `const ImportHistory = mongoose.model('ImportHistory', importHistorySchema);`.length;

code = code.slice(0, insertIndex) + bulkStr + code.slice(insertIndex);

fs.writeFileSync('server.ts', code);
console.log('Fixed schema final');
