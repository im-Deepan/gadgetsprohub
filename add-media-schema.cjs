const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const injection = `
// ========== PHASE 7: MEDIA MANAGEMENT SCHEMAS ==========
const mediaAssetSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, ref: 'Product' },
  asin: { type: String, index: true },
  originalUrl: { type: String },
  localPath: { type: String },
  fileName: { type: String, required: true },
  cdnUrl: { type: String },
  mimeType: { type: String },
  width: { type: Number },
  height: { type: Number },
  aspectRatio: { type: Number },
  hash: { type: String, index: true },
  uploadDate: { type: Date, default: Date.now },
  optimizationStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  originalSize: { type: Number },
  optimizedSize: { type: Number },
  compressionRatio: { type: Number },
  storageProvider: { type: String, enum: ['local', 's3', 'r2', 'cloudinary'], default: 'local' },
  variants: { type: mongoose.Schema.Types.Mixed }, // e.g. { webp: '...', avif: '...', thumb: '...' }
  metadata: { type: mongoose.Schema.Types.Mixed }
});

const mediaQueueJobSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' },
  type: { type: String, enum: ['download', 'optimize', 'convert', 'upload', 'cleanup'] },
  status: { type: String, enum: ['waiting', 'running', 'completed', 'failed', 'cancelled'], default: 'waiting' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date }
});

const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);
const MediaQueueJob = mongoose.model('MediaQueueJob', mediaQueueJobSchema);

`;

const anchor = "const BulkImportJob = mongoose.model('BulkImportJob', bulkImportJobSchema);";
const insertIndex = code.indexOf(anchor) + anchor.length;

if (insertIndex > anchor.length) {
  code = code.slice(0, insertIndex) + '\n' + injection + code.slice(insertIndex);
  fs.writeFileSync('server.ts', code);
  console.log('Added Media schemas successfully.');
} else {
  console.log('Anchor not found!');
}
