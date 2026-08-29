// Global Chrome Mock for Jest Environment
const extensionId = 'gadgetsprohub-test-ext';

const mockSettings: Record<string, any> = {
  gph_settings: {
    apiBaseUrl: 'http://localhost:3000',
    authToken: null,
    adminEmail: null,
    tokenExpiresAt: null,
    environment: 'Staging',
    debugMode: true,
    version: '1.0.0'
  },
  currentBulkJob: {
    jobId: 'job_123',
    totalItems: 10,
    processedItems: 5,
    status: 'running'
  }
};

const chromeMock = {
  runtime: {
    id: extensionId,
    getURL: (path: string) => `chrome-extension://${extensionId}/${path || ''}`,
    sendMessage: jest.fn((msg, cb) => {
      if (typeof cb === 'function') cb({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn((queryInfo, cb) => {
      const tabs = [{ id: 101, url: 'https://www.amazon.com/dp/B08N5WRWNW' }];
      if (typeof cb === 'function') cb(tabs);
      return Promise.resolve(tabs);
    }),
    sendMessage: jest.fn((tabId, msg, cb) => {
      const resp = { success: true, data: { status: 'ALIVE', isAmazon: true } };
      if (typeof cb === 'function') cb(resp);
      return Promise.resolve(resp);
    }),
    create: jest.fn((props, cb) => {
      const tab = { id: 202, ...props };
      if (typeof cb === 'function') cb(tab);
      return Promise.resolve(tab);
    }),
    remove: jest.fn((tabId, cb) => {
      if (typeof cb === 'function') cb();
      return Promise.resolve();
    }),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  notifications: {
    create: jest.fn((opts, cb) => {
      if (typeof cb === 'function') cb('notification_id_123');
      return Promise.resolve('notification_id_123');
    })
  },
  storage: {
    session: {
      get: jest.fn((key, cb) => {
        let res: any = {};
        if (typeof key === 'string') res = { [key]: (mockSettings as any)[key] };
        else if (Array.isArray(key)) key.forEach(k => res[k] = (mockSettings as any)[k]);
        else if (typeof key === 'object') Object.keys(key).forEach(k => res[k] = (mockSettings as any)[k] !== undefined ? (mockSettings as any)[k] : key[k]);
        else res = mockSettings;

        if (typeof cb === 'function') cb(res);
        return Promise.resolve(res);
      }),
      set: jest.fn((data, cb) => {
        Object.assign(mockSettings, data);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      }),
      remove: jest.fn((key, cb) => {
        if (typeof key === 'string') delete (mockSettings as any)[key];
        else if (Array.isArray(key)) key.forEach(k => delete (mockSettings as any)[k]);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      })
    },
    local: {
      get: jest.fn((key, cb) => {
        let res: any = {};
        if (typeof key === 'string') res = { [key]: mockSettings[key] };
        else if (Array.isArray(key)) key.forEach(k => res[k] = mockSettings[k]);
        else if (typeof key === 'object') Object.keys(key).forEach(k => res[k] = mockSettings[k] !== undefined ? mockSettings[k] : key[k]);
        else res = mockSettings;

        if (typeof cb === 'function') cb(res);
        return Promise.resolve(res);
      }),
      set: jest.fn((data, cb) => {
        Object.assign(mockSettings, data);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      }),
      remove: jest.fn((key, cb) => {
        if (typeof key === 'string') delete mockSettings[key];
        else if (Array.isArray(key)) key.forEach(k => delete mockSettings[k]);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      }),
      clear: jest.fn((cb) => {
        Object.keys(mockSettings).forEach(k => delete mockSettings[k]);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      })
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

(global as any).chrome = chromeMock;
