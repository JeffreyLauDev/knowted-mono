import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            id: 'test-subscription',
            unsubscribe: vi.fn()
          }
        }
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia if window exists
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Configure React Query for tests to prevent hanging
// This disables refetchInterval and reduces retries to prevent tests from hanging
global.testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchInterval: false, // Disable refetchInterval in tests
      gcTime: 0, // Immediately garbage collect
    },
    mutations: {
      retry: false,
    },
  },
});

// Clean up test data after each test
afterEach(async () => {
  // Clear all mocks
  vi.clearAllMocks();
  // Clear React Query cache
  global.testQueryClient.clear();
});

// Global setup before all tests
beforeAll(async () => {
  // Add any global setup logic here
});

// Global cleanup after all tests
afterAll(async () => {
  // Add any global cleanup logic here
}); 
