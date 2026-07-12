import re

with open('server.ts', 'r') as f:
    content = f.read()

n8n_old = """        if (now - lastCheck > TWENTY_FOUR_HOURS && process.env.N8N_REALTIME_WEBHOOK_URL) {
          try {
            const n8nRes = await fetch(process.env.N8N_REALTIME_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.N8N_SECRET_TOKEN || ''}` },
              body: JSON.stringify({ 
                productId: product._id, 
                affiliateLink: product.affiliateLink, 
                slug: product.slug 
              })
            });
            if (n8nRes.ok) {
              const updatedData = await n8nRes.json();
              if (updatedData && typeof updatedData.price === 'number') {
                product.price = updatedData.price;
                if (typeof updatedData.originalPrice === 'number') product.originalPrice = updatedData.originalPrice;
                if (typeof updatedData.discount === 'number') product.discount = updatedData.discount;
                if (typeof updatedData.inStock === 'boolean') product.inStock = updatedData.inStock;
                product.lastPriceCheck = new Date();
                await product.save();
              }
            }
          } catch (error) {
            console.warn('Failed to fetch real-time price from n8n webhook:', error instanceof Error ? error.message : String(error));
          }
        }"""

n8n_new = """        if (now - lastCheck > TWENTY_FOUR_HOURS && process.env.N8N_REALTIME_WEBHOOK_URL) {
          // Fire and forget non-blocking update
          fetch(process.env.N8N_REALTIME_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.N8N_SECRET_TOKEN || ''}` },
            body: JSON.stringify({ 
              productId: product._id, 
              affiliateLink: product.affiliateLink, 
              slug: product.slug 
            }),
            signal: AbortSignal.timeout(5000)
          }).then(async (n8nRes) => {
            if (n8nRes.ok) {
              const updatedData = await n8nRes.json();
              if (updatedData && typeof updatedData.price === 'number') {
                await Product.findByIdAndUpdate(product._id, {
                  price: updatedData.price,
                  originalPrice: typeof updatedData.originalPrice === 'number' ? updatedData.originalPrice : product.originalPrice,
                  discount: typeof updatedData.discount === 'number' ? updatedData.discount : product.discount,
                  inStock: typeof updatedData.inStock === 'boolean' ? updatedData.inStock : product.inStock,
                  lastPriceCheck: new Date()
                });
              }
            }
          }).catch((error) => {
            console.warn('Failed to fetch real-time price from n8n webhook:', error instanceof Error ? error.message : String(error));
          });
        }"""

content = content.replace(n8n_old, n8n_new)

with open('server.ts', 'w') as f:
    f.write(content)
