import { Category } from '../types';

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
    if (typeof obj.name === 'string') return obj.name;
  }
  
  const catId = getCategoryId(category);
  const found = categories.find(c => String(c._id) === catId);
  return found ? found.name : 'Selection Line';
};
