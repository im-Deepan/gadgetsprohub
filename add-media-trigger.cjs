const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const injection = `
          // PHASE 7: Background Media Download Trigger
          if (uniqueImages && uniqueImages.length > 0) {
            import('./src/services/MediaService.js').then(({ mediaService }) => {
              uniqueImages.forEach((imgUrl: any) => {
                mediaService.processImageDownload({
                  url: imgUrl,
                  productId: product._id.toString(),
                  asin: normalizedAsin || undefined
                }).catch((err: any) => console.warn('Media download failed in background:', err.message));
              });
            }).catch((err: any) => console.warn('MediaService dynamic import failed:', err.message));
          }
`;

const target = "await product.save();";
// Replace the specific instance inside the import route
// Find line index roughly around 5996
const searchLines = code.split('\n');
for (let i = 5980; i < 6020; i++) {
  if (searchLines[i] && searchLines[i].includes('await product.save();')) {
    searchLines[i] = searchLines[i] + '\n' + injection;
    break;
  }
}
fs.writeFileSync('server.ts', searchLines.join('\n'));
console.log('Added Media trigger');
