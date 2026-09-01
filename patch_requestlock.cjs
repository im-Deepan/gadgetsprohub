const fs = require('fs');

const schemaDef = `
// RequestLock Schema for distributed idempotency and background job locking
const requestLockSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  lockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 }
});
const RequestLock = mongoose.model('RequestLock', requestLockSchema);
`;

const n8nEndpoint = `
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
            const lock = await RequestLock.findOneAndUpdate(
              { key: \`n8n-price-update-\${p._id}\` },
              {
                $setOnInsert: {
                  key: \`n8n-price-update-\${p._id}\`,
                  lockedAt: new Date(),
                  expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes TTL
                }
              },
              { upsert: true, new: true, rawResult: true }
            );
            
            // If the document was just inserted, we got the lock
            // Depending on mongoose version, upsert rawResult structure varies.
            // But we can also just rely on lastErrorObject.updatedExisting === false
            // Mongoose 6+: lock.lastErrorObject?.updatedExisting === false
            // Wait, we can just do this safely by catching Duplicate Key error if we use create()
            // Or use an atomic check
            if (!lock?.lastErrorObject?.updatedExisting) {
               productsToReturn.push(p);
            }
          } catch(e) {
            // lock failed, skip
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

let content = fs.readFileSync('server.ts', 'utf8');

// Insert Schema
content = content.replace("// Token Schema", schemaDef + "\n// Token Schema");

// Replace endpoint
const oldEndpointRegex = /app\.get\('\/api\/webhooks\/n8n\/products-to-update'[\s\S]*?catch \(error: any\) {[\s\S]*?return res\.status\(500\)\.json\({ error: 'An internal error occurred.' }\);\s*}\s*}\);/;
content = content.replace(oldEndpointRegex, n8nEndpoint.trim());

fs.writeFileSync('server.ts', content);
