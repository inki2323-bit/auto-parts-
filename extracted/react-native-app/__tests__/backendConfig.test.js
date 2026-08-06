const { getApiBaseUrl } = require('../src/services/backendConfig');

describe('backendConfig', () => {
  it('returns the configured API base URL when provided', () => {
    process.env.API_BASE_URL = 'https://api.example.com';
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('falls back to the local emulator URL when no override exists', () => {
    delete process.env.API_BASE_URL;
    expect(getApiBaseUrl()).toBe('http://10.0.2.2:3000');
  });
});
