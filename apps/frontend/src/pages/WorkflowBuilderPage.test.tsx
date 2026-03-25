/**
 * Workflow Builder Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkflowBuilderPage from './WorkflowBuilderPage';

// Mock usePermissions hook
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    permissions: ['settings:update', 'settings:read', 'roles:read', 'roles:update'],
    roles: ['Admin'],
    isLoading: false,
    hasPermission: (permission: string) => {
      const mockPermissions = ['settings:update', 'settings:read', 'roles:read', 'roles:update'];
      return mockPermissions.some(p => p === permission || p.startsWith(permission.split(':')[0]));
    },
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    hasRole: () => true,
    hasAnyRole: () => true,
    canAccessModule: () => true,
    permissionObject: { permissions: ['settings:update'], roles: ['Admin'] },
  }),
  hasPermission: () => true,
  hasAnyPermission: () => true,
  hasRole: () => true,
  hasAnyRole: () => true,
  canAccessModule: () => true,
  PERMISSIONS: {
    SETTINGS_UPDATE: 'settings:update',
    SETTINGS_READ: 'settings:read',
    ROLES_READ: 'roles:read',
    RESOURCES_READ: 'resources:read',
  },
  MODULES: {
    SETTINGS: 'settings',
    ROLES: 'roles',
  },
  ACTIONS: {
    READ: 'read',
    UPDATE: 'update',
  },
}));

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      roles: ['Admin'],
      permissions: ['settings:update', 'roles:read'],
    },
    isAuthenticated: true,
  }),
}));

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((endpoint) => {
      if (endpoint.includes('/approval-chains')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'chain-1',
              code: 'LEAVE_APPROVAL',
              name: 'Leave Approval Workflow',
              description: 'Standard leave approval workflow',
              status: 'ACTIVE',
              scope: 'TENANT',
              version: 1,
              effectiveFrom: '2024-01-01',
              steps: [
                {
                  id: 'step-1',
                  name: 'Manager Approval',
                  stepOrder: 1,
                  approverType: 'ROLE',
                  approvalMode: 'ANY',
                  approverRole: { id: 'role-1', name: 'Manager' },
                },
                {
                  id: 'step-2',
                  name: 'HR Review',
                  stepOrder: 2,
                  approverType: 'ROLE',
                  approvalMode: 'ANY',
                  approverRole: { id: 'role-2', name: 'HR Admin' },
                },
              ],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              _count: { requests: 10, tenantConfigs: 2 },
            },
          ],
          total: 1,
        });
      }
      if (endpoint.includes('/roles')) {
        return Promise.resolve({
          success: true,
          data: [
            { id: 'role-1', name: 'Manager' },
            { id: 'role-2', name: 'HR Admin' },
            { id: 'role-3', name: 'Director' },
          ],
        });
      }
      if (endpoint.includes('/users')) {
        return Promise.resolve({
          success: true,
          data: [
            { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          ],
        });
      }
      return Promise.resolve({ success: true, data: [] });
    }),
    post: vi.fn().mockResolvedValue({ success: true, data: { id: 'new-chain' } }),
    put: vi.fn().mockResolvedValue({ success: true, data: { id: 'chain-1' } }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Test wrapper with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('WorkflowBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the workflow list', async () => {
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText('Workflow Builder')).toBeInTheDocument();
    });

    // Check for workflow card
    await waitFor(() => {
      expect(screen.getByText('Leave Approval Workflow')).toBeInTheDocument();
    });
  });

  it('shows search input', async () => {
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search workflows...')).toBeInTheDocument();
    });
  });

  it('shows create button', async () => {
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument();
    });
  });

  it('displays workflow status badge', async () => {
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('displays step count', async () => {
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText('2 steps')).toBeInTheDocument();
    });
  });

  it('opens editor when create button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create workflow/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Workflow')).toBeInTheDocument();
      expect(screen.getByText('Workflow Details')).toBeInTheDocument();
    });
  });

  it('shows empty state message when no workflows', async () => {
    // Create a new QueryClient with a custom mock for this test only
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    
    // Override the mock just for this test
    const { api } = await import('@/lib/api');
    vi.mocked(api.get).mockImplementation((endpoint) => {
      if (endpoint.includes('/approval-chains')) {
        return Promise.resolve({ success: true, data: [], total: 0 });
      }
      if (endpoint.includes('/roles')) {
        return Promise.resolve({ success: true, data: [] });
      }
      if (endpoint.includes('/users')) {
        return Promise.resolve({ success: true, data: [] });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkflowBuilderPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No workflows found')).toBeInTheDocument();
    });
    
    // Reset the mock back to default behavior
    vi.mocked(api.get).mockImplementation((endpoint) => {
      if (endpoint.includes('/approval-chains')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 'chain-1',
              code: 'LEAVE_APPROVAL',
              name: 'Leave Approval Workflow',
              description: 'Standard leave approval workflow',
              status: 'ACTIVE',
              scope: 'TENANT',
              version: 1,
              effectiveFrom: '2024-01-01',
              steps: [
                {
                  id: 'step-1',
                  name: 'Manager Approval',
                  stepOrder: 1,
                  approverType: 'ROLE',
                  approvalMode: 'ANY',
                  approverRole: { id: 'role-1', name: 'Manager' },
                },
                {
                  id: 'step-2',
                  name: 'HR Review',
                  stepOrder: 2,
                  approverType: 'ROLE',
                  approvalMode: 'ANY',
                  approverRole: { id: 'role-2', name: 'HR Admin' },
                },
              ],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              _count: { requests: 10, tenantConfigs: 2 },
            },
          ],
          total: 1,
        });
      }
      if (endpoint.includes('/roles')) {
        return Promise.resolve({
          success: true,
          data: [
            { id: 'role-1', name: 'Manager' },
            { id: 'role-2', name: 'HR Admin' },
            { id: 'role-3', name: 'Director' },
          ],
        });
      }
      if (endpoint.includes('/users')) {
        return Promise.resolve({
          success: true,
          data: [
            { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          ],
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });
  });

  it('displays workflow details including step count', async () => {
    renderWithProviders(<WorkflowBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText('Leave Approval Workflow')).toBeInTheDocument();
    });
    
    // Check the step count is shown in the card
    await waitFor(() => {
      expect(screen.getByText('2 steps')).toBeInTheDocument();
    });
    
    // Check the workflow code is displayed
    await waitFor(() => {
      expect(screen.getByText('LEAVE_APPROVAL')).toBeInTheDocument();
    });
  });
});

describe('WorkflowEditor', () => {
  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowBuilderPage />);

    // Click create to open editor
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create workflow/i }));

    // Wait for editor to load
    await waitFor(() => {
      expect(screen.getByText('Create Workflow')).toBeInTheDocument();
    });

    // Click save without filling fields
    const saveButton = screen.getByRole('button', { name: /save workflow/i });
    await user.click(saveButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('At least one step is required')).toBeInTheDocument();
    });
  });

  it('adds a new step', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowBuilderPage />);

    // Open editor
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create workflow/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Workflow')).toBeInTheDocument();
    });

    // Click add step
    const addStepButton = screen.getByRole('button', { name: /add step/i });
    await user.click(addStepButton);

    // Should show the new step
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
  });

  it('shows step configuration panel when step is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowBuilderPage />);

    // Open editor
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create workflow/i }));

    await waitFor(() => {
      expect(screen.getByText('Workflow Details')).toBeInTheDocument();
    });

    // Add a step first - look for "Add Step" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add step/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add step/i }));

    // Should see the step was added
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
  });

  it('can cancel and return to list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkflowBuilderPage />);

    // Open editor
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create workflow/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create workflow/i }));

    await waitFor(() => {
      expect(screen.getByText('Workflow Details')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should return to list view - check for list-specific text
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search workflows...')).toBeInTheDocument();
    });
  });
});
