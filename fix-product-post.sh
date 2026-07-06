node -e "
const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = \`    try {
      const rawPayload = cleanUndefined(req.body);
      const whitelistedKeys = [
        'name', 'slug', 'description', 'longDescription', 'category', 'subcategory', 'brand',
        'price', 'originalPrice', 'discount', 'images', 'image', 'videoUrl', 'specifications',
        'features', 'affiliateLink', 'affiliateCode', 'inStock', 'sku', 'tags',
        'trending', 'trendingStartedAt', 'featured', 'pros', 'cons',
        'seoTitle', 'seoDescription', 'seoKeywords', 'comparisonProducts',
        'badge', 'buyNowText', 'affiliatePlatform', 'buttonText', 'buttonColor'
      ];
      const payload: any = {};
      for (const key of whitelistedKeys) {
        if (rawPayload[key] !== undefined) {
          payload[key] = rawPayload[key];
        }
      }
      const proposedSlug = payload.slug || payload.name;\`;

code = code.replace(
\`    try {
      const payload = cleanUndefined(req.body);
      const proposedSlug = payload.slug || payload.name;\`,
replacement
);

fs.writeFileSync('server.ts', code);
"
