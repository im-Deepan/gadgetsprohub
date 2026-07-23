import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import mongoose from 'mongoose';

export interface DownloadMediaPayload {
  url: string;
  productId?: string;
  asin?: string;
}

// Helper to write structured JSON logs
const logStructured = (level: 'info' | 'warn' | 'error', message: string, context?: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    service: 'MediaService',
    ...context
  }));
};

// Defensive Getters to register models lazily and avoid MissingSchemaError
function getMediaAssetModel(): any {
  try {
    return mongoose.model('MediaAsset');
  } catch (err) {
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
      variants: { type: mongoose.Schema.Types.Mixed },
      metadata: { type: mongoose.Schema.Types.Mixed }
    });
    return mongoose.model('MediaAsset', mediaAssetSchema);
  }
}

function getMediaQueueJobModel(): any {
  try {
    return mongoose.model('MediaQueueJob');
  } catch (err) {
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
    return mongoose.model('MediaQueueJob', mediaQueueJobSchema);
  }
}

export class MediaService {
  private baseStoragePath: string;

  constructor() {
    this.baseStoragePath = path.join(process.cwd(), 'public', 'uploads', 'media');
    // Note: constructor is synchronous so sync check is necessary here.
    if (!fs.existsSync(this.baseStoragePath)) {
      fs.mkdirSync(this.baseStoragePath, { recursive: true });
    }
  }

  /**
   * Downloads an image, validates it, optimizes it, and stores it in the MediaAsset collection.
   */
  public async processImageDownload(payload: DownloadMediaPayload) {
    const MediaAsset = getMediaAssetModel();

    // 1. Check deduplication (by URL first, later by hash)
    const existing = await MediaAsset.findOne({ originalUrl: payload.url });
    if (existing) {
      logStructured('info', 'Asset already exists by URL lookup', { url: payload.url, id: existing._id });
      return existing;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds request timeout

    try {
      // 2. Download
      const response = await fetch(payload.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      // 2a. MIME Content-Type Validation
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content-type "${contentType}". Only image payloads are accepted.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 100) {
        throw new Error('Image too small or corrupted.');
      }

      // 3. Hash calculation for Deduplication
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const duplicate = await MediaAsset.findOne({ hash });
      if (duplicate) {
        logStructured('info', 'Asset already exists by hash lookup', { hash, id: duplicate._id });
        return duplicate;
      }

      // 4. Validate & Optimize using Sharp
      const originalMetadata = await sharp(buffer).metadata();
      const format = originalMetadata.format || 'jpeg';
      
      const fileName = `${hash}.${format}`;
      const localPath = path.join(this.baseStoragePath, fileName);
      const relativePath = `/uploads/media/${fileName}`;

      // Optimize
      let pipeline = sharp(buffer);
      const fmt = (format || '').toString().toLowerCase();
      if (fmt === 'jpeg' || fmt === 'jpg') {
        pipeline = pipeline.jpeg({ quality: 80, progressive: true });
      } else if (fmt === 'png') {
        pipeline = pipeline.png({ quality: 80, compressionLevel: 8 });
      } else if (fmt === 'webp') {
        pipeline = pipeline.webp({ quality: 80 });
      } else if (fmt === 'avif') {
        pipeline = pipeline.avif({ quality: 80 });
      } else if (fmt === 'gif') {
        pipeline = pipeline.gif();
      }

      const optimizedBuffer = await pipeline.toBuffer();
      
      // Also generate webp variant if it's not already webp
      const variants: Record<string, string> = {};
      if (format !== 'webp') {
        const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
        const webpName = `${hash}.webp`;
        await fs.promises.writeFile(path.join(this.baseStoragePath, webpName), webpBuffer);
        variants.webp = `/uploads/media/${webpName}`;
      }

      // Generate thumbnail (sizes for srcset) with fit and limits specified
      const thumbBuffer = await sharp(buffer)
        .resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true })
        .toFormat(format as any)
        .toBuffer();
      const thumbName = `${hash}-thumb.${format}`;
      await fs.promises.writeFile(path.join(this.baseStoragePath, thumbName), thumbBuffer);
      variants.thumb = `/uploads/media/${thumbName}`;

      // Async write of optimized main image
      await fs.promises.writeFile(localPath, optimizedBuffer);

      const compressionRatio = optimizedBuffer.length > 0 ? (buffer.length / optimizedBuffer.length) : 1;

      // 5. Store in DB
      const asset = new MediaAsset({
        productId: payload.productId,
        asin: payload.asin,
        originalUrl: payload.url,
        localPath: relativePath,
        fileName,
        mimeType: contentType || `image/${format}`,
        width: originalMetadata.width,
        height: originalMetadata.height,
        aspectRatio: originalMetadata.width && originalMetadata.height ? (originalMetadata.width / originalMetadata.height) : 1,
        hash,
        optimizationStatus: 'completed',
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio,
        storageProvider: 'local',
        variants
      });

      await asset.save();
      logStructured('info', 'Successfully processed and saved image asset', { id: asset._id, fileName });
      return asset;

    } catch (err: any) {
      clearTimeout(timeoutId);
      logStructured('error', 'Media download/processing error occurred', { url: payload.url, error: err.message });
      throw err;
    }
  }

  /**
   * Run optimization on all pending assets atomically claiming jobs to prevent concurrent race conditions
   */
  public async processQueue() {
    const MediaQueueJob = getMediaQueueJobModel();
    
    const claimedJobs: any[] = [];
    for (let i = 0; i < 10; i++) {
      const job = await MediaQueueJob.findOneAndUpdate(
        { status: 'waiting' },
        { status: 'running', startedAt: new Date() },
        { new: true }
      );
      if (!job) break;
      claimedJobs.push(job);
    }

    if (claimedJobs.length > 0) {
      logStructured('info', `Claimed ${claimedJobs.length} media queue jobs atomically for processing`);
    }
    
    for (const job of claimedJobs) {
      try {
        if (job.url) {
          await this.processImageDownload({
            url: job.url,
            asin: job.asin,
            productId: job.productId
          });
        } else if (job.assetId) {
          const MediaAsset = getMediaAssetModel();
          const asset = await MediaAsset.findById(job.assetId);
          if (asset && asset.localPath) {
            const fullPath = path.join(process.cwd(), 'public', asset.localPath);
            if (fs.existsSync(fullPath)) {
              const buf = await fs.promises.readFile(fullPath);
              const meta = await sharp(buf).metadata();
              asset.width = meta.width;
              asset.height = meta.height;
              asset.optimizationStatus = 'completed';
              await asset.save();
            }
          }
        }
        
        job.status = 'completed';
        job.completedAt = new Date();
      } catch (err: any) {
        job.status = 'failed';
        job.error = err.message;
        job.attempts = (job.attempts || 0) + 1;
        if (job.attempts < (job.maxAttempts || 3)) {
          job.status = 'waiting';
        }
      }
      await job.save();
    }
  }
}

export const mediaService = new MediaService();
