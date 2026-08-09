import { Category, Product } from '../types';
import { apiFetch } from './apiClient';

let categoriesPromise: Promise<Category[]> | null = null;
let cachedCategories: Category[] | null = null;

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const fetchCategoriesShared = async (signal?: AbortSignal): Promise<Category[]> => {
  if (cachedCategories && cachedCategories.length > 0) {
    return cachedCategories;
  }
  if (categoriesPromise) {
    return categoriesPromise;
  }

  categoriesPromise = (async () => {
    try {
      const res = await apiFetch('/api/categories', { signal });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cachedCategories = data;
          return data;
        }
      }
      return [];
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('[category] Shared categories fetch warning:', err);
      }
      return cachedCategories || [];
    } finally {
      categoriesPromise = null;
    }
  })();

  return categoriesPromise;
};

export const getCategoryId = (category: unknown): string => {
  if (!category) return '';
  if (typeof category === 'object' && category !== null) {
    return String((category as Record<string, unknown>)._id || '');
  }
  return String(category);
};

export const getCategoryName = (category: unknown, categories: Category[] = []): string => {
  if (!category) return 'Uncategorized';
  if (typeof category === 'object' && category !== null) {
    const obj = category as Record<string, unknown>;
    if (typeof obj.name === 'string' && obj.name) {
      const name = toTitleCase(obj.name);
      if (['Shoes', 'Shoe', 'Footwear', 'Footwears'].includes(name)) return 'Lifestyle & Gear';
      return name;
    }
  }
  
  const catId = getCategoryId(category);
  const found = categories.find(c => String(c._id) === catId || c.slug === catId);
  if (found) {
    const name = toTitleCase(found.name);
    if (['Shoes', 'Shoe', 'Footwear', 'Footwears'].includes(name)) return 'Lifestyle & Gear';
    return name;
  }
  return 'Electronics';
};

/**
 * Normalizes taxonomy and filters out placeholder/auto-created categories
 * and categories with fewer than `minCount` published products from UI filter bars.
 */
export const filterCategoriesForUI = (
  categories: Category[],
  products?: Product[],
  minCount = 2
): Category[] => {
  if (!Array.isArray(categories)) return [];

  // 1. Filter out placeholder/debug categories
  const valid = categories.filter(cat => {
    const desc = (cat.description || '').toLowerCase();
    const name = (cat.name || '').toLowerCase();
    if (desc.includes('auto-created') || desc.includes('custom added curator category')) return false;
    if (name.includes('auto-created') || name.includes('custom added curator category')) return false;
    return true;
  });

  // 2. Title Case & Deduplicate near-identical category names
  const seenNames = new Set<string>();
  const deduplicated: Category[] = [];

  for (const cat of valid) {
    const titleCasedName = toTitleCase(cat.name.trim());
    const singularKey = titleCasedName.toLowerCase().replace(/s$/, '');

    if (!seenNames.has(singularKey)) {
      seenNames.add(singularKey);
      deduplicated.push({
        ...cat,
        name: titleCasedName
      });
    }
  }

  // 3. If products array is provided, hide categories with fewer than `minCount` published products
  if (products && Array.isArray(products) && products.length > 0) {
    return deduplicated.filter(cat => {
      const catId = String(cat._id);
      const catSlug = cat.slug;

      const count = products.filter(p => {
        const pCatId = getCategoryId(p.category);
        const pCatSlug = typeof p.category === 'object' && p.category ? (p.category as any).slug : String(p.category);
        return pCatId === catId || pCatId === catSlug || pCatSlug === catSlug;
      }).length;

      return count >= minCount;
    });
  }

  return deduplicated;
};
