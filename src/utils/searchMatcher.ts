/**
 * Advanced Search Matcher with Domain Isolation, Token Weighting, and Precise Synonym Expansion
 */

// Tight, category-specific synonym dictionary (no broad words like 'wireless', 'audio', or 'device'!)
const SYNONYMS: Record<string, string[]> = {
  // Audio synonyms
  headphones: ['headphone', 'headset', 'earbuds', 'earphone', 'earphones', 'tws', 'airpods', 'over-ear', 'in-ear'],
  headset: ['headphones', 'headphone', 'earbuds', 'earphone', 'tws'],
  earbuds: ['headphones', 'headphone', 'headset', 'earphone', 'tws', 'airpods', 'buds'],
  tws: ['earbuds', 'headphones', 'earphone', 'airpods'],

  // Mobile / Phone synonyms
  phone: ['smartphone', 'mobile', 'cellular', 'android', 'iphone'],
  smartphone: ['phone', 'mobile', 'cellular', 'android', 'iphone'],
  mobile: ['phone', 'smartphone', 'cellular', 'handset'],

  // Computing synonyms
  laptop: ['notebook', 'macbook', 'pc', 'ultrabook'],
  notebook: ['laptop', 'macbook', 'pc', 'ultrabook'],

  // Wearable synonyms
  watch: ['smartwatch', 'band', 'fitness tracker'],
  smartwatch: ['watch', 'band', 'fitness tracker'],

  // Footwear synonyms
  shoe: ['shoes', 'sneaker', 'sneakers', 'footwear', 'bata', 'formal', 'oxford', 'boots'],
  shoes: ['shoe', 'sneakers', 'footwear', 'bata', 'formal', 'oxford', 'boots'],
  footwear: ['shoe', 'shoes', 'sneakers', 'bata'],

  // Peripherals
  mouse: ['gaming mouse', 'pointing device'],
  keyboard: ['gaming keyboard', 'mechanical keyboard']
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
 * Get all equivalent terms for a given token including tight synonyms
 */
function getExpandedTokens(token: string): Set<string> {
  const set = new Set<string>();
  const lower = token.toLowerCase();
  set.add(lower);

  if (SYNONYMS[lower]) {
    SYNONYMS[lower].forEach(s => set.add(s.toLowerCase()));
  }

  Object.entries(SYNONYMS).forEach(([key, list]) => {
    if (list.includes(lower)) {
      set.add(key.toLowerCase());
      list.forEach(s => set.add(s.toLowerCase()));
    }
  });

  return set;
}

/**
 * Checks if a product matches a search query using domain isolation & weighted matching
 */
export function matchProductSearch(product: any, query: string): boolean {
  if (!query || !query.trim()) return true;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return true;

  const name = (product.name || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const category = (typeof product.category === 'string' ? product.category : product.category?.name || '').toLowerCase();
  const subcategory = (product.subcategory || '').toLowerCase();
  const tags = Array.isArray(product.tags) ? product.tags.join(' ').toLowerCase() : String(product.tags || '').toLowerCase();
  const description = (product.description || '').toLowerCase();

  const titleAndCatText = `${name} ${brand} ${category} ${subcategory} ${tags}`;

  // Domain Isolation Guard: Prevent cross-category matches
  const queryLower = query.toLowerCase();
  const isAudioQuery = queryTokens.some(t => ['headphones', 'headphone', 'headset', 'earbuds', 'earphone', 'tws', 'airpods', 'anc'].includes(t));
  const isFootwearQuery = queryTokens.some(t => ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'bata', 'oxford', 'boots'].includes(t));
  const isPhoneQuery = queryTokens.some(t => ['phone', 'smartphone', 'mobile', 'cellular'].includes(t));

  if (isAudioQuery) {
    if (category.includes('footwear') || category.includes('shoe') || brand.includes('bata') || name.includes('bata') || name.includes('shoes')) {
      return false; // Never return shoes when searching for audio/headphones!
    }
  }

  if (isFootwearQuery) {
    if (category.includes('audio') || category.includes('headphone') || category.includes('phone') || name.includes('headset')) {
      return false; // Never return audio/phones when searching for shoes!
    }
  }

  if (isPhoneQuery) {
    if (category.includes('footwear') || category.includes('shoe') || brand.includes('bata')) {
      return false; // Never return shoes when searching for phones!
    }
  }

  // Every token in the query must have a valid match in primary fields or title/category/brand
  return queryTokens.every(qToken => {
    const expanded = getExpandedTokens(qToken);

    // 1. Check title/brand/category/subcategory/tags match
    for (const term of expanded) {
      if (titleAndCatText.includes(term)) {
        return true;
      }
    }

    // 2. Check prefix match on name or brand
    if (qToken.length >= 3) {
      const words = titleAndCatText.split(/\s+/);
      if (words.some(w => w.startsWith(qToken))) {
        return true;
      }
    }

    // 3. Fallback to description match ONLY if token is 4+ chars and not a generic noise word
    if (qToken.length >= 4 && !['with', 'best', 'gear', 'pro', 'lite', 'plus', 'free'].includes(qToken)) {
      for (const term of expanded) {
        if (description.includes(term)) {
          return true;
        }
      }
    }

    return false;
  });
}

export const matchProductByTokens = matchProductSearch;
