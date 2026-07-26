const METADATA_SPEC_KEYS = new Set([
  'asin',
  'asin code',
  'asin_code',
  'source',
  'source link',
  'source_link',
  'import link',
  'import_link',
  'imported via',
  'imported_via',
  'status',
  'currency',
  'gtin',
  'sku',
  'sku-series',
  'originalid',
  'original_id',
  'source url',
  'source_url'
]);

/**
 * Checks if a specification key is an internal metadata field (e.g. ASIN, Source, Import Link)
 * rather than a genuine physical/technical product specification.
 */
export const isMetadataSpecKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return true;
  const lowerKey = key.trim().toLowerCase();
  if (METADATA_SPEC_KEYS.has(lowerKey)) return true;
  if (lowerKey === 'asin' || lowerKey.startsWith('asin ') || lowerKey.endsWith(' asin')) return true;
  if (lowerKey === 'imported via' || lowerKey.startsWith('imported via')) return true;
  if (lowerKey === 'import link' || lowerKey === 'import status') return true;
  return false;
};

/**
 * Filters a specifications record, removing internal metadata keys.
 */
export const cleanSpecificationsObj = (specs: Record<string, string>): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!specs || typeof specs !== 'object') return result;
  
  Object.entries(specs).forEach(([k, v]) => {
    if (k && v !== undefined && v !== null && !isMetadataSpecKey(k)) {
      result[k.trim()] = String(v).trim();
    }
  });
  return result;
};

/**
 * Parses a specifications string or object into a clean Record<string, string>.
 */
export const parseSpecificationsString = (specsStr: any): Record<string, string> => {
  const rawObj: Record<string, string> = {};
  if (!specsStr) return rawObj;
  
  if (Array.isArray(specsStr)) {
    specsStr.forEach((item, index) => {
      if (typeof item === 'string') {
        const [k, ...vParts] = item.split('=');
        if (k && vParts.length > 0) {
          rawObj[k.trim()] = vParts.join('=').trim();
        } else if (item.trim()) {
          rawObj[`Specification ${index + 1}`] = item.trim();
        }
      } else if (item && typeof item === 'object') {
        if ('key' in item && 'value' in item) {
          rawObj[String(item.key)] = String(item.value);
        } else if ('name' in item && 'value' in item) {
          rawObj[String(item.name)] = String(item.value);
        } else {
          Object.entries(item).forEach(([k, v]) => {
            if (k && v !== undefined && v !== null) {
              rawObj[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
          });
        }
      }
    });
    return cleanSpecificationsObj(rawObj);
  }

  if (typeof specsStr === 'object') {
    if (specsStr instanceof Map) {
      specsStr.forEach((v, k) => {
        if (k !== undefined && k !== null && v !== undefined && v !== null) {
          rawObj[String(k)] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      });
    } else {
      Object.entries(specsStr).forEach(([k, v]) => {
        if (k !== undefined && k !== null && v !== undefined && v !== null) {
          rawObj[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      });
    }
    return cleanSpecificationsObj(rawObj);
  }
  
  if (typeof specsStr !== 'string') {
    return rawObj;
  }
  
  specsStr.split(';').forEach((pStr: string) => {
    const [key, ...valueParts] = pStr.split('=');
    if (key && valueParts.length > 0) {
      try {
        rawObj[decodeURIComponent(key.trim())] = decodeURIComponent(valueParts.join('=').trim());
      } catch (e) {
        rawObj[key.trim()] = valueParts.join('=').trim();
      }
    } else if (key && key.trim()) {
      try {
        rawObj[decodeURIComponent(key.trim())] = 'Yes';
      } catch (e) {
        rawObj[key.trim()] = 'Yes';
      }
    }
  });
  
  return cleanSpecificationsObj(rawObj);
};
