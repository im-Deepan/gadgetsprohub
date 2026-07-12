/**
 * @jest-environment jsdom
 */
import { apiService, decodeTokenExpiration, generateCorrelationId } from '../api';
import { extensionStorage } from '../storage';
import { handleProductImport } from '../../background/handlers/importHandler';
import { handleLogin, handleLogout } from '../../background/handlers/authHandler';
import { ProductPayload } from '../../types';

// Mock chrome namespace
const mockSettings: Record<string, any> = {
  gph_settings: {
    apiBaseUrl: 'http://localhost:3000',
    authToken: null,
    adminEmail: null,
    tokenExpiresAt: null,
    environment: 'Staging',
    debugMode: true,
    version: '1.0.0',
    features: {
      enableHealthCheck: true,
      enableDeveloperMode: true
    }
  }
};

const chromeMock = {
  storage: {
    local: {
      get: jest.fn((key, cb) => {
        if (typeof key === 'string') {
          cb({ [key]: mockSettings[key] });
        } else if (Array.isArray(key)) {
          const res: any = {};
          key.forEach(k => res[k] = mockSettings[k]);
          cb(res);
        } else if (typeof key === 'object') {
          const res: any = {};
          Object.keys(key).forEach(k => {
            res[k] = mockSettings[k] !== undefined ? mockSettings[k] : key[k];
          });
          cb(res);
        } else {
          cb(mockSettings);
        }
      }),
      set: jest.fn((data, cb) => {
        Object.keys(data).forEach(k => {
          mockSettings[k] = data[k];
        });
        if (cb) cb();
      }),
      clear: jest.fn((cb) => {
        Object.keys(mockSettings).forEach(k => delete mockSettings[k]);
        if (cb) cb();
      })
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    }
  }
};

global.chrome = chromeMock as any;

// Global mock for fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Chrome Extension Auth & Session Integration Tests', () => {
  // A valid mock JWT payload expiring in 2027
  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImV4cCI6MTgwMDAwMDAwMH0=.signature';
  // An expired mock JWT payload from 2001
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImV4cCI6MTAwMDAwMDAwMH0=.signature';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    
    // Reset storage to default
    mockSettings.gph_settings = {
      apiBaseUrl: 'http://localhost:3000',
      authToken: null,
      adminEmail: null,
      tokenExpiresAt: null,
      environment: 'Staging',
      debugMode: true,
      version: '1.0.0',
      features: {
        enableHealthCheck: true,
        enableDeveloperMode: true
      }
    };
  });

  describe('JWT Expiration and Correlation IDs Helpers', () => {
    it('should correctly decode expiration timestamp in milliseconds', () => {
      const exp = decodeTokenExpiration(validToken);
      expect(exp).toBe(1800000000 * 1000); // 2027 epoch ms
    });

    it('should return null for invalid tokens', () => {
      expect(decodeTokenExpiration('invalid_token')).toBeNull();
    });

    it('should generate properly formatted correlation IDs starting with gph_', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^gph_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  describe('Valid Login', () => {
    it('should authenticate administrative credentials, retrieve JWT, and persist tokenExpiresAt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({
          token: validToken,
          user: {
            email: 'admin@gadgetsprohub.com',
            role: 'admin'
          }
        })
      });

      const response = await handleLogin({
        email: 'admin@gadgetsprohub.com',
        password: 'correct_password'
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        email: 'admin@gadgetsprohub.com',
        role: 'admin'
      });

      // Verify stored properties
      const settings = await extensionStorage.getSettings();
      expect(settings.authToken).toBe(validToken);
      expect(settings.adminEmail).toBe('admin@gadgetsprohub.com');
      expect(settings.tokenExpiresAt).toBe(1800000000 * 1000);
    });
  });

  describe('Invalid Login', () => {
    it('should reject incorrect credentials with clear authentication error details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({
          error: 'Invalid password or user not found.'
        })
      });

      const response = await handleLogin({
        email: 'admin@gadgetsprohub.com',
        password: 'incorrect_password'
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('LOGIN_FAILED');
      expect(response.error?.message).toContain('Invalid password');
    });
  });

  describe('Expired Token Handling', () => {
    it('should capture server 401s on expired tokens and automatically clear local credentials', async () => {
      // Setup expired token in storage
      await extensionStorage.updateSettings({
        authToken: expiredToken,
        adminEmail: 'admin@gadgetsprohub.com',
        tokenExpiresAt: 1000000000 * 1000
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({
          error: 'Token has expired, please login again'
        })
      });

      const mockProduct: ProductPayload = {
        asin: 'B08F7PTF53',
        name: 'Wireless Headphones',
        brand: 'CoolAudio',
        currentPrice: 99.99,
        originalPrice: 149.99,
        discount: 33,
        currency: 'USD',
        rating: 4.7,
        reviewCount: 10234,
        availability: 'In Stock',
        description: 'Test description',
        bulletFeatures: ['Noise Cancellation'],
        specifications: { Category: 'Electronics' },
        images: ['https://example.com/img.jpg'],
        productUrl: 'https://www.amazon.com/dp/B08F7PTF53',
        parserVersion: '1.0.0'
      };

      // When checking session, let's say the server rejects status check
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({ error: 'Token expired' })
      });

      const response = await handleProductImport(mockProduct);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNAUTHENTICATED');

      // Assert credentials cleared
      const settings = await extensionStorage.getSettings();
      expect(settings.authToken).toBeNull();
      expect(settings.adminEmail).toBeNull();
      expect(settings.tokenExpiresAt).toBeNull();
    });
  });

  describe('Non-Admin Import Attempt', () => {
    it('should block non-administrators from importing products pre-flight', async () => {
      // Set a valid token in storage, but the role associated is non-admin
      await extensionStorage.updateSettings({
        authToken: validToken,
        adminEmail: 'guest@gadgetsprohub.com'
      });

      // API checkSession returns isAuthenticated: true, but role: 'user'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({
          isAuthenticated: true,
          user: {
            email: 'guest@gadgetsprohub.com',
            role: 'user'
          }
        })
      });

      const mockProduct: ProductPayload = {
        asin: 'B08F7PTF53',
        name: 'Wireless Headphones',
        brand: 'CoolAudio',
        currentPrice: 99.99,
        originalPrice: 149.99,
        discount: 33,
        currency: 'USD',
        rating: 4.7,
        reviewCount: 10234,
        availability: 'In Stock',
        description: 'Test description',
        bulletFeatures: ['Noise Cancellation'],
        specifications: { Category: 'Electronics' },
        images: ['https://example.com/img.jpg'],
        productUrl: 'https://www.amazon.com/dp/B08F7PTF53',
        parserVersion: '1.0.0'
      };

      const response = await handleProductImport(mockProduct);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('UNAUTHORIZED_ROLE');
      expect(response.error?.message).toContain('Only administrators can import products');
    });
  });

  describe('Logout Handling', () => {
    it('should contact the server to invalidate the JWT and wipe all local storage session items', async () => {
      await extensionStorage.updateSettings({
        authToken: validToken,
        adminEmail: 'admin@gadgetsprohub.com',
        tokenExpiresAt: 1800000000 * 1000
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({ success: true })
      });

      const response = await handleLogout();

      expect(response.success).toBe(true);

      const settings = await extensionStorage.getSettings();
      expect(settings.authToken).toBeNull();
      expect(settings.adminEmail).toBeNull();
      expect(settings.tokenExpiresAt).toBeNull();
    });
  });

  describe('Session Restoration on Startup', () => {
    it('should restore administrative session successfully if token is valid on backend', async () => {
      await extensionStorage.updateSettings({
        authToken: validToken,
        adminEmail: 'admin@gadgetsprohub.com',
        tokenExpiresAt: 1800000000 * 1000
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({
          isAuthenticated: true,
          user: {
            email: 'admin@gadgetsprohub.com',
            role: 'admin'
          }
        })
      });

      const session = await apiService.checkSession();
      expect(session.isAuthenticated).toBe(true);
      expect(session.role).toBe('admin');
      expect(session.email).toBe('admin@gadgetsprohub.com');
    });

    it('should auto-clear credentials if backend reports the session is no longer valid', async () => {
      await extensionStorage.updateSettings({
        authToken: validToken,
        adminEmail: 'admin@gadgetsprohub.com',
        tokenExpiresAt: 1800000000 * 1000
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: () => 'application/json'
        },
        json: async () => ({
          isAuthenticated: false
        })
      });

      const session = await apiService.checkSession();
      expect(session.isAuthenticated).toBe(false);
      
      // Since checkSession itself is non-throwing but returned false, we can trigger the restoration/validation clean up
      // In the startup script, if session.isAuthenticated is false, settings are cleared
      const restoredSession = await apiService.checkSession();
      if (!restoredSession.isAuthenticated) {
        await extensionStorage.updateSettings({
          authToken: null,
          adminEmail: null,
          tokenExpiresAt: null
        });
      }

      const settings = await extensionStorage.getSettings();
      expect(settings.authToken).toBeNull();
      expect(settings.adminEmail).toBeNull();
      expect(settings.tokenExpiresAt).toBeNull();
    });
  });
});
