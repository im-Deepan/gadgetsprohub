const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /if \(now - lastCheck > TWENTY_FOUR_HOURS && process\.env\.N8N_REALTIME_WEBHOOK_URL\) \{/,
  `if (now - lastCheck > TWENTY_FOUR_HOURS && process.env.N8N_REALTIME_WEBHOOK_URL) {
          // Optimistically update lastPriceCheck to prevent race condition deduplication
          product.lastPriceCheck = new Date();
          if (product.save) {
            product.save().catch(e => console.warn('Optimistic price check save failed:', e));
          } else {
             Product.updateOne({ _id: product._id }, { $set: { lastPriceCheck: new Date() } }).catch(e => console.warn(e));
          }`
);

fs.writeFileSync('server.ts', code);
