/**
 * Test Setup - Vitest configuration for React Testing Library
 */

import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';
import { useAuthStore } from '../stores/authStore';

// Mock user for tests
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  tenantId: 'tenant-1',
  roles: ['Admin'],
};

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

beforeEach(() => {
  // Initialize auth store with mock user for tests
  useAuthStore.setState({
    user: mockUser,
    accessToken: 'mock-jwt-token',
    isAuthenticated: true,
    isLoading: false,
    hasHydrated: true,
  });
});

afterEach(() => {
  // Clean up DOM after each test
  cleanup();
  // Reset handlers between tests
  server.resetHandlers();
  // Reset auth store
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    hasHydrated: true,
  });
});

afterAll(() => {
  server.close();
});

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollTo
window.scrollTo = () => {};

// Mock URL.createObjectURL for export functionality
URL.createObjectURL = () => 'mock-url';
URL.revokeObjectURL = () => {};
