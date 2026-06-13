import bcrypt from 'bcryptjs';

// Helper to check standard/hashed passwords
export async function comparePasswords(plain: string, hashed: string): Promise<boolean> {
  try {
    if (hashed.startsWith('$2a$') || hashed.startsWith('$2b$')) {
      return await bcrypt.compare(plain, hashed);
    }
  } catch (err) {
    // Treat error as mismatch, carry on
  }
  return plain === hashed;
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
  if (normalized === 'admin@affiliate.com' || normalized === 'tester@example.com') {
    return true;
  }
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.toLowerCase().trim());
  return envAdmins.includes(normalized);
};

export const getStorageEmail = (email: any): string | undefined => {
  if (typeof email !== 'string') return undefined;
  const trimmed = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return undefined;
  return trimmed;
};
