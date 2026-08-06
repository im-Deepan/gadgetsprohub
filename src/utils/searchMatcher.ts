/**
 * Advanced Search Matcher with Tokenization and Synonym Expansion
 * Matches queries against product name, brand, category, tags, and description.
 */

// Synonym mapping dictionary for common tech and footwear queries
const SYNONYMS: Record<string, string[]> = {
  // Audio synonyms
  headphones: ['headset', 'earbuds', 'earphone', 'earphones', 'tws', 'audio', 'wireless', 'over-ear', 'in-ear', 'noise canceling', 'anc'],
  headset: ['headphones', 'earbuds', 'earphone', 'tws', 'audio'],
  earbuds: ['headphones', 'headset', 'earphone', 'tws', 'airpods', 'buds', 'in-ear'],
  tws: ['earbuds', 'headphones', 'wireless', 'audio', 'buds'],
  audio: ['headphones', 'headset', 'earbuds', 'speaker', 'tws', 'soundbar'],

  // Mobile / Phone synonyms
  phone: ['smartphone', 'mobile', 'cellular', 'android', 'iphone', '5g'],
  smartphone: ['phone', 'mobile', 'cellular', 'android', 'iphone'],
  mobile: ['phone', 'smartphone', 'cellular', 'handset'],

  // Computing synonyms
  laptop: ['notebook', 'macbook', 'pc', 'computer', 'ultrabook', 'gaming laptop'],
  notebook: ['laptop', 'macbook', 'pc', 'computer'],
  computer: ['laptop', 'pc', 'desktop', 'notebook'],

  // Wearable synonyms
  watch: ['smartwatch', 'band', 'fitness tracker', 'wearable'],
  smartwatch: ['watch', 'band', 'fitness tracker', 'wearable'],
  wearable: ['smartwatch', 'watch', 'fitness band'],

  // Footwear synonyms
  shoe: ['shoes', 'sneaker', 'sneakers', 'footwear', 'bata', 'formal', 'oxford', 'running', 'boots'],
  shoes: ['shoe', 'sneaker', 'sneakers', 'footwear', 'bata', 'formal', 'oxford', 'running', 'boots'],
  footwear: ['shoe', 'shoes', 'sneakers', 'bata'],

  // Gaming / Accessories
  mouse: ['gaming mouse', 'accessory', 'pointing device', 'peripheral'],
  keyboard: ['gaming keyboard', 'mechanical', 'accessory', 'peripheral'],
  gaming: ['mouse', 'keyboard', 'headset', 'gpu', 'monitor']
};

/**
 * Tokenize a search string into lowercase word tokens
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Get all equivalent terms for a given token including synonyms
 */
function getExpandedTokens(token: string): Set<string> {
  const set = new Set<string>();
  const lower = token.toLowerCase();
  set.add(lower);

  // Direct lookup
  if (SYNONYMS[lower]) {
    SYNONYMS[lower].forEach(s => set.add(s.toLowerCase()));
  }

  // Reverse lookup
  Object.entries(SYNONYMS).forEach(([key, list]) => {
    if (list.includes(lower)) {
      set.add(key.toLowerCase());
      list.forEach(s => set.add(s.toLowerCase()));
    }
  });

  return set;
}

/**
 * Checks if a product matches a search query using token & synonym matching
 */
export function matchProductSearch(product: any, query: string): boolean {
  if (!query || !query.trim()) return true;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return true;

  // Build searchable text corpus from product fields
  const name = product.name || '';
  const brand = product.brand || '';
  const category = typeof product.category === 'string' ? product.category : product.category?.name || '';
  const subcategory = product.subcategory || '';
  const description = product.description || '';
  const tags = Array.isArray(product.tags) ? product.tags.join(' ') : (product.tags || '');
  const features = Array.isArray(product.features) ? product.features.join(' ') : (product.features || '');

  const corpusText = `${name} ${brand} ${category} ${subcategory} ${description} ${tags} ${features}`.toLowerCase();

  // Every token in the query must match either directly or via synonym
  return queryTokens.every(qToken => {
    const expanded = getExpandedTokens(qToken);
    
    // Check if any expanded synonym appears in the corpus
    for (const term of expanded) {
      if (corpusText.includes(term)) {
        return true;
      }
    }
    
    // Fuzzy prefix match fallback (e.g. "headph" matches "headphones")
    if (qToken.length >= 3 && corpusText.split(/\s+/).some(word => word.startsWith(qToken))) {
      return true;
    }

    return false;
  });
}

export const matchProductByTokens = matchProductSearch;
