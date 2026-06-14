export const getCategoryId = (category: any): string => {
  if (!category) return '';
  return typeof category === 'object' ? String(category._id || '') : String(category);
};

export const getCategoryName = (category: any, categories: any[] = []): string => {
  if (!category) return 'Uncategorized';
  if (typeof category === 'object' && category.name) return category.name;
  
  const catId = getCategoryId(category);
  const found = categories.find(c => String(c._id) === catId);
  return found ? found.name : 'Selection Line';
};
