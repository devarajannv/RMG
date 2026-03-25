import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from '@/test/utils';
import RequestsPage from './RequestsPage';

const mockNavigate = vi.fn();
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const requestTypesResponse = {
  data: [
    {
      code: 'RESOURCE_ALLOCATION_BATCH',
      name: 'Batch Resource Allocation',
      category: 'RESOURCE',
      description: 'Allocate multiple resources',
      isActive: true,
    },
  ],
};

const requestBlueprintResponse = {
  data: {
    code: 'RESOURCE_ALLOCATION_BATCH',
    requestTypeCode: 'RESOURCE_ALLOCATION_BATCH',
    definition: {
      schemaVersion: '1.0',
      identity: {
        code: 'RESOURCE_ALLOCATION_BATCH',
        name: 'Batch Resource Allocation',
        domain: 'PROFESSIONAL_SERVICES',
        category: 'PROJECT_REQUEST',
        version: 1,
        isSystemBlueprint: true,
        maturityLevel: 'STANDARD',
      },
      runtime: {
        renderMode: 'MODAL',
        complexityLevel: 'STANDARD',
        allowDraft: true,
        allowSubmit: true,
        allowEditAfterReturn: true,
        allowAttachments: true,
      },
      commonFields: [
        {
          key: 'title',
          visible: true,
          editable: true,
          requiredForDraft: true,
          requiredForSubmit: true,
          label: 'Title',
        },
        {
          key: 'description',
          visible: true,
          editable: true,
          requiredForDraft: false,
          requiredForSubmit: false,
          label: 'Description',
        },
        {
          key: 'priority',
          visible: true,
          editable: true,
          requiredForDraft: false,
          requiredForSubmit: false,
          label: 'Priority',
        },
        {
          key: 'neededBy',
          visible: true,
          editable: true,
          requiredForDraft: false,
          requiredForSubmit: false,
          label: 'Needed By',
        },
        {
          key: 'urgencyJustification',
          visible: true,
          editable: true,
          requiredForDraft: true,
          requiredForSubmit: true,
          label: 'Urgency Justification',
          requirementCondition: {
            operator: 'AND',
            conditions: [
              {
                left: 'priority',
                op: 'EQUALS',
                right: 'CRITICAL',
              },
            ],
          },
        },
      ],
      entityBindings: [],
      customFields: [],
      workflowPolicy: {},
      defaults: {},
    },
  },
};

const requestBlueprintWithEntityBindings = {
  ...requestBlueprintResponse,
  data: {
    ...requestBlueprintResponse.data,
    definition: {
      ...requestBlueprintResponse.data.definition,
      entityBindings: [
      {
        key: 'project',
        entityType: 'project',
        label: 'Project',
        visible: true,
        editable: true,
        selectionMode: 'SINGLE',
        requiredForDraft: false,
        requiredForSubmit: true,
        autoResolve: false,
        allowManualSelection: true,
      },
      {
        key: 'client',
        entityType: 'client',
        label: 'Client',
        visible: true,
        editable: false,
        selectionMode: 'SINGLE',
        requiredForDraft: false,
        requiredForSubmit: false,
        autoResolve: true,
        allowManualSelection: false,
        derivedFrom: 'project',
      },
      {
        key: 'contract',
        entityType: 'contract',
        label: 'Contract',
        visible: true,
        editable: false,
        selectionMode: 'SINGLE',
        requiredForDraft: false,
        requiredForSubmit: false,
        autoResolve: true,
        allowManualSelection: false,
        derivedFrom: 'projectSetupRequest',
      },
      {
        key: 'projectSetupRequest',
        entityType: 'priorRequest',
        label: 'Project Setup Request',
        visible: true,
        editable: true,
        selectionMode: 'SINGLE',
        requiredForDraft: false,
        requiredForSubmit: true,
        autoResolve: true,
        allowManualSelection: true,
      },
      ],
    },
  },
};

const requestBlueprintWithUserPicker = {
  ...requestBlueprintResponse,
  data: {
    ...requestBlueprintResponse.data,
    definition: {
      ...requestBlueprintResponse.data.definition,
      customFields: [
        {
          fieldKey: 'engagementOwner',
          label: 'Engagement Owner',
          type: 'USER_PICKER',
          displayOrder: 1,
          requiredForDraft: false,
          requiredForSubmit: true,
        },
      ],
    },
  },
};

const requestBlueprintWithOnBehalfOfPolicy = {
  ...requestBlueprintResponse,
  data: {
    ...requestBlueprintResponse.data,
    definition: {
      ...requestBlueprintResponse.data.definition,
      runtime: {
        ...requestBlueprintResponse.data.definition.runtime,
        allowDraft: false,
        allowSubmit: true,
      },
      commonFields: [
        ...requestBlueprintResponse.data.definition.commonFields,
        {
          key: 'onBehalfOf',
          visible: true,
          editable: true,
          requiredForDraft: false,
          requiredForSubmit: true,
          label: 'On Behalf Of',
        },
      ],
    },
  },
};

const requestBlueprintWithAttachments = {
  ...requestBlueprintResponse,
  data: {
    ...requestBlueprintResponse.data,
    definition: {
      ...requestBlueprintResponse.data.definition,
      commonFields: [
        ...requestBlueprintResponse.data.definition.commonFields,
        {
          key: 'attachments',
          visible: true,
          editable: true,
          requiredForDraft: false,
          requiredForSubmit: false,
          label: 'Attachments',
        },
      ],
    },
  },
};

const dashboardResponse = {
  data: {
    myRequests: {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
    pendingApprovals: 0,
    recentRequests: [],
  },
};

const requestsResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },
};

describe('RequestsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGet.mockReset();
    mockPost.mockReset();

    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        return requestTypesResponse;
      }

      if (endpoint === '/request-types/blueprints/RESOURCE_ALLOCATION_BATCH') {
        return requestBlueprintResponse;
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });
  });

  it('submits requested completion date as an ISO datetime string', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-1' },
      meta: { submissionAttempted: false, submissionSucceeded: false },
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Allocate team to SeaSalt');
    const dialog = screen.getByRole('dialog');
    const dateInput = dialog.querySelector('input[type="date"]');

    expect(dateInput).toBeTruthy();
    if (!dateInput) {
      throw new Error('Expected date input to be present');
    }

    await user.type(dateInput, '2026-03-10');
    const dialogCreateButton = Array.from(dialog.querySelectorAll('button')).find((button) =>
      /save draft/i.test(button.textContent || '')
    );

    expect(dialogCreateButton).toBeTruthy();
    if (!dialogCreateButton) {
      throw new Error('Expected create request button in dialog');
    }

    await user.click(dialogCreateButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Allocate team to SeaSalt',
        requestedCompletionDate: '2026-03-10T00:00:00.000Z',
      }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/requests/request-1', {
        state: {
          notice: {
            type: 'info',
            title: 'Draft saved',
            message: 'You can continue editing this draft before submitting it.',
          },
        },
      });
    });
  });

  it('requires urgency justification for critical requests and includes it in the payload', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-2' },
      meta: { submissionAttempted: false, submissionSucceeded: false },
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Critical staffing request');

    await user.selectOptions(screen.getByRole('combobox'), 'CRITICAL');

    expect(await screen.findByLabelText(/urgency justification/i)).toBeInTheDocument();

    const dialog = screen.getByRole('dialog');
    const dialogCreateButton = Array.from(dialog.querySelectorAll('button')).find((button) =>
      /save draft/i.test(button.textContent || '')
    );

    expect(dialogCreateButton).toBeTruthy();
    if (!dialogCreateButton) {
      throw new Error('Expected create request button in dialog');
    }

    expect(dialogCreateButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/urgency justification/i),
      'Customer launch is blocked until this resource assignment is approved.'
    );

    expect(dialogCreateButton).not.toBeDisabled();

    await user.click(dialogCreateButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Critical staffing request',
        priority: 'CRITICAL',
        urgencyJustification: 'Customer launch is blocked until this resource assignment is approved.',
      }));
    });
  });

  it('submits immediately for approval when the primary action is used', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-3' },
      meta: { submissionAttempted: true, submissionSucceeded: true },
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));
    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Submit staffing request');

    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Submit staffing request',
        submitForApproval: true,
      }));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/requests/request-3', {
        state: {
          notice: {
            type: 'success',
            title: 'Request submitted for approval',
            message: 'Your request has entered the workflow.',
          },
        },
      });
    });
  });

  it('navigates to the saved draft with a warning when submit after create fails', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-4' },
      meta: {
        submissionAttempted: true,
        submissionSucceeded: false,
        submissionError: {
          message: 'Dependency missing',
          code: 'DEPENDENCY_NOT_MET',
          statusCode: 400,
        },
      },
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));
    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Submit staffing request');

    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/requests/request-4', {
        state: {
          notice: {
            type: 'warning',
            title: 'Draft saved, but submission failed',
            message: 'Dependency missing',
          },
        },
      });
    });
  });

  it('shows the backend error message when request creation fails', async () => {
    mockPost.mockRejectedValue(new Error('Validation failed'));

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Allocate team to SeaSalt');
    const dialog = screen.getByRole('dialog');
    const dialogCreateButton = Array.from(dialog.querySelectorAll('button')).find((button) =>
      /save draft/i.test(button.textContent || '')
    );

    expect(dialogCreateButton).toBeTruthy();
    if (!dialogCreateButton) {
      throw new Error('Expected create request button in dialog');
    }

    await user.click(dialogCreateButton);

    expect(await screen.findByText(/validation failed/i)).toBeInTheDocument();
  });

  it('uses real entity lookups for blueprint bindings and maps selections into the payload', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-5' },
      meta: { submissionAttempted: true, submissionSucceeded: true },
    });

    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        return requestTypesResponse;
      }

      if (endpoint === '/request-types/blueprints/RESOURCE_ALLOCATION_BATCH') {
        return requestBlueprintWithEntityBindings;
      }

      if (endpoint.startsWith('/projects?')) {
        return {
          data: [
            {
              id: 'project-1',
              code: 'PROJ-001',
              name: 'SeaSalt Launch',
              status: 'ACTIVE',
              client: {
                id: 'client-1',
                name: 'SeaSalt',
                code: 'SEA',
              },
            },
          ],
        };
      }

      if (endpoint.startsWith('/requests?limit=8&status=COMPLETED&typeCode=PROJECT_SETUP')) {
        return {
          data: [
            {
              id: 'setup-request-1',
              requestNumber: 'REQ-1001',
              title: 'Project setup for SeaSalt',
              status: 'COMPLETED',
              type: {
                code: 'PROJECT_SETUP',
                name: 'Project Setup',
                category: 'PROJECT',
              },
              contractId: 'contract-1',
              requestData: {
                contract: 'contract-1',
              },
            },
          ],
        };
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Allocate launch team');

    expect(await screen.findByText(/linked records/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /submit for approval/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /seaSalt launch/i }));

    expect(await screen.findByText('SeaSalt')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /project setup for seaSalt/i }));

    expect(await screen.findByText(/derived from req-1001/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /submit for approval/i })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Allocate launch team',
        submitForApproval: true,
        projectId: 'project-1',
        dependsOnId: 'setup-request-1',
        contractId: 'contract-1',
        requestData: expect.objectContaining({
          project: 'project-1',
          client: 'client-1',
          contract: 'contract-1',
          projectSetupRequest: 'setup-request-1',
        }),
      }));
    });
  });

  it('uses live lookup for custom user picker fields and stores the selected user id', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-6' },
      meta: { submissionAttempted: true, submissionSucceeded: true },
    });

    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        return requestTypesResponse;
      }

      if (endpoint === '/request-types/blueprints/RESOURCE_ALLOCATION_BATCH') {
        return requestBlueprintWithUserPicker;
      }

      if (endpoint.startsWith('/resources?')) {
        return {
          data: [
            {
              id: 'resource-1',
              firstName: 'Ava',
              lastName: 'Patel',
              email: 'ava.patel@example.com',
              employeeId: 'EMP-001',
            },
          ],
        };
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Staff delivery leadership');

    const submitButton = screen.getByRole('button', { name: /submit for approval/i });
    expect(submitButton).toBeDisabled();

    expect(await screen.findByLabelText(/engagement owner search/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ava patel/i }));

    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Staff delivery leadership',
        submitForApproval: true,
        requestData: expect.objectContaining({
          engagementOwner: 'resource-1',
        }),
      }));
    });
  });

  it('honors runtime draft policy and maps on-behalf-of lookup selection into the payload', async () => {
    mockPost.mockResolvedValue({
      success: true,
      data: { id: 'request-7' },
      meta: { submissionAttempted: true, submissionSucceeded: true },
    });

    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        return requestTypesResponse;
      }

      if (endpoint === '/request-types/blueprints/RESOURCE_ALLOCATION_BATCH') {
        return requestBlueprintWithOnBehalfOfPolicy;
      }

      if (endpoint.startsWith('/resources?')) {
        return {
          data: [
            {
              id: 'resource-7',
              firstName: 'Noah',
              lastName: 'Singh',
              email: 'noah.singh@example.com',
              employeeId: 'EMP-007',
            },
          ],
        };
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Create staffing exception');

    const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
    const submitButton = screen.getByRole('button', { name: /submit for approval/i });

    expect(saveDraftButton).toBeDisabled();
    expect(submitButton).toBeDisabled();

    expect(await screen.findByLabelText(/on behalf of search/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /noah singh/i }));

    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Create staffing exception',
        submitForApproval: true,
        onBehalfOfId: 'resource-7',
      }));
    });
  });

  it('creates a draft, uploads attachments, and then submits when files are selected', async () => {
    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        return requestTypesResponse;
      }

      if (endpoint === '/request-types/blueprints/RESOURCE_ALLOCATION_BATCH') {
        return requestBlueprintWithAttachments;
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });

    mockPost.mockImplementation(async (endpoint: string, payload?: unknown) => {
      if (endpoint === '/requests') {
        return {
          success: true,
          data: { id: 'request-8' },
          meta: { submissionAttempted: false, submissionSucceeded: false },
        };
      }

      if (endpoint === '/requests/request-8/attachments') {
        expect(payload).toBeInstanceOf(FormData);
        const formData = payload as FormData;
        expect(formData.get('file')).toBeInstanceOf(File);
        expect((formData.get('file') as File).name).toBe('brief.txt');
        return { success: true, data: { id: 'attachment-1' } };
      }

      if (endpoint === '/requests/request-8/submit') {
        return {
          success: true,
          data: { id: 'request-8', status: 'PENDING_APPROVAL' },
        };
      }

      throw new Error(`Unhandled POST ${endpoint}`);
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));
    await user.click(await screen.findByRole('button', { name: /batch resource allocation/i }));

    await user.type(screen.getByPlaceholderText(/enter batch resource allocation title/i), 'Attach staffing brief');

    const fileInput = await screen.findByLabelText(/request attachments/i);
    const file = new File(['brief'], 'brief.txt', { type: 'text/plain' });
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/requests', expect.objectContaining({
        typeCode: 'RESOURCE_ALLOCATION_BATCH',
        title: 'Attach staffing brief',
      }));
      expect(mockPost).toHaveBeenCalledWith('/requests/request-8/attachments', expect.any(FormData));
      expect(mockPost).toHaveBeenCalledWith('/requests/request-8/submit', {});
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/requests/request-8', {
        state: {
          notice: {
            type: 'success',
            title: 'Request submitted for approval',
            message: 'Your request has entered the workflow.',
          },
        },
      });
    });
  });

  it('shows a clear empty state instead of a blank modal when no request types are available', async () => {
    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        return { data: [] };
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));

    expect(await screen.findByText(/no active request types are available/i)).toBeInTheDocument();
  });

  it('falls back to activated blueprint request types when the primary request type endpoint fails', async () => {
    mockGet.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/currency/currencies') {
        return [];
      }

      if (endpoint === '/request-types') {
        throw new Error('Invalid request payload');
      }

      if (endpoint === '/request-types/blueprints?onlyActivated=true') {
        return {
          data: [
            {
              id: 'blueprint-1',
              code: 'RESOURCE_ALLOCATION_BATCH',
              schemaVersion: '1.0',
              definition: requestBlueprintResponse.data.definition,
              requestType: {
                id: 'type-1',
                code: 'RESOURCE_ALLOCATION_BATCH',
                name: 'Batch Resource Allocation',
                description: 'Allocate multiple resources',
                category: 'RESOURCE',
                defaultPriority: 'MEDIUM',
                requiresApproval: true,
                allowDraft: true,
                allowAttachments: true,
                visibilityScope: 'TENANT',
                isSystemType: true,
                tenantId: null,
              },
              isActivatedForTenant: true,
              packMemberships: [],
            },
          ],
        };
      }

      if (endpoint === '/requests/dashboard') {
        return dashboardResponse;
      }

      if (endpoint.startsWith('/requests')) {
        return requestsResponse;
      }

      throw new Error(`Unhandled GET ${endpoint}`);
    });

    const { user } = renderWithProviders(<RequestsPage />);

    await user.click(await screen.findByRole('button', { name: /new request/i }));

    expect(await screen.findByRole('button', { name: /batch resource allocation/i })).toBeInTheDocument();
  });
});
