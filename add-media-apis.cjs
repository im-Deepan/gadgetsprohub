const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const apiInjection = `
  // ================= MEDIA MANAGEMENT API (PHASE 7) ================= //

  const multer = require('multer');
  const upload = multer({ dest: 'public/uploads/temp/' });

  app.get('/api/admin/media', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const query: any = {};
      if (search) {
        query.fileName = { $regex: search, $options: 'i' };
      }
      
      const media = await MediaAsset.find(query)
        .sort({ uploadDate: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
        
      const total = await MediaAsset.countDocuments(query);
      
      res.json({ success: true, data: media, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/media/upload', adminOnly, upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
      if (!(req as any).file) return res.status(400).json({ error: 'No file uploaded' });
      
      // Need to import mediaService, since it's an ES module we might just use dynamic import or require
      const { mediaService } = await import('./src/services/MediaService.js');
      // For a real upload we would process it directly here instead of download
      // Since it's a file, we can read it and process it
      
      const fs = require('fs');
      const crypto = require('crypto');
      const sharp = require('sharp');
      const path = require('path');
      
      const file = (req as any).file;
      const buffer = fs.readFileSync(file.path);
      
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const originalMetadata = await sharp(buffer).metadata();
      const format = originalMetadata.format || 'jpg';
      const fileName = \`\${hash}.\${format}\`;
      const relativePath = \`/uploads/media/\${fileName}\`;
      const destPath = path.join(process.cwd(), 'public', 'uploads', 'media', fileName);
      
      // optimize
      const optimizedBuffer = await sharp(buffer).jpeg({ quality: 80 }).toBuffer(); // Simplify
      fs.writeFileSync(destPath, optimizedBuffer);
      fs.unlinkSync(file.path); // cleanup temp
      
      const asset = new MediaAsset({
        fileName,
        localPath: relativePath,
        mimeType: \`image/\${format}\`,
        width: originalMetadata.width,
        height: originalMetadata.height,
        aspectRatio: originalMetadata.width && originalMetadata.height ? (originalMetadata.width / originalMetadata.height) : 1,
        hash,
        optimizationStatus: 'completed',
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: buffer.length / optimizedBuffer.length,
        storageProvider: 'local'
      });
      await asset.save();
      
      res.json({ success: true, data: asset });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/admin/media/analytics', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const totalImages = await MediaAsset.countDocuments();
      const stats = await MediaAsset.aggregate([
        { $group: {
            _id: null,
            totalOriginalSize: { $sum: "$originalSize" },
            totalOptimizedSize: { $sum: "$optimizedSize" }
        }}
      ]);
      
      const storageUsed = stats[0]?.totalOptimizedSize || 0;
      const spaceSaved = (stats[0]?.totalOriginalSize || 0) - storageUsed;
      
      const duplicates = await MediaAsset.aggregate([
        { $group: { _id: "$hash", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]);
      
      const failedJobs = await MediaQueueJob.countDocuments({ status: 'failed' });
      const queuedJobs = await MediaQueueJob.countDocuments({ status: { $in: ['waiting', 'running'] } });

      res.json({
        success: true,
        data: {
          totalImages,
          storageUsed,
          spaceSaved,
          duplicateImages: duplicates.length,
          failedJobs,
          queuedJobs
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/admin/media/:id', adminOnly, async (req: express.Request, res: express.Response) => {
    try {
      const asset = await MediaAsset.findById(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      
      // Delete file
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), 'public', asset.localPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      
      // Delete variants
      if (asset.variants) {
        Object.values(asset.variants).forEach((variantPath: any) => {
          const vp = path.join(process.cwd(), 'public', variantPath);
          if (fs.existsSync(vp)) fs.unlinkSync(vp);
        });
      }
      
      await asset.deleteOne();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
`;

const anchor = "app.post('/api/admin/products/bulk/:jobId/action'";
const insertIndex = code.indexOf(anchor);

if (insertIndex !== -1) {
  code = code.slice(0, insertIndex) + apiInjection + '\n' + code.slice(insertIndex);
  fs.writeFileSync('server.ts', code);
  console.log('Added Media APIs successfully.');
} else {
  console.log('Anchor not found!');
}
