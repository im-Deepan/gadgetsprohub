/**
 * @jest-environment jsdom
 */
import { routeMessage, isInternalExtensionContext, isAuthorizedStoreTabContext } from '../router';
import { apiService } from '../../services/api';
import { extensionStorage } from '../../services/storage';

const extensionId = 'gadgetsprohub-test-ext';

// Mock apiService methods and helpers
jest.mock('../../services/api', () => ({
  apiService: {
    checkSession: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    importProduct: jest.fn(),
    checkDuplicate: jest.fn(),
    getImportHistory: jest.fn(),
    getImportAnalytics: jest.fn()
  },
  decodeTokenExpiration: jest.fn(() => 1800000000000),
  generateCorrelationId: jest.fn(() => 'gph_test_correlation_id')
}));

// Mock storage
jest.mock('../../services/storage', () => ({
  extensionStorage: {
    getAuthToken: jest.fn(),
    getApiUrl: jest.fn(),
    updateSettings: jest.fn(),
    getSettings: jest.fn(),
    setSessionToken: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  }
}));

describe('Background Router & Messaging Pipeline', () => {
  const internalSender: chrome.runtime.MessageSender = {
    id: extensionId,
    url: `chrome-extension://${extensionId}/popup.html`
  };

  const storeTabSender: chrome.runtime.MessageSender = {
    id: extensionId,
    url: 'https://www.amazon.com/dp/B08N5WRWNW',
    tab: { id: 101 } as chrome.tabs.Tab
  };

  const unauthorizedSender: chrome.runtime.MessageSender = {
    id: 'malicious-extension-id',
    url: 'https://evil-site.com'
  };

  const untrustedTabSender: chrome.runtime.MessageSender = {
    id: extensionId,
    url: 'https://untrusted-phishing-store.com/item',
    tab: { id: 202 } as chrome.tabs.Tab
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Context and Origin Verification', () => {
    it('correctly identifies internal extension contexts (popup / background)', () => {
      expect(isInternalExtensionContext(internalSender)).toBe(true);
      expect(isInternalExtensionContext({ id: extensionId })).toBe(true); // background context without tab
      expect(isInternalExtensionContext(storeTabSender)).toBe(false);
      expect(isInternalExtensionContext(unauthorizedSender)).toBe(false);
    });

    it('correctly identifies authorized store tab contexts', () => {
      expect(isAuthorizedStoreTabContext(storeTabSender)).toBe(true);
      expect(isAuthorizedStoreTabContext({
        id: extensionId,
        url: 'https://www.amazon.in/dp/B09G9FPHY6',
        tab: { id: 102 } as chrome.tabs.Tab
      })).toBe(true);
      expect(isAuthorizedStoreTabContext({
        id: extensionId,
        url: 'https://www.amazon.co.uk/dp/B09G9FPHY6',
        tab: { id: 103 } as chrome.tabs.Tab
      })).toBe(true);
      expect(isAuthorizedStoreTabContext(untrustedTabSender)).toBe(false);
      expect(isAuthorizedStoreTabContext(internalSender)).toBe(false);
    });
  });

  describe('Security and Permission Boundary Enforcement', () => {
    it('rejects malformed messages', (done) => {
      routeMessage(null as any, internalSender, (response) => {
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('INVALID_MESSAGE_STRUCTURE');
        done();
      });
    });

    it('rejects messages from unauthorized sender extension IDs', (done) => {
      routeMessage({ action: 'GET_SESSION_STATUS' }, unauthorizedSender, (response) => {
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('UNAUTHORIZED_SENDER_ID');
        done();
      });
    });

    it('blocks content script tabs from calling privileged internal actions', (done) => {
      routeMessage({ action: 'SET_SESSION_TOKEN', payload: { token: 'fake' } }, storeTabSender, (response) => {
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('UNAUTHORIZED_PRIVILEGE_LEVEL');
        done();
      });
    });

    it('rejects messages from untrusted tab origins', (done) => {
      routeMessage({ action: 'CHECK_DUPLICATE_PRODUCT', payload: 'B08N5WRWNW' }, untrustedTabSender, (response) => {
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('UNAUTHORIZED_TAB_ORIGIN');
        done();
      });
    });
  });

  describe('Internal Action Routing', () => {
    it('routes GET_SESSION_STATUS and calls apiService.checkSession', (done) => {
      (apiService.checkSession as jest.Mock).mockResolvedValueOnce({
        isAuthenticated: true,
        role: 'admin',
        email: 'admin@gadgetsprohub.com'
      });

      const handled = routeMessage({ action: 'GET_SESSION_STATUS' }, internalSender, (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.isAuthenticated).toBe(true);
        expect(response.data?.role).toBe('admin');
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes SET_SESSION_TOKEN and updates session storage safely', (done) => {
      (extensionStorage.setSessionToken as jest.Mock).mockResolvedValueOnce(undefined);
      (extensionStorage.updateSettings as jest.Mock).mockResolvedValueOnce(undefined);

      const handled = routeMessage({
        action: 'SET_SESSION_TOKEN',
        payload: { token: 'mock.jwt.token', email: 'admin@gadgetsprohub.com' }
      }, internalSender, (response) => {
        expect(response.success).toBe(true);
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes EXECUTE_LOGIN and returns auth result', (done) => {
      (apiService.login as jest.Mock).mockResolvedValueOnce({
        token: 'auth.token.123',
        user: { role: 'admin', email: 'admin@gadgetsprohub.com' }
      });
      (extensionStorage.setSessionToken as jest.Mock).mockResolvedValueOnce(undefined);
      (extensionStorage.updateSettings as jest.Mock).mockResolvedValueOnce(undefined);

      const handled = routeMessage({
        action: 'EXECUTE_LOGIN',
        payload: { email: 'admin@gadgetsprohub.com', password: 'password123' }
      }, internalSender, (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.email).toBe('admin@gadgetsprohub.com');
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes EXECUTE_LOGOUT and clears session', (done) => {
      (apiService.logout as jest.Mock).mockResolvedValueOnce(undefined);

      const handled = routeMessage({ action: 'EXECUTE_LOGOUT' }, internalSender, (response) => {
        expect(response.success).toBe(true);
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes CHECK_DUPLICATE_PRODUCT', (done) => {
      (apiService.checkDuplicate as jest.Mock).mockResolvedValueOnce({
        success: true,
        exists: true,
        product: { asin: 'B08N5WRWNW', title: 'Test Laptop' }
      });

      const handled = routeMessage({
        action: 'CHECK_DUPLICATE_PRODUCT',
        payload: 'B08N5WRWNW'
      }, internalSender, (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.exists).toBe(true);
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes GET_IMPORT_HISTORY', (done) => {
      (apiService.getImportHistory as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [{ asin: 'B08N5WRWNW' }],
        pagination: { total: 1, page: 1, limit: 10, pages: 1 }
      });

      const handled = routeMessage({ action: 'GET_IMPORT_HISTORY', payload: { page: 1 } }, internalSender, (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.data).toHaveLength(1);
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes GET_IMPORT_ANALYTICS', (done) => {
      (apiService.getImportAnalytics as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { totalImports: 42, successfulImports: 40, failedImports: 2 }
      });

      const handled = routeMessage({ action: 'GET_IMPORT_ANALYTICS' }, internalSender, (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.data?.totalImports).toBe(42);
        done();
      });

      expect(handled).toBe(true);
    });

    it('routes BULK_IMPORT_STATUS', (done) => {
      const handled = routeMessage({ action: 'BULK_IMPORT_STATUS' }, internalSender, (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.jobId).toBe('job_123');
        done();
      });

      expect(handled).toBe(true);
    });

    it('handles unsupported actions gracefully', (done) => {
      const handled = routeMessage({ action: 'UNKNOWN_ACTION' as any }, internalSender, (response) => {
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('UNSUPPORTED_ACTION');
        done();
      });

      expect(handled).toBe(false);
    });
  });
});
