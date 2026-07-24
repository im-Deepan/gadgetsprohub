/**
 * Parses a specifications string in the format of "key1=value1; key2=value2"
 * into a Record<string, string>.
 */
export const parseSpecificationsString = (specsStr: any): Record<string, string> => {
  const obj: Record<string, string> = {};
  if (!specsStr) return obj;
  
  if (Array.isArray(specsStr)) {
    specsStr.forEach((item, index) => {
      if (typeof item === 'string') {
        const [k, ...vParts] = item.split('=');
        if (k && vParts.length > 0) {
          obj[k.trim()] = vParts.join('=').trim();
        } else if (item.trim()) {
          obj[`Specification ${index + 1}`] = item.trim();
        }
      } else if (item && typeof item === 'object') {
        if ('key' in item && 'value' in item) {
          obj[String(item.key)] = String(item.value);
        } else if ('name' in item && 'value' in item) {
          obj[String(item.name)] = String(item.value);
        } else {
          Object.entries(item).forEach(([k, v]) => {
            if (k && v !== undefined && v !== null) {
              obj[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
          });
        }
      }
    });
    return obj;
  }

  if (typeof specsStr === 'object') {
    if (specsStr instanceof Map) {
      specsStr.forEach((v, k) => {
        if (k !== undefined && k !== null && v !== undefined && v !== null) {
          obj[String(k)] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      });
    } else {
      Object.entries(specsStr).forEach(([k, v]) => {
        if (k !== undefined && k !== null && v !== undefined && v !== null) {
          obj[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      });
    }
    return obj;
  }
  
  if (typeof specsStr !== 'string') {
    return obj;
  }
  
  specsStr.split(';').forEach((pStr: string) => {
    const [key, ...valueParts] = pStr.split('=');
    if (key && valueParts.length > 0) {
      try {
        obj[decodeURIComponent(key.trim())] = decodeURIComponent(valueParts.join('=').trim());
      } catch (e) {
        obj[key.trim()] = valueParts.join('=').trim();
      }
    } else if (key && key.trim()) {
      try {
        obj[decodeURIComponent(key.trim())] = 'Yes';
      } catch (e) {
        obj[key.trim()] = 'Yes';
      }
    }
  });
  
  return obj;
};
