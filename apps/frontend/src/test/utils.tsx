/**
 * Test Utilities
 * Provides renderWithProviders and other helpers for testing React components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

// Mock permissions for testing - full admin access
const mockPermissions = [
  'resources:create',
  'resources:read',
  'resources:update',
  'resources:delete',
  'projects:create',
  'projects:read',
  'projects:update',
  'projects:delete',
  'allocations:create',
  'allocations:read',
  'allocations:update',
  'allocations:delete',
  'allocations:approve',
  'timesheets:create',
  'timesheets:read',
  'timesheets:update',
  'timesheets:approve',
  'clients:create',
  'clients:read',
  'clients:update',
  'clients:delete',
  'contracts:create',
  'contracts:read',
  'contracts:update',
  'contracts:delete',
  'contracts:approve',
  'reports:read',
  'reports:export',
  'analytics:read',
  'settings:read',
  'settings:update',
  'roles:create',
  'roles:read',
  'roles:update',
  'roles:delete',
  'roles:assign',
  'requests:create',
  'requests:read',
  'requests:update',
  'requests:approve',
  'documents:create',
  'documents:read',
  'documents:update',
  'documents:delete',
];

// ═══════════════════════════════════════════════════════════════════════
// QUERY CLIENT FOR TESTS
// ═══════════════════════════════════════════════════════════════════════

export const createTestQueryClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  
  // Pre-populate permissions query so Can components work immediately
  client.setQueryData(['user-permissions'], {
    permissions: mockPermissions,
    roles: ['Admin'],
  });
  
  return client;
};

// ═══════════════════════════════════════════════════════════════════════
// PROVIDERS WRAPPER
// ═══════════════════════════════════════════════════════════════════════

interface WrapperProps {
  children: React.ReactNode;
}

interface TestWrapperOptions {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

const createWrapper = (options: TestWrapperOptions = {}) => {
  const { initialEntries = ['/'], queryClient = createTestQueryClient() } = options;

  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </CurrencyProvider>
    </QueryClientProvider>
  );

  return Wrapper;
};

// ═══════════════════════════════════════════════════════════════════════
// RENDER WITH PROVIDERS
// ═══════════════════════════════════════════════════════════════════════

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  queryClient: QueryClient;
}

/**
 * Custom render function that wraps component with all necessary providers
 * Returns render result plus userEvent instance and queryClient for testing
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): CustomRenderResult => {
  const { initialEntries, queryClient = createTestQueryClient(), ...renderOptions } = options;

  const user = userEvent.setup();
  
  const result = render(ui, {
    wrapper: createWrapper({ initialEntries, queryClient }),
    ...renderOptions,
  });

  return {
    ...result,
    user,
    queryClient,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Wait for loading states to resolve
 */
export const waitForLoadingToFinish = async (
  findByText: (text: string | RegExp) => Promise<HTMLElement>
) => {
  // Wait for any loading indicators to disappear
  try {
    await findByText(/loading/i);
  } catch {
    // Loading already finished
  }
};

/**
 * Helper to fill form fields
 */
export const fillFormField = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
  getByLabelText: (text: string | RegExp) => HTMLElement
) => {
  const input = getByLabelText(new RegExp(label, 'i'));
  await user.clear(input);
  await user.type(input, value);
};

/**
 * Select option from dropdown
 */
export const selectOption = async (
  user: ReturnType<typeof userEvent.setup>,
  selectLabel: string,
  optionText: string,
  getByLabelText: (text: string | RegExp) => HTMLElement,
  getByRole: (role: string, options?: Record<string, unknown>) => HTMLElement
) => {
  const select = getByLabelText(new RegExp(selectLabel, 'i'));
  await user.click(select);
  const option = getByRole('option', { name: new RegExp(optionText, 'i') });
  await user.click(option);
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Re-export userEvent
export { userEvent };
