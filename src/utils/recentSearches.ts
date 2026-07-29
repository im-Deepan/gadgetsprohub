import { safeGetItem, safeSetItem, safeRemoveItem } from './localStorage';

export const RECENT_SEARCHES_KEY = 'aff_recent_searches';
export const RECENT_SEARCHES_EVENT = 'aff_recent_searches_updated';

export const POPULAR_SEARCH_SUGGESTIONS = [
  'iPhone 15 Pro',
  'MacBook Air M3',
  'Noise Canceling Headphones',
  'OLED Smart TV',
  'Gaming Laptop',
  'Apple Watch',
  'Wireless Earphones',
  'Mechanical Keyboard',
  '4K Monitor',
  'Bluetooth Speaker'
];

export const getRecentSearches = (): string[] => {
  try {
    const raw = safeGetItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse recent searches:', err);
    return [];
  }
};

export const addRecentSearch = (query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return getRecentSearches();

  const current = getRecentSearches();
  // Case-insensitive deduplication, move new item to top
  const filtered = current.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...filtered].slice(0, 8);

  safeSetItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT, { detail: updated }));
  }

  return updated;
};

export const removeRecentSearch = (query: string): string[] => {
  const current = getRecentSearches();
  const updated = current.filter(s => s.toLowerCase() !== query.toLowerCase().trim());
  
  safeSetItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT, { detail: updated }));
  }

  return updated;
};

export const clearRecentSearches = (): void => {
  safeRemoveItem(RECENT_SEARCHES_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RECENT_SEARCHES_EVENT, { detail: [] }));
  }
};
