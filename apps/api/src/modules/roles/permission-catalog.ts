export type PermissionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PermissionCategory =
  | 'OPERATIONAL'
  | 'APPROVAL'
  | 'GOVERNANCE'
  | 'SENSITIVE'
  | 'ADMIN'
  | 'AUTOMATION';

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  section: string;
  group: string;
  category: PermissionCategory;
  riskLevel: PermissionRiskLevel;
  aliases?: string[];
}

export interface PermissionSection {
  key: string;
  label: string;
  description: string;
  groups: Array<{
    key: string;
    label: string;
    permissions: PermissionDefinition[];
  }>;
}

export interface PermissionPreset {
  code: string;
  name: string;
  description: string;
  permissionKeys: string[];
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: 'resource:read',
    label: 'View resources',
    description: 'View resource profiles and resource operational data.',
    section: 'operational',
    group: 'resources',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['resources:read'],
  },
  {
    key: 'resource:write',
    label: 'Manage resources',
    description: 'Create, update, and delete resources and related master data.',
    section: 'operational',
    group: 'resources',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['resources:create', 'resources:update', 'resources:delete'],
  },
  {
    key: 'resource:read:own',
    label: 'View own resource profile',
    description: 'View only the user’s own resource profile.',
    section: 'operational',
    group: 'resources',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['resources:read:own'],
  },
  {
    key: 'resource:read:team',
    label: 'View team resources',
    description: 'View resources within the user’s team scope.',
    section: 'operational',
    group: 'resources',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['resources:read:team'],
  },
  {
    key: 'resource:read:practice',
    label: 'View practice resources',
    description: 'View resources within the user’s practice scope.',
    section: 'operational',
    group: 'resources',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['resources:read:practice'],
  },
  {
    key: 'project:read',
    label: 'View projects',
    description: 'View project records and project detail pages.',
    section: 'operational',
    group: 'projects',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['projects:read'],
  },
  {
    key: 'project:write',
    label: 'Manage projects',
    description: 'Create, update, and delete projects.',
    section: 'operational',
    group: 'projects',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['projects:create', 'projects:update', 'projects:delete'],
  },
  {
    key: 'allocation:create',
    label: 'Create allocations',
    description: 'Create allocation requests and direct allocation records.',
    section: 'operational',
    group: 'allocations',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['allocations:create'],
  },
  {
    key: 'allocation:read',
    label: 'View allocations',
    description: 'View allocation records and allocation planning data.',
    section: 'operational',
    group: 'allocations',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['allocations:read'],
  },
  {
    key: 'allocation:write',
    label: 'Manage allocations',
    description: 'Update or delete allocation records.',
    section: 'operational',
    group: 'allocations',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['allocations:update', 'allocations:delete'],
  },
  {
    key: 'allocation:approve',
    label: 'Approve allocations',
    description: 'Approve, reject, or otherwise disposition allocation approvals.',
    section: 'approvals',
    group: 'allocations',
    category: 'APPROVAL',
    riskLevel: 'HIGH',
    aliases: ['allocations:approve'],
  },
  {
    key: 'timesheet:read',
    label: 'View timesheets',
    description: 'View timesheet records and submission history.',
    section: 'operational',
    group: 'timesheets',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['timesheets:read'],
  },
  {
    key: 'timesheet:write',
    label: 'Manage timesheets',
    description: 'Create and update timesheet entries and periods.',
    section: 'operational',
    group: 'timesheets',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['timesheets:create', 'timesheets:update'],
  },
  {
    key: 'timesheet:approve',
    label: 'Approve timesheets',
    description: 'Approve, reject, or return timesheets.',
    section: 'approvals',
    group: 'timesheets',
    category: 'APPROVAL',
    riskLevel: 'HIGH',
    aliases: ['timesheets:approve'],
  },
  {
    key: 'client:read',
    label: 'View clients',
    description: 'View customer/client records.',
    section: 'operational',
    group: 'clients',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['clients:read'],
  },
  {
    key: 'client:write',
    label: 'Manage clients',
    description: 'Create, update, and delete customer/client records.',
    section: 'operational',
    group: 'clients',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['clients:create', 'clients:update', 'clients:delete'],
  },
  {
    key: 'contract:read',
    label: 'View contracts',
    description: 'View contracts including NDA, MSA, SOW, and amendments.',
    section: 'operational',
    group: 'contracts',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['contracts:read'],
  },
  {
    key: 'contract:write',
    label: 'Manage contracts',
    description: 'Create, update, activate, terminate, renew, and delete contracts.',
    section: 'operational',
    group: 'contracts',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['contracts:create', 'contracts:update', 'contracts:delete', 'contracts:approve'],
  },
  {
    key: 'document:read',
    label: 'View documents',
    description: 'View and download documents and document versions.',
    section: 'documents',
    group: 'documents',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['documents:read'],
  },
  {
    key: 'document:create',
    label: 'Upload documents',
    description: 'Upload documents and new document versions.',
    section: 'documents',
    group: 'documents',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['documents:create'],
  },
  {
    key: 'document:update',
    label: 'Edit document metadata',
    description: 'Edit document metadata and update document details.',
    section: 'documents',
    group: 'documents',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['documents:update'],
  },
  {
    key: 'document:delete',
    label: 'Delete documents',
    description: 'Delete documents from the tenant document store.',
    section: 'documents',
    group: 'documents',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['documents:delete'],
  },
  {
    key: 'document:manage',
    label: 'Manage document access',
    description: 'Grant or revoke document access and manage document-sharing controls.',
    section: 'documents',
    group: 'documents',
    category: 'GOVERNANCE',
    riskLevel: 'HIGH',
  },
  {
    key: 'request:read',
    label: 'View requests',
    description: 'View requests, approvals, comments, attachments, and history.',
    section: 'requests',
    group: 'requests',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['requests:read'],
  },
  {
    key: 'request:create',
    label: 'Create requests',
    description: 'Create, submit, cancel, and upload attachments for requests.',
    section: 'requests',
    group: 'requests',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['requests:create'],
  },
  {
    key: 'request:update',
    label: 'Edit requests',
    description: 'Update requests and modify request-linked data.',
    section: 'requests',
    group: 'requests',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['requests:update'],
  },
  {
    key: 'request:delete',
    label: 'Delete requests',
    description: 'Delete requests.',
    section: 'requests',
    group: 'requests',
    category: 'OPERATIONAL',
    riskLevel: 'HIGH',
    aliases: ['requests:delete'],
  },
  {
    key: 'request:approve',
    label: 'Approve requests',
    description: 'Approve, reject, or return requests in approval flows.',
    section: 'approvals',
    group: 'requests',
    category: 'APPROVAL',
    riskLevel: 'HIGH',
    aliases: ['requests:approve'],
  },
  {
    key: 'report:read',
    label: 'View reports',
    description: 'View reports, dashboards, and analytics-backed reporting APIs.',
    section: 'reporting',
    group: 'reporting',
    category: 'OPERATIONAL',
    riskLevel: 'LOW',
    aliases: ['reports:read', 'analytics:read'],
  },
  {
    key: 'report:export',
    label: 'Export reports',
    description: 'Export report outputs where export controls are available.',
    section: 'reporting',
    group: 'reporting',
    category: 'OPERATIONAL',
    riskLevel: 'MEDIUM',
    aliases: ['reports:export'],
  },
  {
    key: 'settings:read',
    label: 'View tenant settings',
    description: 'View tenant-wide settings and admin configuration pages.',
    section: 'governance',
    group: 'settings',
    category: 'GOVERNANCE',
    riskLevel: 'LOW',
  },
  {
    key: 'settings:update',
    label: 'Manage tenant settings',
    description: 'Update tenant-wide settings and configuration.',
    section: 'governance',
    group: 'settings',
    category: 'GOVERNANCE',
    riskLevel: 'HIGH',
  },
  {
    key: 'users:read',
    label: 'View users',
    description: 'View user records and user-account information.',
    section: 'access-admin',
    group: 'users',
    category: 'ADMIN',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'users:create',
    label: 'Create users',
    description: 'Create tenant user accounts.',
    section: 'access-admin',
    group: 'users',
    category: 'ADMIN',
    riskLevel: 'HIGH',
  },
  {
    key: 'users:update',
    label: 'Manage users',
    description: 'Update users, toggle status, reset passwords, and assign user roles through user admin flows.',
    section: 'access-admin',
    group: 'users',
    category: 'ADMIN',
    riskLevel: 'HIGH',
  },
  {
    key: 'users:delete',
    label: 'Delete users',
    description: 'Delete tenant user accounts.',
    section: 'access-admin',
    group: 'users',
    category: 'ADMIN',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'role:read',
    label: 'View roles',
    description: 'View role definitions and role assignments.',
    section: 'access-admin',
    group: 'roles',
    category: 'ADMIN',
    riskLevel: 'MEDIUM',
    aliases: ['roles:read'],
  },
  {
    key: 'role:write',
    label: 'Manage roles',
    description: 'Create and update role definitions.',
    section: 'access-admin',
    group: 'roles',
    category: 'ADMIN',
    riskLevel: 'CRITICAL',
    aliases: ['roles:create', 'roles:update'],
  },
  {
    key: 'role:delete',
    label: 'Delete roles',
    description: 'Delete role definitions.',
    section: 'access-admin',
    group: 'roles',
    category: 'ADMIN',
    riskLevel: 'CRITICAL',
    aliases: ['roles:delete'],
  },
  {
    key: 'role:assign',
    label: 'Assign roles',
    description: 'Assign and revoke roles from users.',
    section: 'access-admin',
    group: 'roles',
    category: 'ADMIN',
    riskLevel: 'CRITICAL',
    aliases: ['roles:assign'],
  },
  {
    key: 'role:admin',
    label: 'Initialize role permissions',
    description: 'Run high-privilege role and permission administration operations.',
    section: 'access-admin',
    group: 'roles',
    category: 'ADMIN',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'role:audit',
    label: 'View role assignment audit',
    description: 'View role assignment and revocation history.',
    section: 'audit',
    group: 'audit',
    category: 'SENSITIVE',
    riskLevel: 'HIGH',
  },
  {
    key: 'audit:read',
    label: 'View audit logs',
    description: 'View tenant audit logs and entity activity history.',
    section: 'audit',
    group: 'audit',
    category: 'SENSITIVE',
    riskLevel: 'HIGH',
  },
  {
    key: 'audit:export',
    label: 'Export audit logs',
    description: 'Export audit logs from the tenant audit trail.',
    section: 'audit',
    group: 'audit',
    category: 'SENSITIVE',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'request-types:read',
    label: 'View request types',
    description: 'View request type definitions, packs, and blueprints.',
    section: 'governance',
    group: 'request-types',
    category: 'GOVERNANCE',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'request-types:create',
    label: 'Create request types',
    description: 'Create tenant request types.',
    section: 'governance',
    group: 'request-types',
    category: 'GOVERNANCE',
    riskLevel: 'HIGH',
  },
  {
    key: 'request-types:update',
    label: 'Manage request types',
    description: 'Update request types and assign workflows.',
    section: 'governance',
    group: 'request-types',
    category: 'GOVERNANCE',
    riskLevel: 'HIGH',
  },
  {
    key: 'request-types:delete',
    label: 'Delete request types',
    description: 'Delete tenant request types.',
    section: 'governance',
    group: 'request-types',
    category: 'GOVERNANCE',
    riskLevel: 'CRITICAL',
  },
  {
    key: 'request-types:clone',
    label: 'Clone request types',
    description: 'Clone request types from existing definitions.',
    section: 'governance',
    group: 'request-types',
    category: 'GOVERNANCE',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'request-templates:read',
    label: 'View request templates',
    description: 'View request type templates.',
    section: 'governance',
    group: 'request-templates',
    category: 'GOVERNANCE',
    riskLevel: 'LOW',
  },
  {
    key: 'request-templates:import',
    label: 'Import request templates',
    description: 'Import templates to create request types and workflows.',
    section: 'governance',
    group: 'request-templates',
    category: 'GOVERNANCE',
    riskLevel: 'HIGH',
  },
  {
    key: 'workflow:read',
    label: 'View workflows',
    description: 'View approval chains and workflow definitions.',
    section: 'governance',
    group: 'workflows',
    category: 'GOVERNANCE',
    riskLevel: 'MEDIUM',
    aliases: ['workflows:read'],
  },
  {
    key: 'workflow:manage',
    label: 'Manage workflows',
    description: 'Create, update, delete, and assign approval chains and workflow definitions.',
    section: 'governance',
    group: 'workflows',
    category: 'GOVERNANCE',
    riskLevel: 'CRITICAL',
    aliases: ['workflows:create', 'workflows:update', 'workflows:delete'],
  },
  {
    key: 'sla:read',
    label: 'View SLA policies',
    description: 'View SLA configuration and SLA reports.',
    section: 'governance',
    group: 'sla',
    category: 'GOVERNANCE',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'sla:manage',
    label: 'Manage SLA policies',
    description: 'Manage business hours, holidays, and SLA controls.',
    section: 'governance',
    group: 'sla',
    category: 'GOVERNANCE',
    riskLevel: 'HIGH',
  },
  {
    key: 'triggers:read',
    label: 'View request triggers',
    description: 'View trigger-based request automation definitions.',
    section: 'automation',
    group: 'automation',
    category: 'AUTOMATION',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'triggers:manage',
    label: 'Manage request triggers',
    description: 'Create and manage trigger-based request automation.',
    section: 'automation',
    group: 'automation',
    category: 'AUTOMATION',
    riskLevel: 'HIGH',
  },
  {
    key: 'import:read',
    label: 'View imports',
    description: 'View import jobs and import history.',
    section: 'automation',
    group: 'imports',
    category: 'AUTOMATION',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'import:write',
    label: 'Run imports',
    description: 'Run data import and migration jobs.',
    section: 'automation',
    group: 'imports',
    category: 'AUTOMATION',
    riskLevel: 'HIGH',
  },
  {
    key: 'agent:query',
    label: 'Use AI assistant',
    description: 'Use tenant-facing AI assistant query flows.',
    section: 'automation',
    group: 'ai',
    category: 'AUTOMATION',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'agent:manage',
    label: 'Manage AI conversations',
    description: 'View and manage AI conversation history.',
    section: 'automation',
    group: 'ai',
    category: 'AUTOMATION',
    riskLevel: 'HIGH',
  },
  {
    key: 'ctc:read:own',
    label: 'View own compensation',
    description: 'View the user’s own compensation data.',
    section: 'sensitive',
    group: 'compensation',
    category: 'SENSITIVE',
    riskLevel: 'MEDIUM',
  },
  {
    key: 'ctc:read:all',
    label: 'View all compensation',
    description: 'View compensation data for all users.',
    section: 'sensitive',
    group: 'compensation',
    category: 'SENSITIVE',
    riskLevel: 'CRITICAL',
  },
];

const SECTION_META: Array<{ key: string; label: string; description: string }> = [
  {
    key: 'operational',
    label: 'Operational Work',
    description: 'Direct day-to-day access to business records and operational modules.',
  },
  {
    key: 'documents',
    label: 'Documents And Artefacts',
    description: 'Document upload, edit, delete, and access-control capabilities.',
  },
  {
    key: 'requests',
    label: 'Requests',
    description: 'Request creation and request-processing access.',
  },
  {
    key: 'approvals',
    label: 'Approval Participation',
    description: 'Authority to approve or disposition records in approval flows.',
  },
  {
    key: 'reporting',
    label: 'Reporting',
    description: 'Reporting and analytics visibility and export controls.',
  },
  {
    key: 'governance',
    label: 'Workflow And Governance',
    description: 'Request, workflow, SLA, and tenant-governance configuration powers.',
  },
  {
    key: 'access-admin',
    label: 'Role And User Administration',
    description: 'User, role, and access-administration capabilities.',
  },
  {
    key: 'audit',
    label: 'Audit And Sensitive Oversight',
    description: 'Audit visibility and elevated oversight controls.',
  },
  {
    key: 'automation',
    label: 'Automation And Integrations',
    description: 'Imports, triggers, AI, and automation-oriented controls.',
  },
  {
    key: 'sensitive',
    label: 'Sensitive Data',
    description: 'Access to high-sensitivity information such as compensation.',
  },
];

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    code: 'PMO',
    name: 'PMO',
    description: 'Professional services PMO operating role with customer, contract, project, document, request, and reporting access.',
    permissionKeys: [
      'client:read',
      'client:write',
      'contract:read',
      'contract:write',
      'project:read',
      'project:write',
      'document:read',
      'document:create',
      'document:update',
      'request:read',
      'request:create',
      'request:update',
      'report:read',
      'workflow:read',
      'request-types:read',
      'audit:read',
    ],
  },
];

const definitionByKey = new Map(PERMISSION_CATALOG.map((definition) => [definition.key, definition]));

const aliasToCanonical = new Map<string, string>();
for (const definition of PERMISSION_CATALOG) {
  aliasToCanonical.set(definition.key, definition.key);
  for (const alias of definition.aliases ?? []) {
    aliasToCanonical.set(alias, definition.key);
  }
}

export function canonicalizePermissionKey(permissionKey: string): string {
  return aliasToCanonical.get(permissionKey) ?? permissionKey;
}

export function expandPermissionKeys(permissionKeys: string[]): string[] {
  const expanded = new Set<string>();

  for (const permissionKey of permissionKeys) {
    const canonicalKey = canonicalizePermissionKey(permissionKey);
    expanded.add(canonicalKey);

    const definition = definitionByKey.get(canonicalKey);
    for (const alias of definition?.aliases ?? []) {
      expanded.add(alias);
    }
  }

  return Array.from(expanded).sort();
}

export function buildPermissionKey(module: string, action: string, scope?: string): string {
  const baseKey = `${module}:${action}`;
  if (!scope || scope === 'ALL') {
    return canonicalizePermissionKey(baseKey);
  }
  return canonicalizePermissionKey(`${baseKey}:${scope.toLowerCase()}`);
}

export function isKnownPermissionKey(permissionKey: string): boolean {
  return aliasToCanonical.has(permissionKey);
}

export function getPermissionDefinition(permissionKey: string): PermissionDefinition | undefined {
  return definitionByKey.get(canonicalizePermissionKey(permissionKey));
}

export function getPermissionCatalog(): { permissions: PermissionDefinition[]; sections: PermissionSection[]; presets: PermissionPreset[] } {
  const sections = SECTION_META.map<PermissionSection>((sectionMeta) => {
    const definitions = PERMISSION_CATALOG.filter((definition) => definition.section === sectionMeta.key);
    const groupMap = new Map<string, PermissionDefinition[]>();

    for (const definition of definitions) {
      const groupDefinitions = groupMap.get(definition.group) ?? [];
      groupDefinitions.push(definition);
      groupMap.set(definition.group, groupDefinitions);
    }

    return {
      key: sectionMeta.key,
      label: sectionMeta.label,
      description: sectionMeta.description,
      groups: Array.from(groupMap.entries()).map(([groupKey, groupDefinitions]) => ({
        key: groupKey,
        label: groupKey
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
        permissions: groupDefinitions,
      })),
    };
  }).filter((section) => section.groups.length > 0);

  return {
    permissions: PERMISSION_CATALOG,
    sections,
    presets: PERMISSION_PRESETS,
  };
}
