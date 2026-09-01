const fs = require('fs');

const codeToInsert = `
  // Streaming CSV Import with backpressure and batching
  app.post('/api/admin/import-csv', adminOnly, upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
      if (!(req as any).file) return res.status(400).json({ error: 'No CSV file uploaded' });
      
      const file = (req as any).file;
      const { parse } = require('csv-parse');
      
      const results: any[] = [];
      const stream = fs.createReadStream(file.path)
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }));
        
      let processed = 0;
      let failed = 0;
      let batch: any[] = [];
      
      const processBatch = async (rows: any[]) => {
        if (!rows.length) return;
        
        // Execute writes in parallel but bounded by batch size
        await Promise.all(rows.map(async (row) => {
          try {
            if (row.name && row.price) {
              const slug = row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              let catId = null;
              if (row.category) {
                const cat = await Category.findOne({ name: new RegExp('^' + row.category + '$', 'i') });
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
      
      fs.unlinkSync(file.path);
      
      res.json({ success: true, processed, failed });
    } catch (e: any) {
      console.error('CSV import error', e);
      res.status(500).json({ error: e.message });
    }
  });
`;

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace("app.post('/api/admin/products/import'", codeToInsert + "\n  app.post('/api/admin/products/import'");
fs.writeFileSync('server.ts', content);
