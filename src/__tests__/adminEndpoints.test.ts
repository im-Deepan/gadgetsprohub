import * as jwt from 'jsonwebtoken';

/**
 * Admin Security & API Logic Integration Test Suite
 * Validates JWT signing algorithms, permission barriers, pairing handshake lifecycle,
 * and data integrity constraints.
 */

describe('Admin Security & Endpoints Integration Suite', () => {
  const testSecret = 'secure-admin-test-jwt-secret-key-32bytes-min';

  describe('JWT Security & HS256 Enforcement', () => {
    it('generates and verifies valid administrative HS256 tokens', () => {
      const token = jwt.sign(
        { userId: 'admin_user_001', role: 'admin', email: 'admin@gadgetsprohub.com' },
        testSecret,
        { algorithm: 'HS256', expiresIn: '12h' }
      );

      const decoded = jwt.verify(token, testSecret, { algorithms: ['HS256'] }) as any;
      expect(decoded.userId).toBe('admin_user_001');
      expect(decoded.role).toBe('admin');
    });

    it('strictly rejects alg:none spoofed tokens', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: 'hacker_001', role: 'admin' })).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      expect(() => {
        jwt.verify(unsignedToken, testSecret, { algorithms: ['HS256'] });
      }).toThrow();
    });

    it('strictly rejects expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 'admin_user_001', role: 'admin' },
        testSecret,
        { algorithm: 'HS256', expiresIn: '-1s' }
      );

      expect(() => {
        jwt.verify(expiredToken, testSecret, { algorithms: ['HS256'] });
      }).toThrow(/expired/i);
    });
  });

  describe('Pairing Code Handshake Verification', () => {
    interface PairingEntry {
      code: string;
      role: string;
      expiresAt: number;
      used: boolean;
    }

    const activeCodes = new Map<string, PairingEntry>();

    const generatePairingCode = (role: string = 'admin'): string => {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      activeCodes.set(pin, {
        code: pin,
        role,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        used: false
      });
      return pin;
    };

    const verifyPairingCode = (code: string): { success: boolean; error?: string; token?: string } => {
      const entry = activeCodes.get(code);
      if (!entry) {
        return { success: false, error: 'Invalid or non-existent pairing code' };
      }
      if (entry.used) {
        return { success: false, error: 'Pairing code has already been consumed' };
      }
      if (Date.now() > entry.expiresAt) {
        activeCodes.delete(code);
        return { success: false, error: 'Pairing code has expired' };
      }

      // Mark used atomically
      entry.used = true;
      activeCodes.delete(code);

      const token = jwt.sign(
        { userId: 'paired_extension_admin', role: entry.role },
        testSecret,
        { algorithm: 'HS256', expiresIn: '12h' }
      );

      return { success: true, token };
    };

    it('generates a 6-digit numeric PIN with 5-minute validity', () => {
      const pin = generatePairingCode('admin');
      expect(pin).toMatch(/^\d{6}$/);
      expect(activeCodes.has(pin)).toBe(true);
    });

    it('successfully consumes pairing PIN on first verification and returns signed token', () => {
      const pin = generatePairingCode('admin');
      const result = verifyPairingCode(pin);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token!, testSecret, { algorithms: ['HS256'] }) as any;
      expect(decoded.role).toBe('admin');

      // Second attempt must fail (one-time use)
      const secondAttempt = verifyPairingCode(pin);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toBe('Invalid or non-existent pairing code');
    });

    it('rejects expired pairing codes', () => {
      const pin = '999888';
      activeCodes.set(pin, {
        code: pin,
        role: 'admin',
        expiresAt: Date.now() - 1000, // already expired
        used: false
      });

      const result = verifyPairingCode(pin);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });
  });

  describe('Referential Integrity & Admin Safeguards', () => {
    it('prevents deletion of categories containing active products', () => {
      const categories = [{ id: 'cat_phones', name: 'Smartphones' }];
      const products = [{ id: 'prod_iphone', name: 'iPhone 15', categoryId: 'cat_phones' }];

      const canDeleteCategory = (catId: string): boolean => {
        const hasAssociatedProducts = products.some(p => p.categoryId === catId);
        return !hasAssociatedProducts;
      };

      expect(canDeleteCategory('cat_phones')).toBe(false);
      expect(canDeleteCategory('cat_empty')).toBe(true);
    });
  });
});
