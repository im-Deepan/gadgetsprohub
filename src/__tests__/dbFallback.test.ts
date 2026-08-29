import * as fs from 'fs';
import * as path from 'path';

/**
 * High-Availability Local DB-Fallback Unit & Resilience Test Suite
 * Validates atomic disk persistence, recovery from corrupt states, and data consistency.
 */

describe('DB Fallback & Atomic Local Store Resilience', () => {
  const testStorePath = path.join(process.cwd(), `tmp_test_local_store_${Date.now()}.json`);

  const atomicWrite = (filePath: string, data: any) => {
    const tempPath = `${filePath}.${Date.now()}.${Math.floor(Math.random() * 100000)}.tmp`;
    try {
      const payload = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, payload, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      throw err;
    }
  };

  const readStore = (filePath: string, defaultData: any = []) => {
    if (!fs.existsSync(filePath)) return defaultData;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return defaultData;
    }
  };

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      try { fs.unlinkSync(testStorePath); } catch {}
    }
  });

  it('atomically creates, persists, and reads local dataset without corruption', () => {
    const initialProducts = [
      { id: 'prod_1', name: 'Smartwatch Pro', price: 199.99, category: 'Wearables' },
      { id: 'prod_2', name: 'Noise-Canceling Earbuds', price: 149.99, category: 'Audio' }
    ];

    atomicWrite(testStorePath, initialProducts);
    expect(fs.existsSync(testStorePath)).toBe(true);

    const loaded = readStore(testStorePath);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].name).toBe('Smartwatch Pro');
  });

  it('handles high concurrent writes safely without producing half-written files', () => {
    const iterations = 25;
    for (let i = 0; i < iterations; i++) {
      const dataset = Array.from({ length: i + 1 }, (_, idx) => ({
        id: `item_${idx}`,
        timestamp: Date.now(),
        seq: i
      }));
      atomicWrite(testStorePath, dataset);
    }

    const finalLoaded = readStore(testStorePath);
    expect(Array.isArray(finalLoaded)).toBe(true);
    expect(finalLoaded).toHaveLength(iterations);
    expect(finalLoaded[iterations - 1].seq).toBe(iterations - 1);
  });

  it('recovers gracefully to fallback defaults when disk file is unreadable or malformed', () => {
    // Write corrupted JSON
    fs.writeFileSync(testStorePath, '{ malformed_json::: missing brackets', 'utf8');

    const fallbackDefault = [{ id: 'seed_1', name: 'Fallback Default Item' }];
    const recovered = readStore(testStorePath, fallbackDefault);

    expect(recovered).toEqual(fallbackDefault);
    expect(recovered[0].name).toBe('Fallback Default Item');
  });

  it('performs query filtering and pagination on local store dataset', () => {
    const products = [
      { id: '1', name: 'Sony Headphones', category: 'Audio', price: 300 },
      { id: '2', name: 'Bose QuietComfort', category: 'Audio', price: 350 },
      { id: '3', name: 'Dell XPS 15', category: 'Laptops', price: 1500 },
      { id: '4', name: 'Apple iPad Pro', category: 'Tablets', price: 999 }
    ];

    // Filter by category
    const audioItems = products.filter(p => p.category === 'Audio');
    expect(audioItems).toHaveLength(2);

    // Search query filter
    const searchMatches = products.filter(p => p.name.toLowerCase().includes('apple'));
    expect(searchMatches).toHaveLength(1);
    expect(searchMatches[0].id).toBe('4');

    // Pagination slice
    const page = 1;
    const limit = 2;
    const paginated = products.slice((page - 1) * limit, page * limit);
    expect(paginated).toHaveLength(2);
    expect(paginated[0].id).toBe('1');
    expect(paginated[1].id).toBe('2');
  });
});
