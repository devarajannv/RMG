import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminOrganizationPage from './AdminOrganizationPage';

const { mockGet, mockPatch } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPatch: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: mockGet,
    patch: mockPatch,
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminOrganizationPage />
    </QueryClientProvider>
  );
}

describe('AdminOrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint === '/organization/stats') {
        return Promise.resolve({
          data: {
            tenant: {
              id: 'tenant-1',
              name: 'NewVision',
              slug: 'newvision',
              status: 'ACTIVE',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            users: { total: 10, active: 9, inactive: 1 },
            resources: { total: 12, active: 10, inactive: 2, onBench: 1 },
            projects: { total: 6, active: 4, completed: 2 },
            clients: { total: 5, active: 5 },
            storage: { documentsCount: 8 },
          },
        });
      }

      if (endpoint === '/organization/billing-taxonomy') {
        return Promise.resolve({
          data: {
            version: 'bill-v1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            updatedBy: 'user-1',
            allowedInvoicingModels: ['CONTRACT_LED', 'PROJECT_LED'],
            allowedBillingTypes: ['TM', 'FIXED'],
            allowContractProjectLinkage: true,
          },
        });
      }

      if (endpoint === '/organization/document-taxonomy') {
        return Promise.resolve({
          data: {
            version: 'doc-v1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            updatedBy: 'user-1',
            allowedCategories: ['NDA', 'MSA'],
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    mockPatch.mockResolvedValue({ success: true });
  });

  it('allows admins to add and save document taxonomy categories', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Document Taxonomy Policy');

    await user.type(screen.getByPlaceholderText('Add category, for example NDA'), 'sow');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));
    await user.click(screen.getByRole('button', { name: 'Save Document Taxonomy' }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/organization/document-taxonomy', {
        allowedCategories: ['NDA', 'MSA', 'SOW'],
      });
    });
  });
});