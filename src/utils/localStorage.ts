export const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('LocalStorage quota exceeded. Cannot save:', key);
      try {
         localStorage.clear(); // Extreme fallback
         localStorage.setItem(key, value);
      } catch(innerE) {
         console.warn('LocalStorage still failing after clear.');
      }
    }
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('LocalStorage access blocked or unavailable:', key);
    return null;
  }
};

export const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('LocalStorage removal failed:', key);
  }
};
