import { encryptSensitiveData, decryptSensitiveData, encryptObject, decryptObject } from '../utils/encryption';

describe('Cryptographic & Encryption Suite (AES-256-GCM)', () => {
  const sampleSecretKey = 'test-master-encryption-key-with-sufficient-entropy-12345';
  const sampleApiKey = 'sk-ant-api03-sample-ai-provider-token-987654321';
  const sampleConfig = {
    provider: 'gemini',
    apiKey: 'AIzaSyA_sample_gemini_key_123456789',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 2048
  };

  it('successfully encrypts and decrypts sensitive string payloads', () => {
    const encrypted = encryptSensitiveData(sampleApiKey, sampleSecretKey);
    expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    
    // Ensure ciphertext does not reveal plain text
    expect(encrypted).not.toContain('sk-ant-api03');

    const decrypted = decryptSensitiveData(encrypted, sampleSecretKey);
    expect(decrypted).toBe(sampleApiKey);
  });

  it('generates unique initialization vectors for identical plaintext (semantic security)', () => {
    const enc1 = encryptSensitiveData(sampleApiKey, sampleSecretKey);
    const enc2 = encryptSensitiveData(sampleApiKey, sampleSecretKey);

    expect(enc1).not.toBe(enc2);
    expect(decryptSensitiveData(enc1, sampleSecretKey)).toBe(sampleApiKey);
    expect(decryptSensitiveData(enc2, sampleSecretKey)).toBe(sampleApiKey);
  });

  it('rejects tampered ciphertext with an authentication error (GCM integrity guarantee)', () => {
    const encrypted = encryptSensitiveData(sampleApiKey, sampleSecretKey);
    const parts = encrypted.split(':');
    
    // Tamper with ciphertext
    const tamperedCiphertext = parts[3].slice(0, -4) + 'AAAA';
    const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertext}`;

    expect(() => {
      decryptSensitiveData(tamperedPayload, sampleSecretKey);
    }).toThrow();
  });

  it('rejects tampered authentication tags', () => {
    const encrypted = encryptSensitiveData(sampleApiKey, sampleSecretKey);
    const parts = encrypted.split(':');
    
    // Tamper with auth tag
    const tamperedTag = Buffer.from('invalid-auth-tag-16b').toString('base64');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedTag}:${parts[3]}`;

    expect(() => {
      decryptSensitiveData(tamperedPayload, sampleSecretKey);
    }).toThrow();
  });

  it('encrypts and decrypts structured objects seamlessly', () => {
    const encrypted = encryptObject(sampleConfig, sampleSecretKey);
    expect(typeof encrypted).toBe('string');

    const decrypted = decryptObject<typeof sampleConfig>(encrypted, sampleSecretKey);
    expect(decrypted).toEqual(sampleConfig);
    expect(decrypted?.apiKey).toBe(sampleConfig.apiKey);
  });

  it('returns null when decrypting invalid or corrupt structured objects', () => {
    const result = decryptObject('invalid-payload:not:a:token', sampleSecretKey);
    expect(result).toBeNull();
  });
});
