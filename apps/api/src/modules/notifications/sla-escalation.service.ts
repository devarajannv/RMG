/**
 * SLA Escalation Background Job Service
 * 
 * Monitors requests for SLA breaches and automatically escalates:
 * - Checks all pending requests against their SLA deadlines
 * - Sends warning notifications before breach
 * - Sends escalation notifications on breach
 * - Supports multiple escalation levels
 * - Can auto-reassign or auto-approve based on config
 * 
 * GOD LEVEL: Complete escalation system with configurable policies.
 */

import { Prisma, RequestStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { sendSLAEscalationNotification, emailService } from './email.service';

// ============================================================================
// Types
// ============================================================================

export interface SLAConfig {
  /** Hours until SLA breach */
  slaHours: number;
  /** Hours before breach to send warning */
  warningHours?: number;
  /** Escalation levels */
  escalations: EscalationLevel[];
  /** Auto-actions on breach */
  autoActions?: AutoAction[];
}

export interface EscalationLevel {
  /** Level number (1, 2, 3...) */
  level: number;
  /** Hours after breach to trigger this escalation */
  triggerAfterHours: number;
  /** Who to escalate to */
  escalateTo: EscalationTarget;
  /** Additional notification recipients */
  notifyAlso?: string[];
}

export interface EscalationTarget {
  type: 'USER' | 'ROLE' | 'MANAGER' | 'SKIP_LEVEL_MANAGER' | 'CUSTOM';
  /** User ID if type is USER */
  userId?: string;
  /** Role name if type is ROLE */
  role?: string;
  /** Custom function name if type is CUSTOM */
  customHandler?: string;
}

export interface AutoAction {
  /** Hours after breach to trigger */
  triggerAfterHours: number;
  /** Action type */
  action: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'REASSIGN' | 'CANCEL';
  /** For REASSIGN: who to reassign to */
  reassignTo?: EscalationTarget;
  /** Reason for the action */
  reason: string;
}

export interface PendingRequest {
  id: string;
  requestNumber: string;
  tenantId: string;
  requestTypeId: string;
  requestTypeName: string;
  status: RequestStatus;
  currentStepOrder: number;
  currentStepName: string | null;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  currentAssigneeEmail: string | null;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: Date;
  slaDeadline: Date | null;
  stepEnteredAt: Date | null;
  priority: string;
  tenantName: string;
}

export interface SLACheckResult {
  requestId: string;
  requestNumber: string;
  status: 'OK' | 'WARNING' | 'BREACHED' | 'ESCALATED' | 'AUTO_ACTIONED';
  slaDeadline: Date | null;
  minutesRemaining: number | null;
  minutesOverdue: number | null;
  escalationLevel: number;
  actionsTaken: string[];
  errors?: string[];
}

export interface EscalationJobResult {
  runId: string;
  startedAt: Date;
  completedAt: Date;
  totalChecked: number;
  ok: number;
  warnings: number;
  breaches: number;
  escalations: number;
  autoActions: number;
  errors: number;
  results: SLACheckResult[];
}

// ============================================================================
// Default SLA Configuration
// ============================================================================

const DEFAULT_SLA_CONFIG: SLAConfig = {
  slaHours: 24, // 24 hours to approve
  warningHours: 4, // Warn 4 hours before breach
  escalations: [
    {
      level: 1,
      triggerAfterHours: 0, // Immediately on breach
      escalateTo: { type: 'MANAGER' },
    },
    {
      level: 2,
      triggerAfterHours: 4, // 4 hours after breach
      escalateTo: { type: 'SKIP_LEVEL_MANAGER' },
    },
    {
      level: 3,
      triggerAfterHours: 8, // 8 hours after breach
      escalateTo: { type: 'ROLE', role: 'ADMIN' },
    },
  ],
  autoActions: [
    {
      triggerAfterHours: 24, // 24 hours after breach (48 total)
      action: 'AUTO_APPROVE',
      reason: 'Auto-approved due to SLA breach - no action taken after 48 hours',
    },
  ],
};

// ============================================================================
// SLA Configuration Store (would be in DB in production)
// ============================================================================

const slaConfigs: Map<string, SLAConfig> = new Map();
const requestTypeConfigs: Map<string, SLAConfig> = new Map();

// ============================================================================
// SLA Escalation Service
// ============================================================================

class SLAEscalationService {
  private isRunning = false;
  private lastRunResult: EscalationJobResult | null = null;
  private configHydrated = false;

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Set SLA configuration for a tenant
   */
  setTenantConfig(tenantId: string, config: SLAConfig): void {
    slaConfigs.set(tenantId, config);
    void this.persistTenantConfig(tenantId, config);
    logger.info('SLA config set for tenant', { tenantId, slaHours: config.slaHours });
  }

  /**
   * Set SLA configuration for a specific request type
   */
  setRequestTypeConfig(requestTypeId: string, config: SLAConfig): void {
    requestTypeConfigs.set(requestTypeId, config);
    void this.persistRequestTypeConfig(requestTypeId, config);
    logger.info('SLA config set for request type', { requestTypeId, slaHours: config.slaHours });
  }

  /**
   * Get effective SLA config for a request
   */
  getConfig(tenantId: string, requestTypeId?: string): SLAConfig {
    // Request type config takes precedence
    if (requestTypeId && requestTypeConfigs.has(requestTypeId)) {
      return requestTypeConfigs.get(requestTypeId)!;
    }
    // Then tenant config
    if (slaConfigs.has(tenantId)) {
      return slaConfigs.get(tenantId)!;
    }
    // Fall back to default
    return DEFAULT_SLA_CONFIG;
  }

  private async hydrateConfigCaches(): Promise<void> {
    if (this.configHydrated) {
      return;
    }

    const tenantClient = (prisma as unknown as {
      tenant?: {
        findMany?: typeof prisma.tenant.findMany;
      };
    }).tenant;

    if (!tenantClient?.findMany) {
      this.configHydrated = true;
      return;
    }

    const tenants = await tenantClient.findMany({
      select: { id: true, settings: true },
    });

    for (const tenant of tenants) {
      const settings = (tenant.settings as Record<string, unknown> | null) ?? null;
      const notifications = (settings?.notifications as Record<string, unknown> | null) ?? null;

      const tenantSla = notifications?.slaConfig as SLAConfig | undefined;
      if (tenantSla) {
        slaConfigs.set(tenant.id, tenantSla);
      }

      const requestTypeSlaConfigs = (notifications?.requestTypeSlaConfigs as Record<string, SLAConfig> | undefined) ?? {};
      for (const [requestTypeId, requestTypeConfig] of Object.entries(requestTypeSlaConfigs)) {
        requestTypeConfigs.set(requestTypeId, requestTypeConfig);
      }
    }

    this.configHydrated = true;
  }

  private async persistTenantConfig(tenantId: string, config: SLAConfig): Promise<void> {
    try {
      const tenantClient = (prisma as unknown as {
        tenant?: {
          findUnique?: typeof prisma.tenant.findUnique;
          update?: typeof prisma.tenant.update;
        };
      }).tenant;

      if (!tenantClient?.findUnique || !tenantClient.update) {
        return;
      }

      const tenant = await tenantClient.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
      const notifications = ((settings.notifications as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;

      await tenantClient.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...settings,
            notifications: {
              ...notifications,
              tenantId,
              slaConfig: config,
            },
          },
        },
      });
    } catch (error) {
      logger.warn('Failed to persist tenant SLA configuration', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async persistRequestTypeConfig(requestTypeId: string, config: SLAConfig): Promise<void> {
    try {
      const requestTypeClient = (prisma as unknown as {
        requestType?: {
          findFirst?: typeof prisma.requestType.findFirst;
        };
      }).requestType;
      const tenantClient = (prisma as unknown as {
        tenant?: {
          findUnique?: typeof prisma.tenant.findUnique;
          update?: typeof prisma.tenant.update;
        };
      }).tenant;

      if (!requestTypeClient?.findFirst || !tenantClient?.findUnique || !tenantClient.update) {
        return;
      }

      const requestType = await requestTypeClient.findFirst({
        where: { id: requestTypeId },
        select: { tenantId: true },
      });

      if (!requestType?.tenantId) {
        return;
      }

      const tenant = await tenantClient.findUnique({
        where: { id: requestType.tenantId },
        select: { settings: true },
      });

      const settings = ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
      const notifications = ((settings.notifications as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
      const requestTypeSlaConfigs =
        ((notifications.requestTypeSlaConfigs as Record<string, SLAConfig> | null) ?? {}) as Record<string, SLAConfig>;

      requestTypeSlaConfigs[requestTypeId] = config;

      await tenantClient.update({
        where: { id: requestType.tenantId },
        data: {
          settings: {
            ...settings,
            notifications: {
              ...notifications,
              requestTypeSlaConfigs,
            },
          },
        },
      });
    } catch (error) {
      logger.warn('Failed to persist request type SLA configuration', {
        requestTypeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================================================
  // Main Job
  // ============================================================================

  /**
   * Run the escalation check job
   * This should be called by a cron job (e.g., every 15 minutes)
   */
  async runEscalationJob(): Promise<EscalationJobResult> {
    await this.hydrateConfigCaches();

    if (this.isRunning) {
      logger.warn('SLA escalation job already running, skipping');
      return this.lastRunResult || {
        runId: 'skipped',
        startedAt: new Date(),
        completedAt: new Date(),
        totalChecked: 0,
        ok: 0,
        warnings: 0,
        breaches: 0,
        escalations: 0,
        autoActions: 0,
        errors: 0,
        results: [],
      };
    }

    this.isRunning = true;
    const runId = `sla-${Date.now()}`;
    const startedAt = new Date();

    logger.info('Starting SLA escalation job', { runId });

    const result: EscalationJobResult = {
      runId,
      startedAt,
      completedAt: new Date(),
      totalChecked: 0,
      ok: 0,
      warnings: 0,
      breaches: 0,
      escalations: 0,
      autoActions: 0,
      errors: 0,
      results: [],
    };

    try {
      // Get all pending requests
      const pendingRequests = await this.getPendingRequests();
      result.totalChecked = pendingRequests.length;

      logger.info(`Found ${pendingRequests.length} pending requests to check`);

      // Check each request
      for (const request of pendingRequests) {
        try {
          const checkResult = await this.checkAndEscalateRequest(request);
          result.results.push(checkResult);

          switch (checkResult.status) {
            case 'OK':
              result.ok++;
              break;
            case 'WARNING':
              result.warnings++;
              break;
            case 'BREACHED':
              result.breaches++;
              break;
            case 'ESCALATED':
              result.escalations++;
              break;
            case 'AUTO_ACTIONED':
              result.autoActions++;
              break;
          }

          if (checkResult.errors?.length) {
            result.errors += checkResult.errors.length;
          }
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Error checking request SLA', {
            requestId: request.id,
            error: errMsg,
          });
          result.errors++;
          result.results.push({
            requestId: request.id,
            requestNumber: request.requestNumber,
            status: 'OK',
            slaDeadline: request.slaDeadline,
            minutesRemaining: null,
            minutesOverdue: null,
            escalationLevel: 0,
            actionsTaken: [],
            errors: [errMsg],
          });
        }
      }

      result.completedAt = new Date();
      this.lastRunResult = result;

      logger.info('SLA escalation job completed', {
        duration: result.completedAt.getTime() - startedAt.getTime(),
        ...result,
      });

    } finally {
      this.isRunning = false;
    }

    return result;
  }

  // ============================================================================
  // Request Checking
  // ============================================================================

  /**
   * Get all requests that need SLA checking
   */
  private async getPendingRequests(): Promise<PendingRequest[]> {
    const requests = await prisma.request.findMany({
      where: {
        status: {
          in: ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'IN_PROGRESS'],
        },
        deletedAt: null,
      },
      include: {
        tenant: { select: { name: true } },
        type: { select: { id: true, name: true } },
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvals: {
          where: { status: 'PENDING' },
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
            step: { select: { id: true, name: true } },
          },
          take: 1,
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return requests.map((r) => {
      const currentApproval = r.approvals[0];
      return {
        id: r.id,
        requestNumber: r.requestNumber,
        tenantId: r.tenantId,
        requestTypeId: r.type.id,
        requestTypeName: r.type.name,
        status: r.status,
        currentStepOrder: r.currentStepOrder,
        currentStepName: currentApproval?.step?.name || null,
        currentAssigneeId: currentApproval?.approver?.id || null,
        currentAssigneeName: currentApproval?.approver 
          ? `${currentApproval.approver.firstName} ${currentApproval.approver.lastName}`
          : null,
        currentAssigneeEmail: currentApproval?.approver?.email || null,
        requesterId: r.requester.id,
        requesterName: `${r.requester.firstName} ${r.requester.lastName}`,
        requesterEmail: r.requester.email,
        createdAt: r.createdAt,
        slaDeadline: r.resolutionDueAt,
        stepEnteredAt: r.submittedAt || null,
        priority: r.priority,
        tenantName: r.tenant.name,
      };
    });
  }

  /**
   * Check a single request and take necessary actions
   */
  private async checkAndEscalateRequest(request: PendingRequest): Promise<SLACheckResult> {
    const config = this.getConfig(request.tenantId, request.requestTypeId);
    const now = new Date();

    const result: SLACheckResult = {
      requestId: request.id,
      requestNumber: request.requestNumber,
      status: 'OK',
      slaDeadline: request.slaDeadline,
      minutesRemaining: null,
      minutesOverdue: null,
      escalationLevel: 0,
      actionsTaken: [],
    };

    // Calculate SLA deadline if not set
    let slaDeadline = request.slaDeadline;
    if (!slaDeadline) {
      const baseTime = request.stepEnteredAt || request.createdAt;
      slaDeadline = new Date(baseTime.getTime() + config.slaHours * 60 * 60 * 1000);
      result.slaDeadline = slaDeadline;
    }

    const minutesUntilDeadline = (slaDeadline.getTime() - now.getTime()) / (1000 * 60);
    
    if (minutesUntilDeadline > 0) {
      result.minutesRemaining = Math.round(minutesUntilDeadline);
    } else {
      result.minutesOverdue = Math.round(-minutesUntilDeadline);
    }

    // Check for warning threshold
    if (config.warningHours && minutesUntilDeadline > 0) {
      const warningMinutes = config.warningHours * 60;
      if (minutesUntilDeadline <= warningMinutes) {
        result.status = 'WARNING';
        await this.sendWarningNotification(request, slaDeadline, minutesUntilDeadline);
        result.actionsTaken.push('Warning notification sent');
      }
    }

    // Check for breach
    if (minutesUntilDeadline < 0) {
      result.status = 'BREACHED';
      const hoursOverdue = -minutesUntilDeadline / 60;

      // Get current escalation state
      const escalationState = await this.getEscalationState(request.id);
      result.escalationLevel = escalationState.currentLevel;

      // Check which escalation level we should be at
      for (const escalation of config.escalations) {
        if (hoursOverdue >= escalation.triggerAfterHours && escalation.level > escalationState.currentLevel) {
          // Need to escalate to this level
          await this.performEscalation(request, escalation, hoursOverdue);
          result.escalationLevel = escalation.level;
          result.status = 'ESCALATED';
          result.actionsTaken.push(`Escalated to level ${escalation.level}`);
        }
      }

      // Check for auto-actions
      if (config.autoActions) {
        for (const autoAction of config.autoActions) {
          if (hoursOverdue >= autoAction.triggerAfterHours && !escalationState.autoActioned) {
            await this.performAutoAction(request, autoAction);
            result.status = 'AUTO_ACTIONED';
            result.actionsTaken.push(`Auto-action: ${autoAction.action}`);
          }
        }
      }
    }

    return result;
  }

  // ============================================================================
  // Escalation State
  // ============================================================================

  /**
   * Get the current escalation state for a request
   */
  private async getEscalationState(requestId: string): Promise<{
    currentLevel: number;
    autoActioned: boolean;
    history: { level: number; timestamp: Date }[];
  }> {
    // In production, this would be stored in a table
    // For now, we check the request's metadata or audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'Request',
        entityId: requestId,
        action: 'UPDATE',
      },
      orderBy: { timestamp: 'desc' },
    });

    let currentLevel = 0;
    let autoActioned = false;
    const history: { level: number; timestamp: Date }[] = [];

    for (const log of auditLogs) {
      const changes = log.changes as Record<string, unknown>;
      if (changes?.escalationLevel) {
        const level = changes.escalationLevel as number;
        if (level > currentLevel) {
          currentLevel = level;
          history.push({ level, timestamp: log.timestamp });
        }
      }
      if (changes?.autoAction) {
        autoActioned = true;
      }
    }

    return { currentLevel, autoActioned, history };
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  /**
   * Send warning notification before SLA breach
   */
  private async sendWarningNotification(
    request: PendingRequest,
    slaDeadline: Date,
    minutesRemaining: number
  ): Promise<void> {
    if (!request.currentAssigneeEmail) return;

    const hoursRemaining = Math.round(minutesRemaining / 60 * 10) / 10;

    logger.info('Sending SLA warning notification', {
      requestId: request.id,
      assignee: request.currentAssigneeEmail,
      hoursRemaining,
    });

    // Use email service to send warning
    await emailService.send({
      tenantId: request.tenantId,
      to: { email: request.currentAssigneeEmail, name: request.currentAssigneeName || undefined },
      subject: `⚠️ Action Required: Request ${request.requestNumber} SLA expires in ${hoursRemaining} hours`,
      html: `
        <p>Hello ${request.currentAssigneeName || 'Approver'},</p>
        <p>Request <strong>${request.requestNumber}</strong> requires your attention.</p>
        <p>SLA Deadline: <strong>${slaDeadline.toISOString()}</strong></p>
        <p>Time Remaining: <strong>${hoursRemaining} hours</strong></p>
        <p>Please take action to avoid SLA breach and escalation.</p>
      `,
      tags: ['sla-warning'],
    });
  }

  /**
   * Perform escalation to a specific level
   */
  private async performEscalation(
    request: PendingRequest,
    escalation: EscalationLevel,
    hoursOverdue: number
  ): Promise<void> {
    logger.info('Performing SLA escalation', {
      requestId: request.id,
      level: escalation.level,
      hoursOverdue,
    });

    // Resolve escalation target
    const escalateToUser = await this.resolveEscalationTarget(
      request.tenantId,
      escalation.escalateTo,
      request
    );

    if (escalateToUser) {
      // Send escalation notification
      await sendSLAEscalationNotification(request.tenantId, {
        escalateToEmail: escalateToUser.email,
        escalateToName: escalateToUser.name,
        requestNumber: request.requestNumber,
        requestType: request.requestTypeName,
        requesterName: request.requesterName,
        submittedDate: request.createdAt.toISOString().split('T')[0],
        currentStep: request.currentStepName || 'Pending',
        assignedTo: request.currentAssigneeName || 'Unassigned',
        slaDue: request.slaDeadline?.toISOString() || 'Not set',
        overdueBy: `${Math.round(hoursOverdue)} hours`,
        escalationLevel: `Level ${escalation.level}`,
        actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/requests/${request.id}`,
        tenantName: request.tenantName,
      });
    }

    // Log the escalation
    await prisma.auditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: null, // System action
        action: 'UPDATE',
        entityType: 'Request',
        entityId: request.id,
        changes: {
          action: 'SLA_ESCALATION',
          escalationLevel: escalation.level,
          hoursOverdue,
          escalatedTo: escalateToUser?.email,
          previousAssignee: request.currentAssigneeEmail,
        } as Prisma.InputJsonValue,
      },
    });

    // Notify additional recipients
    if (escalation.notifyAlso?.length) {
      for (const email of escalation.notifyAlso) {
        await emailService.send({
          tenantId: request.tenantId,
          to: { email },
          subject: `🚨 SLA Escalation: Request ${request.requestNumber} (Level ${escalation.level})`,
          html: `
            <p>Request ${request.requestNumber} has been escalated to level ${escalation.level}.</p>
            <p>Overdue by: ${Math.round(hoursOverdue)} hours</p>
          `,
          tags: ['sla-escalation-cc'],
        });
      }
    }
  }

  /**
   * Resolve an escalation target to a specific user
   */
  private async resolveEscalationTarget(
    tenantId: string,
    target: EscalationTarget,
    request: PendingRequest
  ): Promise<{ id: string; email: string; name: string } | null> {
    switch (target.type) {
      case 'USER':
        if (target.userId) {
          const user = await prisma.user.findFirst({
            where: { id: target.userId, tenantId },
            select: { id: true, email: true, firstName: true, lastName: true },
          });
          if (user) {
            return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}` };
          }
        }
        break;

      case 'ROLE':
        if (target.role) {
          // Find a user with this role in the tenant
          const userRole = await prisma.userRole.findFirst({
            where: {
              user: { tenantId },
              role: { name: target.role },
            },
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          });
          if (userRole?.user) {
            return {
              id: userRole.user.id,
              email: userRole.user.email,
              name: `${userRole.user.firstName} ${userRole.user.lastName}`,
            };
          }
        }
        break;

      case 'MANAGER':
        // Get the current assignee's manager
        if (request.currentAssigneeId) {
          const resource = await prisma.resource.findFirst({
            where: { 
              tenantId,
              OR: [
                { user: { some: { id: request.currentAssigneeId } } },
                { email: request.currentAssigneeEmail || '' },
              ],
            },
            include: {
              manager: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          });
          if (resource?.manager) {
            return {
              id: resource.manager.id,
              email: resource.manager.email,
              name: `${resource.manager.firstName} ${resource.manager.lastName}`,
            };
          }
        }
        break;

      case 'SKIP_LEVEL_MANAGER':
        // Get manager's manager
        if (request.currentAssigneeId) {
          const resource = await prisma.resource.findFirst({
            where: {
              tenantId,
              OR: [
                { user: { some: { id: request.currentAssigneeId } } },
                { email: request.currentAssigneeEmail || '' },
              ],
            },
            include: {
              manager: {
                include: {
                  manager: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
              },
            },
          });
          if (resource?.manager?.manager) {
            return {
              id: resource.manager.manager.id,
              email: resource.manager.manager.email,
              name: `${resource.manager.manager.firstName} ${resource.manager.manager.lastName}`,
            };
          }
        }
        break;
    }

    // Fallback: find any admin
    const adminRole = await prisma.userRole.findFirst({
      where: {
        user: { tenantId },
        role: { name: 'ADMIN' },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (adminRole?.user) {
      return {
        id: adminRole.user.id,
        email: adminRole.user.email,
        name: `${adminRole.user.firstName} ${adminRole.user.lastName}`,
      };
    }

    return null;
  }

  // ============================================================================
  // Auto Actions
  // ============================================================================

  /**
   * Perform an automatic action on a request
   */
  private async performAutoAction(
    request: PendingRequest,
    autoAction: AutoAction
  ): Promise<void> {
    logger.info('Performing auto-action', {
      requestId: request.id,
      action: autoAction.action,
    });

    switch (autoAction.action) {
      case 'AUTO_APPROVE':
        await prisma.request.update({
          where: { id: request.id },
          data: {
            status: 'APPROVED',
            resolvedAt: new Date(),
            executionNotes: autoAction.reason,
          },
        });
        break;

      case 'AUTO_REJECT':
        await prisma.request.update({
          where: { id: request.id },
          data: {
            status: 'REJECTED',
            resolvedAt: new Date(),
            executionNotes: autoAction.reason,
          },
        });
        break;

      case 'CANCEL':
        await prisma.request.update({
          where: { id: request.id },
          data: {
            status: 'CANCELLED',
            resolvedAt: new Date(),
            executionNotes: autoAction.reason,
          },
        });
        break;

      case 'REASSIGN':
        if (autoAction.reassignTo) {
          const newAssignee = await this.resolveEscalationTarget(
            request.tenantId,
            autoAction.reassignTo,
            request
          );
          if (newAssignee) {
            // Find current pending approval and reassign it
            const currentApproval = await prisma.requestApproval.findFirst({
              where: {
                requestId: request.id,
                stepOrder: request.currentStepOrder,
                status: 'PENDING',
              },
            });
            
            if (currentApproval) {
              await prisma.requestApproval.update({
                where: { id: currentApproval.id },
                data: {
                  reassignedFromId: currentApproval.approverId,
                  approverId: newAssignee.id,
                  reassignedAt: new Date(),
                  reassignmentReason: autoAction.reason,
                },
              });
            }
          }
        }
        break;
    }

    // Notify the requester
    await emailService.send({
      tenantId: request.tenantId,
      to: { email: request.requesterEmail, name: request.requesterName },
      subject: `Request ${request.requestNumber} - Automatic ${autoAction.action.replace('AUTO_', '')}`,
      html: `
        <p>Hello ${request.requesterName},</p>
        <p>Your request <strong>${request.requestNumber}</strong> has been automatically ${autoAction.action.toLowerCase().replace('auto_', '')}.</p>
        <p>Reason: ${autoAction.reason}</p>
      `,
      tags: ['sla-auto-action'],
    });

    // Log the auto-action
    await prisma.auditLog.create({
      data: {
        tenantId: request.tenantId,
        userId: null, // System action
        action: autoAction.action === 'AUTO_APPROVE' ? 'APPROVE' : 
                autoAction.action === 'AUTO_REJECT' ? 'REJECT' : 'UPDATE',
        entityType: 'Request',
        entityId: request.id,
        changes: {
          autoAction: autoAction.action,
          reason: autoAction.reason,
          triggeredBy: 'SLA_BREACH',
        } as Prisma.InputJsonValue,
      },
    });
  }

  // ============================================================================
  // Stats & Management
  // ============================================================================

  /**
   * Get the last run result
   */
  getLastRunResult(): EscalationJobResult | null {
    return this.lastRunResult;
  }

  /**
   * Check if job is currently running
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get SLA status for a specific request
   */
  async getRequestSLAStatus(requestId: string, tenantId?: string): Promise<{
    status: 'OK' | 'WARNING' | 'BREACHED';
    slaDeadline: Date | null;
    minutesRemaining: number | null;
    minutesOverdue: number | null;
    escalationLevel: number;
    nextEscalationAt: Date | null;
  }> {
    const requestClient = (prisma as unknown as {
      request?: {
        findFirst?: typeof prisma.request.findFirst;
        findUnique?: typeof prisma.request.findUnique;
      };
    }).request;

    const request = requestClient?.findFirst
      ? await requestClient.findFirst({
          where: { id: requestId, ...(tenantId ? { tenantId } : {}) },
          include: {
            type: true,
          },
        })
      : requestClient?.findUnique
        ? await requestClient.findUnique({
            where: { id: requestId },
            include: {
              type: true,
            },
          })
        : null;

    if (!request || (tenantId && request.tenantId !== tenantId)) {
      throw new Error('Request not found');
    }

    const config = this.getConfig(request.tenantId, request.type.id);
    const now = new Date();

    const baseTime = request.submittedAt || request.createdAt;
    const slaDeadline = request.resolutionDueAt || 
      new Date(baseTime.getTime() + config.slaHours * 60 * 60 * 1000);

    const minutesUntilDeadline = (slaDeadline.getTime() - now.getTime()) / (1000 * 60);
    const escalationState = await this.getEscalationState(requestId);

    let status: 'OK' | 'WARNING' | 'BREACHED' = 'OK';
    let minutesRemaining: number | null = null;
    let minutesOverdue: number | null = null;

    if (minutesUntilDeadline < 0) {
      status = 'BREACHED';
      minutesOverdue = Math.round(-minutesUntilDeadline);
    } else if (config.warningHours && minutesUntilDeadline <= config.warningHours * 60) {
      status = 'WARNING';
      minutesRemaining = Math.round(minutesUntilDeadline);
    } else {
      minutesRemaining = Math.round(minutesUntilDeadline);
    }

    // Calculate next escalation time
    let nextEscalationAt: Date | null = null;
    const nextLevel = config.escalations.find(e => e.level > escalationState.currentLevel);
    if (nextLevel && status === 'BREACHED') {
      nextEscalationAt = new Date(
        slaDeadline.getTime() + nextLevel.triggerAfterHours * 60 * 60 * 1000
      );
    }

    return {
      status,
      slaDeadline,
      minutesRemaining,
      minutesOverdue,
      escalationLevel: escalationState.currentLevel,
      nextEscalationAt,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const slaEscalationService = new SLAEscalationService();

// ============================================================================
// Cron Job Setup (would use node-cron or similar in production)
// ============================================================================

let escalationInterval: NodeJS.Timeout | null = null;

/**
 * Start the SLA escalation background job
 * @param intervalMinutes How often to run (default: 15 minutes)
 */
export function startSLAEscalationJob(intervalMinutes = 15): void {
  if (escalationInterval) {
    logger.warn('SLA escalation job already started');
    return;
  }

  logger.info('Starting SLA escalation background job', { intervalMinutes });

  // Run immediately
  slaEscalationService.runEscalationJob().catch(err => {
    logger.error('Initial SLA escalation job failed', { error: err });
  });

  // Then run on interval
  escalationInterval = setInterval(
    () => {
      slaEscalationService.runEscalationJob().catch(err => {
        logger.error('SLA escalation job failed', { error: err });
      });
    },
    intervalMinutes * 60 * 1000
  );
}

/**
 * Stop the SLA escalation background job
 */
export function stopSLAEscalationJob(): void {
  if (escalationInterval) {
    clearInterval(escalationInterval);
    escalationInterval = null;
    logger.info('SLA escalation background job stopped');
  }
}

/**
 * Manually trigger the SLA escalation job (for testing)
 */
export async function triggerSLAEscalationJob(): Promise<EscalationJobResult> {
  return slaEscalationService.runEscalationJob();
}
