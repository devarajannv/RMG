/**
 * Seed script for Request Flow System - Request Types
 * Run with: npx ts-node prisma/seed-request-types.ts
 */

import { PrismaClient, RequestCategory, Priority, SlaCalculationType, RequestVisibility, RollbackPermission } from '@prisma/client';

const prisma = new PrismaClient();

interface RequestTypeDefinition {
  code: string;
  name: string;
  description: string;
  category: RequestCategory;
  defaultPriority: Priority;
  responseSlaHours: number;
  resolutionSlaHours: number;
  slaCalculationType: SlaCalculationType;
  requiresApproval: boolean;
  allowRollback: boolean;
  rollbackWindowDays: number;
  rollbackPermission: RollbackPermission;
  visibilityScope: RequestVisibility;
  onApprovalHandler: string | null;
  formSchema: object;
  requiredFields: string[];
}

const requestTypes: RequestTypeDefinition[] = [
  // ============ RESOURCE CATEGORY ============
  {
    code: 'RESOURCE_ALLOCATION',
    name: 'Resource Allocation',
    description: 'Request to allocate a resource to a project',
    category: 'RESOURCE',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 24,
    resolutionSlaHours: 72,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 30,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'TENANT',
    onApprovalHandler: 'AllocationRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid', title: 'Resource' },
        projectId: { type: 'string', format: 'uuid', title: 'Project' },
        role: { type: 'string', title: 'Role', maxLength: 100 },
        percentage: { type: 'integer', title: 'Allocation %', minimum: 1, maximum: 100 },
        startDate: { type: 'string', format: 'date', title: 'Start Date' },
        endDate: { type: 'string', format: 'date', title: 'End Date' },
        isBillable: { type: 'boolean', title: 'Billable', default: true },
        billRate: { type: 'number', title: 'Bill Rate' },
        notes: { type: 'string', title: 'Notes', maxLength: 500 },
      },
      required: ['resourceId', 'projectId', 'role', 'percentage', 'startDate', 'endDate'],
    },
    requiredFields: ['resourceId', 'projectId', 'role', 'percentage', 'startDate', 'endDate'],
  },
  {
    code: 'RESOURCE_RELEASE',
    name: 'Resource Release',
    description: 'Request to release/rolloff a resource from a project',
    category: 'RESOURCE',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 24,
    resolutionSlaHours: 48,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 14,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'TENANT',
    onApprovalHandler: 'ReleaseRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        allocationId: { type: 'string', format: 'uuid', title: 'Allocation' },
        releaseDate: { type: 'string', format: 'date', title: 'Release Date' },
        reason: { type: 'string', title: 'Release Reason', maxLength: 500 },
        handoverRequired: { type: 'boolean', title: 'Handover Required', default: false },
        handoverNotes: { type: 'string', title: 'Handover Notes', maxLength: 1000 },
      },
      required: ['allocationId', 'releaseDate', 'reason'],
    },
    requiredFields: ['allocationId', 'releaseDate', 'reason'],
  },
  {
    code: 'RESOURCE_EXTENSION',
    name: 'Allocation Extension',
    description: 'Request to extend an existing allocation',
    category: 'RESOURCE',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 24,
    resolutionSlaHours: 48,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 14,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'TENANT',
    onApprovalHandler: 'ExtensionRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        allocationId: { type: 'string', format: 'uuid', title: 'Allocation' },
        newEndDate: { type: 'string', format: 'date', title: 'New End Date' },
        reason: { type: 'string', title: 'Extension Reason', maxLength: 500 },
        percentageChange: { type: 'integer', title: 'New Allocation %', minimum: 1, maximum: 100 },
        billRateChange: { type: 'number', title: 'New Bill Rate' },
      },
      required: ['allocationId', 'newEndDate', 'reason'],
    },
    requiredFields: ['allocationId', 'newEndDate', 'reason'],
  },
  {
    code: 'RESOURCE_TRANSFER',
    name: 'Resource Transfer',
    description: 'Request to transfer resource between practices/teams',
    category: 'RESOURCE',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 48,
    resolutionSlaHours: 120,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 30,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'PRACTICE',
    onApprovalHandler: 'TransferRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid', title: 'Resource' },
        fromPracticeId: { type: 'string', format: 'uuid', title: 'From Practice' },
        toPracticeId: { type: 'string', format: 'uuid', title: 'To Practice' },
        effectiveDate: { type: 'string', format: 'date', title: 'Effective Date' },
        reason: { type: 'string', title: 'Transfer Reason', maxLength: 500 },
        newManagerId: { type: 'string', format: 'uuid', title: 'New Manager' },
      },
      required: ['resourceId', 'fromPracticeId', 'toPracticeId', 'effectiveDate', 'reason'],
    },
    requiredFields: ['resourceId', 'fromPracticeId', 'toPracticeId', 'effectiveDate', 'reason'],
  },

  // ============ HR CATEGORY ============
  {
    code: 'RESOURCE_ONBOARDING',
    name: 'Resource Onboarding',
    description: 'New employee onboarding request',
    category: 'HR',
    defaultPriority: 'HIGH',
    responseSlaHours: 24,
    resolutionSlaHours: 168, // 7 days
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: false,
    rollbackWindowDays: 0,
    rollbackPermission: 'NONE',
    visibilityScope: 'CONFIDENTIAL',
    onApprovalHandler: 'OnboardingRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', title: 'First Name', maxLength: 100 },
        lastName: { type: 'string', title: 'Last Name', maxLength: 100 },
        email: { type: 'string', format: 'email', title: 'Email' },
        employmentType: { type: 'string', enum: ['FTE', 'CONTRACTOR', 'INTERN'], title: 'Employment Type' },
        practiceId: { type: 'string', format: 'uuid', title: 'Practice' },
        managerId: { type: 'string', format: 'uuid', title: 'Manager' },
        designation: { type: 'string', title: 'Designation', maxLength: 100 },
        band: { type: 'string', title: 'Band', maxLength: 10 },
        dateOfJoining: { type: 'string', format: 'date', title: 'Date of Joining' },
        locationId: { type: 'string', format: 'uuid', title: 'Location' },
        costPerHour: { type: 'number', title: 'Cost Per Hour' },
        skills: { type: 'array', items: { type: 'string' }, title: 'Skills' },
      },
      required: ['firstName', 'lastName', 'email', 'employmentType', 'practiceId', 'designation', 'band', 'dateOfJoining'],
    },
    requiredFields: ['firstName', 'lastName', 'email', 'employmentType', 'practiceId', 'designation', 'band', 'dateOfJoining'],
  },
  {
    code: 'RESOURCE_OFFBOARDING',
    name: 'Resource Offboarding',
    description: 'Employee exit/offboarding request',
    category: 'HR',
    defaultPriority: 'HIGH',
    responseSlaHours: 24,
    resolutionSlaHours: 72,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 90,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'CONFIDENTIAL',
    onApprovalHandler: 'OffboardingRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid', title: 'Resource' },
        lastWorkingDate: { type: 'string', format: 'date', title: 'Last Working Date' },
        exitReason: { type: 'string', enum: ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'CONTRACT_END', 'OTHER'], title: 'Exit Reason' },
        exitReasonDetails: { type: 'string', title: 'Exit Details', maxLength: 1000 },
        handoverRequired: { type: 'boolean', title: 'Handover Required', default: true },
        knowledgeTransferPlan: { type: 'string', title: 'Knowledge Transfer Plan', maxLength: 2000 },
        assetsToReturn: { type: 'array', items: { type: 'string' }, title: 'Assets to Return' },
      },
      required: ['resourceId', 'lastWorkingDate', 'exitReason'],
    },
    requiredFields: ['resourceId', 'lastWorkingDate', 'exitReason'],
  },
  {
    code: 'LEAVE_REQUEST',
    name: 'Leave Request',
    description: 'Employee leave request',
    category: 'HR',
    defaultPriority: 'LOW',
    responseSlaHours: 48,
    resolutionSlaHours: 72,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 7,
    rollbackPermission: 'REQUESTER',
    visibilityScope: 'PARTICIPANTS',
    onApprovalHandler: null,
    formSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid', title: 'Resource' },
        leaveType: { type: 'string', enum: ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'], title: 'Leave Type' },
        startDate: { type: 'string', format: 'date', title: 'Start Date' },
        endDate: { type: 'string', format: 'date', title: 'End Date' },
        halfDay: { type: 'boolean', title: 'Half Day', default: false },
        reason: { type: 'string', title: 'Reason', maxLength: 500 },
        coveringResourceId: { type: 'string', format: 'uuid', title: 'Covering Resource' },
      },
      required: ['resourceId', 'leaveType', 'startDate', 'endDate'],
    },
    requiredFields: ['resourceId', 'leaveType', 'startDate', 'endDate'],
  },
  {
    code: 'SKILL_UPDATE',
    name: 'Skill Update',
    description: 'Request to update resource skills/certifications',
    category: 'HR',
    defaultPriority: 'LOW',
    responseSlaHours: 72,
    resolutionSlaHours: 120,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 30,
    rollbackPermission: 'REQUESTER',
    visibilityScope: 'TENANT',
    onApprovalHandler: 'SkillUpdateRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid', title: 'Resource' },
        action: { type: 'string', enum: ['ADD', 'UPDATE', 'REMOVE'], title: 'Action' },
        skillId: { type: 'string', format: 'uuid', title: 'Skill' },
        proficiency: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], title: 'Proficiency' },
        yearsExperience: { type: 'number', title: 'Years Experience' },
        certified: { type: 'boolean', title: 'Certified', default: false },
        certificationExpiry: { type: 'string', format: 'date', title: 'Certification Expiry' },
        evidence: { type: 'string', title: 'Evidence/Notes', maxLength: 1000 },
      },
      required: ['resourceId', 'action', 'skillId'],
    },
    requiredFields: ['resourceId', 'action', 'skillId'],
  },

  // ============ PROJECT CATEGORY ============
  {
    code: 'PROJECT_CREATION',
    name: 'Project Creation',
    description: 'New project setup request',
    category: 'PROJECT',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 48,
    resolutionSlaHours: 120,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 7,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'TENANT',
    onApprovalHandler: 'ProjectCreationRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Project Name', maxLength: 200 },
        code: { type: 'string', title: 'Project Code', maxLength: 50 },
        description: { type: 'string', title: 'Description', maxLength: 2000 },
        clientId: { type: 'string', format: 'uuid', title: 'Client' },
        contractId: { type: 'string', format: 'uuid', title: 'Contract' },
        managerId: { type: 'string', format: 'uuid', title: 'Project Manager' },
        practiceId: { type: 'string', format: 'uuid', title: 'Practice' },
        type: { type: 'string', enum: ['BILLABLE', 'INTERNAL', 'PRESALES', 'SUPPORT'], title: 'Project Type' },
        deliveryModel: { type: 'string', enum: ['ONSITE', 'OFFSHORE', 'HYBRID'], title: 'Delivery Model' },
        startDate: { type: 'string', format: 'date', title: 'Start Date' },
        endDate: { type: 'string', format: 'date', title: 'End Date' },
        budgetHours: { type: 'integer', title: 'Budget Hours' },
        budgetAmount: { type: 'number', title: 'Budget Amount' },
        billingType: { type: 'string', enum: ['TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID'], title: 'Billing Type' },
      },
      required: ['name', 'code', 'type', 'startDate'],
    },
    requiredFields: ['name', 'code', 'type', 'startDate'],
  },
  {
    code: 'PROJECT_CLOSURE',
    name: 'Project Closure',
    description: 'Project closure request',
    category: 'PROJECT',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 48,
    resolutionSlaHours: 168,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 30,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'TENANT',
    onApprovalHandler: 'ProjectClosureRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', format: 'uuid', title: 'Project' },
        closureDate: { type: 'string', format: 'date', title: 'Closure Date' },
        closureReason: { type: 'string', enum: ['COMPLETED', 'CANCELLED', 'ON_HOLD'], title: 'Closure Reason' },
        closureNotes: { type: 'string', title: 'Closure Notes', maxLength: 2000 },
        releaseResources: { type: 'boolean', title: 'Release All Resources', default: true },
        lessonsLearned: { type: 'string', title: 'Lessons Learned', maxLength: 5000 },
        finalInvoiceSent: { type: 'boolean', title: 'Final Invoice Sent', default: false },
      },
      required: ['projectId', 'closureDate', 'closureReason'],
    },
    requiredFields: ['projectId', 'closureDate', 'closureReason'],
  },

  // ============ CONTRACT CATEGORY ============
  {
    code: 'CONTRACT_CREATION',
    name: 'Contract Creation',
    description: 'New contract (MSA/SOW/CR) request',
    category: 'CONTRACT',
    defaultPriority: 'HIGH',
    responseSlaHours: 24,
    resolutionSlaHours: 168,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 7,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'PRACTICE',
    onApprovalHandler: 'ContractCreationRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', format: 'uuid', title: 'Client' },
        contractNumber: { type: 'string', title: 'Contract Number', maxLength: 50 },
        name: { type: 'string', title: 'Contract Name', maxLength: 200 },
        type: { type: 'string', enum: ['MSA', 'SOW', 'AMENDMENT', 'NDA', 'OTHER'], title: 'Contract Type' },
        description: { type: 'string', title: 'Description', maxLength: 2000 },
        startDate: { type: 'string', format: 'date', title: 'Start Date' },
        endDate: { type: 'string', format: 'date', title: 'End Date' },
        value: { type: 'number', title: 'Contract Value' },
        currency: { type: 'string', title: 'Currency', maxLength: 3, default: 'INR' },
        billingType: { type: 'string', enum: ['TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID'], title: 'Billing Type' },
        paymentTerms: { type: 'string', title: 'Payment Terms', maxLength: 50 },
        autoRenew: { type: 'boolean', title: 'Auto Renew', default: false },
        accountManagerId: { type: 'string', format: 'uuid', title: 'Account Manager' },
      },
      required: ['clientId', 'contractNumber', 'name', 'type', 'startDate', 'billingType'],
    },
    requiredFields: ['clientId', 'contractNumber', 'name', 'type', 'startDate', 'billingType'],
  },
  {
    code: 'CONTRACT_AMENDMENT',
    name: 'Contract Amendment',
    description: 'Contract change request',
    category: 'CONTRACT',
    defaultPriority: 'HIGH',
    responseSlaHours: 24,
    resolutionSlaHours: 120,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 30,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'PRACTICE',
    onApprovalHandler: 'ContractAmendmentRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        contractId: { type: 'string', format: 'uuid', title: 'Contract' },
        amendmentType: { type: 'string', enum: ['VALUE_CHANGE', 'TERM_EXTENSION', 'SCOPE_CHANGE', 'RATE_CHANGE', 'OTHER'], title: 'Amendment Type' },
        description: { type: 'string', title: 'Amendment Description', maxLength: 2000 },
        newValue: { type: 'number', title: 'New Contract Value' },
        newEndDate: { type: 'string', format: 'date', title: 'New End Date' },
        effectiveDate: { type: 'string', format: 'date', title: 'Effective Date' },
        impactAnalysis: { type: 'string', title: 'Impact Analysis', maxLength: 3000 },
      },
      required: ['contractId', 'amendmentType', 'description', 'effectiveDate'],
    },
    requiredFields: ['contractId', 'amendmentType', 'description', 'effectiveDate'],
  },

  // ============ FINANCE CATEGORY ============
  {
    code: 'RATE_CHANGE',
    name: 'Rate Change',
    description: 'Bill rate or cost rate change request',
    category: 'FINANCE',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 48,
    resolutionSlaHours: 120,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 60,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'CONFIDENTIAL',
    onApprovalHandler: 'RateChangeRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['RESOURCE', 'ALLOCATION', 'PROJECT'], title: 'Apply To' },
        entityId: { type: 'string', format: 'uuid', title: 'Entity' },
        rateType: { type: 'string', enum: ['BILL_RATE', 'COST_RATE', 'BOTH'], title: 'Rate Type' },
        currentBillRate: { type: 'number', title: 'Current Bill Rate' },
        newBillRate: { type: 'number', title: 'New Bill Rate' },
        currentCostRate: { type: 'number', title: 'Current Cost Rate' },
        newCostRate: { type: 'number', title: 'New Cost Rate' },
        effectiveDate: { type: 'string', format: 'date', title: 'Effective Date' },
        reason: { type: 'string', title: 'Reason for Change', maxLength: 1000 },
        applyToExisting: { type: 'boolean', title: 'Apply to Existing Allocations', default: false },
      },
      required: ['entityType', 'entityId', 'rateType', 'effectiveDate', 'reason'],
    },
    requiredFields: ['entityType', 'entityId', 'rateType', 'effectiveDate', 'reason'],
  },
  {
    code: 'TIMESHEET_APPROVAL',
    name: 'Timesheet Approval',
    description: 'Timesheet submission for approval',
    category: 'FINANCE',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 48,
    resolutionSlaHours: 72,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 7,
    rollbackPermission: 'REQUESTER',
    visibilityScope: 'PARTICIPANTS',
    onApprovalHandler: 'TimesheetApprovalHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid', title: 'Resource' },
        periodStart: { type: 'string', format: 'date', title: 'Period Start' },
        periodEnd: { type: 'string', format: 'date', title: 'Period End' },
        totalHours: { type: 'number', title: 'Total Hours' },
        billableHours: { type: 'number', title: 'Billable Hours' },
        overtimeHours: { type: 'number', title: 'Overtime Hours' },
        comments: { type: 'string', title: 'Comments', maxLength: 1000 },
      },
      required: ['resourceId', 'periodStart', 'periodEnd', 'totalHours'],
    },
    requiredFields: ['resourceId', 'periodStart', 'periodEnd', 'totalHours'],
  },

  // ============ ADMIN CATEGORY ============
  {
    code: 'ACCESS_REQUEST',
    name: 'Access Request',
    description: 'System access or role change request',
    category: 'ADMIN',
    defaultPriority: 'MEDIUM',
    responseSlaHours: 24,
    resolutionSlaHours: 48,
    slaCalculationType: 'BUSINESS_HOURS',
    requiresApproval: true,
    allowRollback: true,
    rollbackWindowDays: 90,
    rollbackPermission: 'ADMIN_ONLY',
    visibilityScope: 'CONFIDENTIAL',
    onApprovalHandler: 'AccessRequestHandler.execute',
    formSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid', title: 'User' },
        requestType: { type: 'string', enum: ['NEW_ACCESS', 'ROLE_CHANGE', 'PERMISSION_ADD', 'PERMISSION_REMOVE', 'DEACTIVATE'], title: 'Request Type' },
        roleIds: { type: 'array', items: { type: 'string', format: 'uuid' }, title: 'Roles' },
        permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' }, title: 'Permissions' },
        effectiveDate: { type: 'string', format: 'date', title: 'Effective Date' },
        expiryDate: { type: 'string', format: 'date', title: 'Expiry Date' },
        justification: { type: 'string', title: 'Business Justification', maxLength: 1000 },
      },
      required: ['userId', 'requestType', 'justification'],
    },
    requiredFields: ['userId', 'requestType', 'justification'],
  },
];

async function seedRequestTypes(): Promise<void> {
  console.log('🌱 Seeding Request Types...');

  for (const rt of requestTypes) {
    const existing = await prisma.requestType.findUnique({
      where: { code: rt.code },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping ${rt.code} (already exists)`);
      continue;
    }

    await prisma.requestType.create({
      data: {
        code: rt.code,
        name: rt.name,
        description: rt.description,
        category: rt.category,
        defaultPriority: rt.defaultPriority,
        responseSlaHours: rt.responseSlaHours,
        resolutionSlaHours: rt.resolutionSlaHours,
        slaCalculationType: rt.slaCalculationType,
        isActive: true,
        isSystemType: true,
        requiresApproval: rt.requiresApproval,
        allowDraft: true,
        allowAttachments: true,
        maxAttachmentSizeMb: 10,
        maxAttachments: 5,
        formSchema: rt.formSchema,
        formSchemaVersion: 1,
        requiredFields: rt.requiredFields,
        sensitiveFields: [],
        onApprovalHandler: rt.onApprovalHandler,
        allowRollback: rt.allowRollback,
        rollbackWindowDays: rt.rollbackWindowDays,
        rollbackRequiresApproval: true,
        rollbackPermission: rt.rollbackPermission,
        visibilityScope: rt.visibilityScope,
        retentionDays: 2555, // ~7 years
      },
    });

    console.log(`  ✅ Created ${rt.code}`);
  }

  console.log('✨ Request Types seeding complete!');
}

async function seedBusinessHoursConfig(): Promise<void> {
  console.log('🌱 Seeding Business Hours Config...');

  // Get the first tenant (NewVision)
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('  ⚠️  No tenant found, skipping business hours config');
    return;
  }

  const existing = await prisma.businessHoursConfig.findUnique({
    where: { tenantId: tenant.id },
  });

  if (existing) {
    console.log('  ⏭️  Business hours config already exists');
    return;
  }

  await prisma.businessHoursConfig.create({
    data: {
      tenantId: tenant.id,
      timezone: 'Asia/Kolkata',
      startHour: 9,
      startMinute: 0,
      endHour: 18,
      endMinute: 0,
      workDays: [1, 2, 3, 4, 5], // Monday to Friday
    },
  });

  console.log('  ✅ Created business hours config for', tenant.name);
}

async function main(): Promise<void> {
  try {
    await seedRequestTypes();
    await seedBusinessHoursConfig();
    console.log('\n🎉 All seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
