/**
 * Standardized slug generation utility
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50)
    .replace(/(^-|-$)+/g, ''); // Cap at 50 chars and trim leading/trailing hyphens AFTER slicing
};
