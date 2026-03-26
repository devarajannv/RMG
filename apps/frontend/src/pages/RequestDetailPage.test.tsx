import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from '@/test/utils';
import RequestDetailPage from './RequestDetailPage';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
    },
  }),
}));

const requestResponse = {
  data: {
    id: 'request-1',
    requestNumber: 'REQ-0001',
    typeCode: 'RESOURCE_ALLOCATION_BATCH',
    title: 'Batch Resource Allocation',
    description: 'Initial description',
    status: 'DRAFT',
    priority: 'MEDIUM',
    requestData: {},
    requestedCompletionDate: '2026-03-15T00:00:00.000Z',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
    version: 1,
    requester: {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    },
    requestType: {
      code: 'RESOURCE_ALLOCATION_BATCH',
      name: 'Batch Resource Allocation',
      category: 'RESOURCE',
    },
    approvals: [],
    comments: [],
    history: [],
    watchers: [],
    attachments: [],
  },
};

describe('RequestDetailPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();

    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/requests/request-1') {
        return requestResponse;
      }

      if (endpoint === '/requests/request-1/comments') {
        return { data: [] };
      }

      if (endpoint === '/requests/request-1/history') {
        return { data: [] };
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });
  });

  it('opens the edit modal and updates the draft request', async () => {
    mockPut.mockResolvedValue({ success: true, data: requestResponse.data });

    const { user } = renderWithProviders(
      <Routes>
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Routes>,
      { initialEntries: ['/requests/request-1'] }
    );

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));

    const titleInput = await screen.findByLabelText(/title/i);
    expect(titleInput).toBeTruthy();

    await user.clear(titleInput);
    await user.type(titleInput, 'Updated batch allocation');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/requests/request-1', expect.objectContaining({
        title: 'Updated batch allocation',
        priority: 'MEDIUM',
      }));
    });
  });

  it('can save and immediately submit from the edit modal', async () => {
    mockPut.mockResolvedValue({ success: true, data: requestResponse.data });
    mockPost.mockResolvedValue({ success: true, data: { ...requestResponse.data, status: 'PENDING_APPROVAL' } });

    const { user } = renderWithProviders(
      <Routes>
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Routes>,
      { initialEntries: ['/requests/request-1'] }
    );

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));
    await user.clear(await screen.findByLabelText(/title/i));
    await user.type(await screen.findByLabelText(/title/i), 'Updated and submitted');
    await user.click(screen.getByRole('button', { name: /save and submit/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/requests/request-1', expect.objectContaining({
        title: 'Updated and submitted',
      }));
      expect(mockPost).toHaveBeenCalledWith('/requests/request-1/submit', { comments: '' });
    });

    expect(await screen.findByText(/request submitted for approval/i)).toBeInTheDocument();
  });

  it('shows a warning when save succeeds but submit fails from the edit modal', async () => {
    mockPut.mockResolvedValue({ success: true, data: requestResponse.data });
    mockPost.mockRejectedValue(new Error('Dependency missing'));

    const { user } = renderWithProviders(
      <Routes>
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Routes>,
      { initialEntries: ['/requests/request-1'] }
    );

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /save and submit/i }));

    expect(await screen.findByText(/changes saved, but submission failed/i)).toBeInTheDocument();
    expect(await screen.findByText(/dependency missing/i)).toBeInTheDocument();
  });

  it('submits the draft from the detail page and shows confirmation', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { ...requestResponse.data, status: 'PENDING_APPROVAL' },
    });

    const { user } = renderWithProviders(
      <Routes>
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Routes>,
      { initialEntries: ['/requests/request-1'] }
    );

    await user.click(await screen.findByRole('button', { name: /submit for approval/i }));
    await user.click(await screen.findByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests/request-1/submit', { comments: '' });
    });

    expect(await screen.findByText(/request submitted for approval/i)).toBeInTheDocument();
    expect(await screen.findByText(/entered the workflow/i)).toBeInTheDocument();
  });

  it('requires a cancel reason and sends it as reason to the cancel endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { ...requestResponse.data, status: 'CANCELLED' } });

    const { user } = renderWithProviders(
      <Routes>
        <Route path="/requests/:id" element={<RequestDetailPage />} />
      </Routes>,
      { initialEntries: ['/requests/request-1'] }
    );

    await user.click(await screen.findByRole('button', { name: /more/i }));
    await user.click(await screen.findByRole('button', { name: /cancel request/i }));

    const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
    expect(cancelButton).toBeDisabled();

    await user.type(screen.getByLabelText(/reason/i), 'No longer needed');
    expect(cancelButton).not.toBeDisabled();

    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests/request-1/cancel', { reason: 'No longer needed' });
    });

    expect(await screen.findByText(/request cancelled/i)).toBeInTheDocument();
  });
});
