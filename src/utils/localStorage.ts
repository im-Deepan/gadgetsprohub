export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      try {
        // Try removing non-essential items first
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (k.startsWith('aff_recent_') || k.startsWith('aff_history_') || k.includes('recent')) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(key, value);
        return true;
      } catch (innerE) {
        try {
          // If still failing, keep only auth token, preferred city, etc.
          const keys = Object.keys(localStorage);
          for (const k of keys) {
            if (k !== 'aff_token' && k !== 'aff_preferred_city' && k !== key) {
              localStorage.removeItem(k);
            }
          }
          localStorage.setItem(key, value);
          return true;
        } catch (finalE) {
          console.error('localStorage full and could not free enough space', finalE);
          return false;
        }
      }
    }
    return false;
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[localStorage] Failed to read key "${key}":`, e);
    return null;
  }
};

export const safeRemoveItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[localStorage] Failed to remove key "${key}":`, e);
    return false;
  }
};
