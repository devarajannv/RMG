import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminRolesPage from './AdminRolesPage';

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    get: mockGet,
    post: mockPost,
    put: vi.fn(),
    delete: vi.fn(),
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
      <AdminRolesPage />
    </QueryClientProvider>
  );
}

describe('AdminRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint === '/roles') {
        return Promise.resolve([]);
      }

      if (endpoint === '/roles/catalog') {
        return Promise.resolve({
          permissions: [],
          sections: [],
          presets: [
            {
              code: 'PMO',
              name: 'PMO',
              description: 'Professional services PMO operating role.',
              permissionKeys: ['client:read', 'project:read'],
            },
          ],
        });
      }

      return Promise.resolve({});
    });

    mockPost.mockResolvedValue({ id: 'role-pmo', name: 'PMO', isSystem: true });
  });

  it('provisions the PMO baseline role from the admin page', async () => {
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole('button', { name: 'Provision PMO Baseline' });
    await user.click(button);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/roles/system/provision', { presetCode: 'PMO' });
    });
  });
});