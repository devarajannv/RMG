import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma', () => ({
  default: {
    requestType: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    approvalChain: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../functions/functions.service', () => ({
  resolveFunctionToHolders: vi.fn(),
}));

vi.mock('../audit/audit.service', () => ({
  createAuditLog: vi.fn(),
}));

import prisma from '../../lib/prisma';
import * as requestTypesService from './request-types.service';
import * as approvalChainService from './approval-chain.service';

describe('Requests code generation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request type code generation', () => {
    it('auto-generates code when omitted', async () => {
      vi.mocked(prisma.requestType.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.requestType.create).mockImplementation(async (args: any) => ({
        id: 'rt-1',
        ...args.data,
      }));

      const result = await requestTypesService.createRequestType('tenant-1', 'user-1', {
        name: 'Auto Type Alpha',
        category: 'OTHER' as any,
      });

      expect((result as any).code).toBe('AUTO_TYPE_ALPHA');
      expect(prisma.requestType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'AUTO_TYPE_ALPHA',
          }),
        })
      );
    });

    it('auto-suffixes generated code on conflict', async () => {
      vi.mocked(prisma.requestType.findFirst)
        .mockResolvedValueOnce({ id: 'existing-1' } as never)
        .mockResolvedValueOnce(null as never);

      vi.mocked(prisma.requestType.create).mockImplementation(async (args: any) => ({
        id: 'rt-2',
        ...args.data,
      }));

      const result = await requestTypesService.createRequestType('tenant-1', 'user-1', {
        name: 'Auto Type Conflict',
        category: 'OTHER' as any,
      });

      expect((result as any).code).toBe('AUTO_TYPE_CONFLICT_2');
      expect(prisma.requestType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'AUTO_TYPE_CONFLICT_2',
          }),
        })
      );
    });
  });

  describe('Approval chain code generation', () => {
    it('auto-generates workflow code when omitted', async () => {
      vi.mocked(prisma.approvalChain.findFirst)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce({ id: 'chain-1', code: 'AUTO_WORKFLOW' } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback({
        approvalChain: {
          create: vi.fn().mockImplementation(async (args: any) => ({
            id: 'chain-1',
            code: args.data.code,
          })),
        },
        approvalStep: {
          create: vi.fn().mockResolvedValue({ id: 'step-1' }),
        },
      }));

      const result = await approvalChainService.createApprovalChain('tenant-1', 'user-1', {
        name: 'Auto Workflow',
        steps: [
          {
            name: 'Step 1',
            stepOrder: 1,
            approverType: 'ROLE' as any,
            approverRoleId: '11111111-1111-1111-1111-111111111111',
          },
        ],
      });

      expect((result as any).code).toBe('AUTO_WORKFLOW');
    });

    it('auto-suffixes workflow code on conflict', async () => {
      vi.mocked(prisma.approvalChain.findFirst)
        .mockResolvedValueOnce({ id: 'existing-chain' } as never)
        .mockResolvedValueOnce(null as never)
        .mockResolvedValueOnce({ id: 'chain-2', code: 'AUTO_WORKFLOW_CONFLICT_2' } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback({
        approvalChain: {
          create: vi.fn().mockImplementation(async (args: any) => ({
            id: 'chain-2',
            code: args.data.code,
          })),
        },
        approvalStep: {
          create: vi.fn().mockResolvedValue({ id: 'step-1' }),
        },
      }));

      const result = await approvalChainService.createApprovalChain('tenant-1', 'user-1', {
        name: 'Auto Workflow Conflict',
        steps: [
          {
            name: 'Step 1',
            stepOrder: 1,
            approverType: 'ROLE' as any,
            approverRoleId: '11111111-1111-1111-1111-111111111111',
          },
        ],
      });

      expect((result as any).code).toBe('AUTO_WORKFLOW_CONFLICT_2');
    });
  });
});
