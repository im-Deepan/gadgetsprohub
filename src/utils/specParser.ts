export const decodeHTMLEntities = (text: string): string => {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

const METADATA_SPEC_KEYS = new Set([
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
  'originalid',
  'original_id',
  'source url',
  'source_url'
]);

/**
 * Checks if a specification key is an internal metadata field (e.g. Source, Import Link)
 * rather than a genuine physical/technical product specification.
 */
export const isMetadataSpecKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return true;
  const lowerKey = key.trim().toLowerCase();
  if (METADATA_SPEC_KEYS.has(lowerKey)) return true;
  if (lowerKey === 'imported via' || lowerKey.startsWith('imported via')) return true;
  if (lowerKey === 'import link' || lowerKey === 'import status') return true;
  return false;
};

/**
 * Detects if a text string contains raw JavaScript, tracking handlers, or scraped event listener fragments.
 */
export const isScriptOrTrackingCode = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  const s = text.trim();
  if (
    /^(var|let|const|function|window\.|document\.|P\.when|P\.register|dpAcr|aPage|ue_|amzn|amazon|jQuery|\$|eval\(|void\(|javascript:)/i.test(s) ||
    /var\s+[a-zA-Z0-9_$]+/i.test(s) ||
    /P\.when\(/i.test(s) ||
    /dpAcrHasRegistered/i.test(s) ||
    /onload|onclick|onerror|onmouseover/i.test(s) ||
    /<script/i.test(s) ||
    /\{\s*["']?[a-zA-Z0-9_$]+["']?\s*:/i.test(s) ||
    /function\s*\(/i.test(s)
  ) {
    return true;
  }
  return false;
};

/**
 * Filters a specifications record, removing internal metadata keys, raw scripts, and tracking code.
 */
export const cleanSpecificationsObj = (specs: Record<string, string>): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!specs || typeof specs !== 'object') return result;
  
  Object.entries(specs).forEach(([k, v]) => {
    if (k && v !== undefined && v !== null && !isMetadataSpecKey(k)) {
      const cleanKey = decodeHTMLEntities(k.trim());
      const cleanVal = decodeHTMLEntities(String(v).trim());

      // Reject keys or values that contain JavaScript code or tracking fragments
      if (
        !isScriptOrTrackingCode(cleanKey) &&
        !isScriptOrTrackingCode(cleanVal) &&
        cleanKey.length <= 150 &&
        cleanVal.length <= 500
      ) {
        // Strip any remaining HTML tags
        const sanitizedKey = cleanKey.replace(/<[^>]*>?/gm, '');
        const sanitizedVal = cleanVal.replace(/<[^>]*>?/gm, '');
        if (sanitizedKey && sanitizedVal) {
          result[sanitizedKey] = sanitizedVal;
        }
      }
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
