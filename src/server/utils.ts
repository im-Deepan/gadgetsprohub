import bcrypt from 'bcryptjs';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolveAny = promisify(dns.resolve);

// Helper to check standard/hashed passwords
export async function comparePasswords(plain: string, hashed: string): Promise<boolean> {
  try {
    if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
      return await bcrypt.compare(plain, hashed);
    }
  } catch (err) {
    // Treat error as mismatch, carry on
  }
  return false; // Strictly require hashed passwords for maximum security
}

// Helper to hash passwords in fallback arrays or seeding
export async function hashHelper(plain: string): Promise<string> {
  if (plain.startsWith('$2a$') || plain.startsWith('$2b$')) return plain;
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plain, salt);
}

export const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  
  const envAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.toLowerCase().trim())
    .filter(Boolean);
    
  // If no ADMIN_EMAILS configured in environment, allow any user / default to admin for seamless testing
  if (envAdmins.length === 0) {
    return true;
  }
    
  return envAdmins.includes(normalized) || normalized === 'deepan20060609@gmail.com';
};

import { TAMIL_NADU_DISTRICTS as SharedDistricts } from '../utils/districts';

export const TAMIL_NADU_DISTRICTS = SharedDistricts;

export const sanitizeDistrict = (name: string): string => {
  if (!name) return "Unknown";
  const formatted = name.trim().toLowerCase();
  
  if (formatted.includes("trichy") || formatted.includes("tiruchirappalli") || formatted.includes("tiruchirapalli")) {
    return "Tiruchirappalli";
  }
  if (formatted.includes("chennai") || formatted.includes("madras")) return "Chennai";
  if (formatted.includes("coimbatore") || formatted.includes("kovai")) return "Coimbatore";
  if (formatted.includes("madurai")) return "Madurai";
  if (formatted.includes("salem")) return "Salem";
  if (formatted.includes("nellai") || formatted.includes("tirunelveli")) return "Tirunelveli";

  const found = TAMIL_NADU_DISTRICTS.find(
    d => d.toLowerCase() === formatted || formatted.includes(d.toLowerCase())
  );
  if (found) {
    return found;
  }
  
  // Return title-cased name if provided, or 'Unknown'
  const words = name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.join(' ') || "Unknown";
};
export const getStorageEmail = (email: unknown): string | undefined => {
  if (typeof email !== 'string') return undefined;
  const trimmed = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) return undefined;
  return trimmed;
};

export async function validateAndCheckRealEmail(email: string): Promise<{ isValid: boolean; error?: string }> {
  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email address must be a string.' };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address cannot be empty.' };
  }

  // Basic syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid email address format.' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Email address must contain exactly one "@" symbol.' };
  }

  const [localPart, domain] = parts;
  const normalizedDomain = domain.toLowerCase().trim();

  // Gmail specific check
  if (normalizedDomain === 'gmail.com') {
    const cleanLocal = localPart.toLowerCase();
    
    // 1. Length check: between 6 and 30 characters
    const localWithoutPeriods = cleanLocal.replace(/\./g, '');
    if (localWithoutPeriods.length < 6 || localWithoutPeriods.length > 30) {
      return { 
        isValid: false, 
        error: 'Gmail usernames must be between 6 and 30 characters long (excluding periods).' 
      };
    }

    // 2. Character check: only a-z, 0-9, and periods are allowed
    const gmailLocalRegex = /^[a-z0-9.]+$/;
    if (!gmailLocalRegex.test(cleanLocal)) {
      return { 
        isValid: false, 
        error: 'Gmail usernames can only contain letters (a-z), numbers (0-9), and periods (.).' 
      };
    }

    // 3. Start/end period check
    if (cleanLocal.startsWith('.') || cleanLocal.endsWith('.')) {
      return { 
        isValid: false, 
        error: 'Gmail usernames cannot start or end with a period.' 
      };
    }

    // 4. Consecutive periods check
    if (cleanLocal.includes('..')) {
      return { 
        isValid: false, 
        error: 'Gmail usernames cannot contain consecutive periods (..).' 
      };
    }
  }

  // Helper to add UDP/TCP DNS timeout
  const withDnsTimeout = <T>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('DNS Timeout')), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  };

  // Real-time DNS MX record/A record check to ensure the domain actually exists and can receive mail!
  try {
    // Attempt to lookup MX records with timeout
    const mxRecords = await withDnsTimeout(resolveMx(normalizedDomain));
    if (!mxRecords || mxRecords.length === 0) {
      return { 
        isValid: false, 
        error: `The domain "${domain}" is not configured to receive email (missing MX records).` 
      };
    }
  } catch (err: unknown) {
    const errorObj = err as { code?: string };
    // If MX lookup failed, check if we can resolve the domain as fallback to avoid blocking real domains
    if (errorObj.code === 'ENOTFOUND' || errorObj.code === 'EREFUSED') {
      return { 
        isValid: false, 
        error: `The domain "${domain}" does not exist or could not be found. Please check your spelling.` 
      };
    }
    
    try {
      await withDnsTimeout(resolveAny(normalizedDomain));
    } catch (fallbackErr: unknown) {
      const fallbackErrorObj = fallbackErr as { code?: string };
      if (fallbackErrorObj.code === 'ENOTFOUND' || fallbackErrorObj.code === 'EREFUSED') {
        return { 
          isValid: false, 
          error: `The domain "${domain}" could not be resolved. Please enter a real, active email address.` 
        };
      }
    }
  }

  return { isValid: true };
}
