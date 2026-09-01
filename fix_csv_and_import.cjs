const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `const cat = await Category.findOne({ name: new RegExp('^' + row.category + ', adminOnly, importLimiter, express.json({ limit: '5mb' }), async (req: express.Request, res: express.Response): Promise<any> => {`;

const fixedStr = `const cat = await Category.findOne({ name: new RegExp('^' + row.category + '$', 'i') });
                if (cat) catId = cat._id;
              }
              if (!catId) {
                const defaultCat = await Category.findOne();
                if (defaultCat) catId = defaultCat._id;
              }
              
              if (catId) {
                await Product.findOneAndUpdate(
                  { slug },
                  {
                    $setOnInsert: {
                      name: row.name,
                      slug,
                      price: Number(row.price),
                      category: catId,
                      brand: row.brand || 'Generic',
                      affiliateLink: row.affiliateLink || 'https://amazon.com',
                      description: row.description || '',
                      createdAt: new Date()
                    }
                  },
                  { upsert: true, new: true }
                );
                processed++;
              } else {
                failed++;
              }
            } else {
              failed++;
            }
          } catch(e) {
            failed++;
          }
        }));
      };

      for await (const row of stream) {
        batch.push(row);
        if (batch.length >= 50) {
          await processBatch(batch);
          batch = [];
        }
      }
      
      if (batch.length > 0) {
        await processBatch(batch);
      }
      
      try { fs.unlinkSync(file.path); } catch(e){}
      
      return res.json({ success: true, processed, failed });
    } catch (e: any) {
      console.error('CSV import error', e);
      return res.status(500).json({ error: e.message });
    }
  });

  // Dedicated Product Import API endpoint
  app.post('/api/admin/products/import', adminOnly, importLimiter, express.json({ limit: '5mb' }), async (req: express.Request, res: express.Response): Promise<any> => {`;

content = content.replace(targetStr, fixedStr);
fs.writeFileSync('server.ts', content);
console.log('Replaced successfully');
