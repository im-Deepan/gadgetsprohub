# Phase 7: Advanced Media Management & Asset Pipeline

## Architecture
The media system uses a modular, agnostic storage approach to optimize, process, and deliver product images.
- **MediaService (`src/services/MediaService.ts`)**: Handles downloading, duplicate checking (via hashes), validation, optimization (via Sharp), variant generation (WEBP/AVIF/thumbnails), and storage.
- **MongoDB Schema**: \`MediaAsset\` keeps track of file hashes, optimization status, space saved, and original source references. \`MediaQueueJob\` acts as the backbone for background processing.
- **Background Trigger**: Images are fetched asynchronously (non-blocking) when a product is imported or updated.

## Media Pipeline Flow
1. **Import Hook**: Whenever an ASIN is imported and the product is saved, the unique image URLs are passed to the \`MediaService\`.
2. **Download & Verify**: Images are downloaded in a background queue. Corrupt or tiny images are rejected.
3. **Deduplication**: A SHA-256 hash of the buffer is generated. If a matching hash exists, it is linked instead of re-stored.
4. **Optimization**:
   - **Sharp** is used to compress the image optimally based on MIME type (quality: 80).
   - **Format Conversion**: WEBP variants are automatically generated alongside standard JPEGs.
   - **Responsive Resizing**: A thumbnail version is generated for srcset structures.
5. **Storage**: The optimized buffer is written to the local `/public/uploads/media/` directory.

## API Documentation
- \`GET /api/admin/media\`: List all media assets, paginated. Accepts \`?search=\` query.
- \`POST /api/admin/media/upload\`: Custom manual upload of images via Multipart form data (\`multer\`).
- \`GET /api/admin/media/analytics\`: Retrieves real-time storage statistics, compression space saved, duplicate stats, and job queues.
- \`DELETE /api/admin/media/:id\`: Deletes the asset entry, original file, and all variants from disk.

## Future Configuration
The system supports pluggable storage providers via the \`storageProvider\` field in \`MediaAsset\`. 
To switch from \`local\` to \`S3\` or \`Cloudinary\`, simply add the respective upload SDK logic within \`MediaService.processImageDownload\` and set the config accordingly.

