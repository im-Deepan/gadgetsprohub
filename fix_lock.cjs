const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldEndpointRegex = /app\.get\('\/api\/webhooks\/n8n\/products-to-update'[\s\S]*?catch \(error: any\) {[\s\S]*?return res\.status\(500\)\.json\({ error: 'An internal error occurred.' }\);\s*}\s*}\);/;

const newEndpoint = `
  app.get('/api/webhooks/n8n/products-to-update', authenticateN8N, async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      if (isMongoConnected) {
        // Atomic fetch and lock loop to prevent duplicate processing
        const productsToReturn = [];
        const candidateProducts = await Product.find({})
          .sort({ lastPriceCheck: 1, _id: 1 })
          .limit(limit * 3)
          .select('_id name affiliateLink price slug lastPriceCheck');
          
        for (const p of candidateProducts) {
          if (productsToReturn.length >= limit) break;
          try {
            await RequestLock.create({
              key: \`n8n-price-update-\${p._id}\`,
              lockedAt: new Date(),
              expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            });
            productsToReturn.push(p);
          } catch(e) {
            // lock failed (duplicate key), skip
          }
        }
        
        return res.json(productsToReturn);
      } else {
        return res.json([]);
      }
    } catch (error: any) {
      return res.status(500).json({ error: 'An internal error occurred.' });
    }
  });
`;

content = content.replace(oldEndpointRegex, newEndpoint.trim());
fs.writeFileSync('server.ts', content);
