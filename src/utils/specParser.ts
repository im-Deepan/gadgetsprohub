/**
 * Parses a specifications string in the format of "key1=value1; key2=value2"
 * into a Record<string, string>.
 */
export const parseSpecificationsString = (specsStr: any): Record<string, string> => {
  const obj: Record<string, string> = {};
  if (!specsStr) return obj;
  
  if (typeof specsStr === 'object') {
    if (specsStr instanceof Map) {
      specsStr.forEach((v, k) => {
        obj[String(k)] = String(v);
      });
    } else {
      Object.entries(specsStr).forEach(([k, v]) => {
        obj[k] = String(v);
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
        console.warn('Decode error', e);
        obj[key.trim()] = valueParts.join('=').trim();
      }
    } else if (key && key.trim()) {
      try {
        obj[decodeURIComponent(key.trim())] = 'Yes';
      } catch (e) {
        console.warn('Decode error', e);
        obj[key.trim()] = 'Yes';
      }
    }
  });
  
  return obj;
};
