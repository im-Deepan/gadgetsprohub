import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
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

// Helper to determine if an IP address is private, loopback, link-local, multicast, etc.
export function isIpPrivate(ipAddress: string): boolean {
  if (!ipAddress) return true;
  
  // Clean up bracketed IPv6
  const cleanIp = ipAddress.replace(/^\[|\]$/g, '').trim().toLowerCase();
  
  if (cleanIp === 'localhost' || cleanIp === '::' || cleanIp === '::1' || cleanIp === '0.0.0.0') {
    return true;
  }

  // IPv4 check
  const ipv4Parts = cleanIp.split('.').map(Number);
  if (ipv4Parts.length === 4 && !ipv4Parts.some(isNaN)) {
    const [oct1, oct2, oct3, oct4] = ipv4Parts;
    // Loopback: 127.0.0.0/8
    if (oct1 === 127) return true;
    // Class A private: 10.0.0.0/8
    if (oct1 === 10) return true;
    // Class B private: 172.16.0.0/12
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true;
    // Class C private: 192.168.0.0/16
    if (oct1 === 192 && oct2 === 168) return true;
    // Link-local: 169.254.0.0/16
    if (oct1 === 169 && oct2 === 254) return true;
    // Current network/broadcast/invalid: 0.0.0.0/8
    if (oct1 === 0) return true;
    // Shared address space: 100.64.0.0/10
    if (oct1 === 100 && oct2 >= 64 && oct2 <= 127) return true;
    // IETF Protocol Assignments: 192.0.0.0/24
    if (oct1 === 192 && oct2 === 0 && oct3 === 0) return true;
    // TEST-NET-1: 192.0.2.0/24
    if (oct1 === 192 && oct2 === 0 && oct3 === 2) return true;
    // IPv6 to IPv4 relay: 192.88.99.0/24
    if (oct1 === 192 && oct2 === 88 && oct3 === 99) return true;
    // Benchmark testing: 198.18.0.0/15
    if (oct1 === 198 && oct2 >= 18 && oct2 <= 19) return true;
    // TEST-NET-2: 198.51.100.0/24
    if (oct1 === 198 && oct2 === 51 && oct3 === 100) return true;
    // TEST-NET-3: 203.0.113.0/24
    if (oct1 === 203 && oct2 === 0 && oct3 === 113) return true;
    // Multicast/Reserved/Experimental: 224.0.0.0/4 and 240.0.0.0/4
    if (oct1 >= 224) return true;
  }

  // IPv6 check (very basic prefixes)
  // Private/Unique Local Address (ULA): fc00::/7 (fc00:: to fdff::)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
  // Link-local address: fe80::/10
  if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true;

  return false;
}

// Helper to validate URL scheme and block SSRF (loopback, private IPs, metadata)
function isSafeUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) return false;

    if (isIpPrivate(hostname)) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Defensive Getters to register models lazily and avoid MissingSchemaError
export const mediaAssetSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.Mixed, ref: 'Product' },
  asin: { type: String, index: true },
  originalUrl: { type: String, index: true, unique: true, sparse: true },
  localPath: { type: String },
  fileName: { type: String, required: true },
  cdnUrl: { type: String },
  mimeType: { type: String },
  width: { type: Number },
  height: { type: Number },
  aspectRatio: { type: Number },
  hash: { type: String, unique: true, sparse: true },
  uploadDate: { type: Date, default: Date.now },
  optimizationStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  originalSize: { type: Number },
  optimizedSize: { type: Number },
  compressionRatio: { type: Number },
  storageProvider: { type: String, enum: ['local', 's3', 'r2', 'cloudinary'], default: 'local' },
  variants: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed }
});

export const mediaQueueJobSchema = new mongoose.Schema({
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

export function getMediaAssetModel(): any {
  return mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
}

export function getMediaQueueJobModel(): any {
  return mongoose.models.MediaQueueJob || mongoose.model('MediaQueueJob', mediaQueueJobSchema);
}

export class MediaService {
  private baseStoragePath: string;
  private cacheStoragePath: string;
  private isShuttingDown: boolean = false;
  private activeAbortControllers: Set<AbortController> = new Set();

  constructor() {
    this.baseStoragePath = path.join(process.cwd(), 'public', 'uploads', 'media');
    this.cacheStoragePath = path.join(process.cwd(), 'public', 'uploads', 'cache');

    if (!fs.existsSync(this.baseStoragePath)) {
      fs.mkdirSync(this.baseStoragePath, { recursive: true });
    }
    if (!fs.existsSync(this.cacheStoragePath)) {
      fs.mkdirSync(this.cacheStoragePath, { recursive: true });
    }
  }

  /**
   * Safe termination during SIGTERM / SIGINT signals.
   * Cancels in-flight requests and prevents new processing tasks.
   */
  public stop() {
    logStructured('info', 'Stopping MediaService gracefully. Cancelling pending operations...');
    this.isShuttingDown = true;
    for (const controller of this.activeAbortControllers) {
      try {
        controller.abort();
      } catch (e) {}
    }
    this.activeAbortControllers.clear();
  }

  /**
   * Downloads an image, validates it, optimizes it, and generates responsive variants.
   */
  public async processImageDownload(payload: DownloadMediaPayload) {
    if (this.isShuttingDown) {
      throw new Error('MediaService is currently shutting down. Task rejected.');
    }

    if (!payload.url || !isSafeUrl(payload.url)) {
      throw new Error('Prohibited or invalid URL. Only public HTTP/HTTPS URLs are allowed.');
    }

    const MediaAsset = getMediaAssetModel();

    // 1. Check deduplication (by URL first, later by hash)
    const existing = await MediaAsset.findOne({ originalUrl: payload.url });
    if (existing) {
      logStructured('info', 'Asset already exists by URL lookup', { url: payload.url, id: existing._id });
      return existing;
    }

    let verifiedIp = '';
    let targetHostname = '';
    let isHttps = false;

    try {
      const urlObj = new URL(payload.url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
         throw new Error('Only HTTP/HTTPS URLs are allowed');
      }
      isHttps = urlObj.protocol === 'https:';
      
      targetHostname = urlObj.hostname.toLowerCase().trim();
      if (isIpPrivate(targetHostname)) {
         throw new Error('Private/Link-local IPs are not allowed');
      }

      // Resolve DNS to verify the resolved IP is not private (SSRF defence)
      const lookupResult = await dns.promises.lookup(targetHostname, { all: true });
      if (lookupResult && lookupResult.length > 0) {
        for (const addr of lookupResult) {
          if (isIpPrivate(addr.address)) {
            throw new Error(`The resolved IP address (${addr.address}) for hostname (${targetHostname}) is private or local.`);
          }
        }
        verifiedIp = lookupResult[0].address;
      } else {
        throw new Error(`Could not resolve hostname: ${targetHostname}`);
      }
    } catch (e: any) {
       throw new Error(`Invalid URL or DNS check failed: ${e.message}`);
    }

    const controller = new AbortController();
    this.activeAbortControllers.add(controller);
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      // 2. Download - connect safely
      let response: Response;
      if (isHttps) {
        const ipUrl = new URL(payload.url);
        ipUrl.hostname = verifiedIp.includes(':') ? `[${verifiedIp}]` : verifiedIp;

        response = await new Promise<Response>((resolve, reject) => {
          const req = https.request(ipUrl, {
            method: 'GET',
            headers: {
              'Host': targetHostname,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GadgetsProHub/1.0'
            },
            servername: targetHostname, // Proper SNI verification
            signal: controller.signal
          }, (res) => {
            const chunks: Buffer[] = [];
            let totalLength = 0;
            const MAX_SIZE = 15 * 1024 * 1024; // 15MB max
            
            res.on('data', (chunk: Buffer) => {
              totalLength += chunk.length;
              if (totalLength > MAX_SIZE) {
                req.destroy(new Error('Image exceeds 15MB size limit'));
                return;
              }
              chunks.push(chunk);
            });

            res.on('end', () => {
              const fullBuffer = Buffer.concat(chunks);
              resolve(new Response(fullBuffer, {
                status: res.statusCode || 200,
                headers: res.headers as any
              }));
            });
          });

          req.on('error', reject);
          req.end();
        });
      } else {
        response = await fetch(payload.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GadgetsProHub/1.0' }
        });
      }

      clearTimeout(timeoutId);
      this.activeAbortControllers.delete(controller);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: HTTP status ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new Error('Downloaded empty image payload');
      }

      // Check shutdown flag before starting heavy CPU-bound Sharp pipelines
      if (this.isShuttingDown) {
        throw new Error('MediaService aborted task during shutdown.');
      }

      // 3. Inspect image with sharp & calculate unique content hash
      const sharpInstance = sharp(buffer);
      const originalMetadata = await sharpInstance.metadata();

      if (!originalMetadata.format) {
        throw new Error('Invalid or unrecognized image format');
      }

      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg'];
      if (!allowedFormats.includes(originalMetadata.format)) {
        throw new Error(`Unsupported image format: ${originalMetadata.format}`);
      }

      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const format: string = originalMetadata.format === 'jpeg' ? 'jpg' : (originalMetadata.format || 'jpg');
      const fileName = `${hash}.${format}`;
      const relativePath = `/uploads/media/${fileName}`;
      const localPath = path.join(this.baseStoragePath, fileName);

      // 4. Generate Optimized Main Image & Responsive Variants
      let pipeline = sharp(buffer);
      const fmt = format.toLowerCase();
      if (fmt === 'jpeg' || fmt === 'jpg') {
        pipeline = pipeline.jpeg({ quality: 80, progressive: true });
      } else if (fmt === 'png') {
        pipeline = pipeline.png({ quality: 80, compressionLevel: 8 });
      } else if (fmt === 'webp') {
        pipeline = pipeline.webp({ quality: 80 });
      } else if (fmt === 'avif') {
        pipeline = pipeline.avif({ quality: 75 });
      } else if (fmt === 'gif') {
        pipeline = pipeline.gif();
      }

      const optimizedBuffer = await pipeline.toBuffer();
      const variants: Record<string, string> = {};

      // Variant A: WebP Modern format
      if (fmt !== 'webp') {
        const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
        const webpName = `${hash}.webp`;
        await fs.promises.writeFile(path.join(this.baseStoragePath, webpName), webpBuffer);
        variants.webp = `/uploads/media/${webpName}`;
      }

      // Variant B: AVIF Ultra-high compression format
      if (fmt !== 'avif') {
        try {
          const avifBuffer = await sharp(buffer).avif({ quality: 75 }).toBuffer();
          const avifName = `${hash}.avif`;
          await fs.promises.writeFile(path.join(this.baseStoragePath, avifName), avifBuffer);
          variants.avif = `/uploads/media/${avifName}`;
        } catch (e) {
          // Gracefully continue if AVIF encoding is not available
        }
      }

      // Variant C: Thumbnail (300x300 inside fit for product cards and search results)
      const thumbBuffer = await sharp(buffer)
        .resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true })
        .toFormat(format as any)
        .toBuffer();
      const thumbName = `${hash}-thumb.${format}`;
      await fs.promises.writeFile(path.join(this.baseStoragePath, thumbName), thumbBuffer);
      variants.thumb = `/uploads/media/${thumbName}`;

      // Variant D: Medium (800px width for responsive tablet/mobile screens)
      if (originalMetadata.width && originalMetadata.width > 800) {
        const mediumBuffer = await sharp(buffer)
          .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
          .toFormat(format as any)
          .toBuffer();
        const mediumName = `${hash}-medium.${format}`;
        await fs.promises.writeFile(path.join(this.baseStoragePath, mediumName), mediumBuffer);
        variants.medium = `/uploads/media/${mediumName}`;
      }

      // Async write of optimized main image
      await fs.promises.writeFile(localPath, optimizedBuffer);

      const compressionRatio = optimizedBuffer.length > 0 ? (buffer.length / optimizedBuffer.length) : 1;

      // 5. Store in DB atomically (upsert by hash)
      const asset = await MediaAsset.findOneAndUpdate(
        { hash },
        {
          $setOnInsert: {
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
            variants,
            uploadDate: new Date()
          }
        },
        { new: true, upsert: true }
      );

      logStructured('info', 'Successfully processed and saved image asset with responsive variants', { id: asset._id, fileName });
      return asset;

    } catch (err: any) {
      clearTimeout(timeoutId);
      this.activeAbortControllers.delete(controller);
      logStructured('error', 'Media download/processing error occurred', { url: payload.url, error: err.message });
      throw err;
    }
  }

  /**
   * On-demand responsive image variant generation with local caching
   */
  public async getOrCreateVariant(
    sourcePath: string,
    options: { width?: number; height?: number; format?: string; quality?: number }
  ): Promise<{ buffer: Buffer; mimeType: string; cached: boolean }> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down');
    }

    const { width, height, format = 'webp', quality = 80 } = options;
    const sanitizedSource = path.normalize(sourcePath).replace(/^(\.\.[\/\\])+/, '');
    const absoluteSource = path.isAbsolute(sanitizedSource)
      ? sanitizedSource
      : path.join(process.cwd(), 'public', sanitizedSource);

    if (!fs.existsSync(absoluteSource)) {
      throw new Error('Source media file not found');
    }

    const cacheKey = crypto
      .createHash('md5')
      .update(`${sanitizedSource}-${width || 'auto'}-${height || 'auto'}-${format}-${quality}`)
      .digest('hex');

    const cacheFileName = `${cacheKey}.${format}`;
    const cacheFilePath = path.join(this.cacheStoragePath, cacheFileName);

    if (fs.existsSync(cacheFilePath)) {
      const cachedBuffer = await fs.promises.readFile(cacheFilePath);
      return { buffer: cachedBuffer, mimeType: `image/${format}`, cached: true };
    }

    let transform = sharp(absoluteSource);
    if (width || height) {
      transform = transform.resize({
        width: width ? Math.min(width, 2400) : undefined,
        height: height ? Math.min(height, 2400) : undefined,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    const fmt = format.toLowerCase();
    if (fmt === 'webp') transform = transform.webp({ quality });
    else if (fmt === 'avif') transform = transform.avif({ quality });
    else if (fmt === 'jpeg' || fmt === 'jpg') transform = transform.jpeg({ quality, progressive: true });
    else if (fmt === 'png') transform = transform.png({ quality });

    const buffer = await transform.toBuffer();
    await fs.promises.writeFile(cacheFilePath, buffer);

    return { buffer, mimeType: `image/${format}`, cached: false };
  }

  /**
   * Run optimization on all pending assets atomically claiming jobs to prevent concurrent race conditions
   */
  public async processQueue() {
    if (this.isShuttingDown) return;

    const MediaQueueJob = getMediaQueueJobModel();
    
    const claimedJobs: any[] = [];
    for (let i = 0; i < 10; i++) {
      if (this.isShuttingDown) break;
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
      if (this.isShuttingDown) break;
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
