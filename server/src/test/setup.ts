// Polyfill for crypto global
Object.defineProperty(global, 'crypto', {
  value: require('crypto').webcrypto,
  writable: true,
  configurable: true
});

// Set required environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret';
process.env.MEETING_BAAS_API_KEY = 'test-meeting-baas-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_1234567890abcdef';
