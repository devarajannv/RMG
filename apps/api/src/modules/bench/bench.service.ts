import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface BenchResourceDetail {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  band: string;
  practice: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  benchDays: number;
  benchSince: Date | null;
  benchCost: number;
  costPerHour: number;
  skills: Array<{
    id: string;
    name: string;
    category: string | null;
    proficiency: string;
  }>;
  lastProject: { id: string; name: string; client: string | null } | null;
  lastAllocationEnd: Date | null;
  agingCategory: 'fresh' | 'moderate' | 'critical' | 'severe';
}

export interface UpcomingRolloff {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceEmail: string;
  employeeId: string;
  band: string;
  designation: string;
  practice: string | null;
  project: { id: string; name: string; client: string | null };
  allocationPercentage: number;
  endDate: Date;
  daysUntilRolloff: number;
  hasNextAllocation: boolean;
  nextAllocation: {
    project: string;
    startDate: Date;
    percentage: number;
  } | null;
  skills: string[];
}

export interface BenchForecast {
  date: string;
  projectedBenchCount: number;
  projectedBenchCost: number;
  rolloffsCount: number;
  newAllocationsCount: number;
  cumulativeChange: number;
}

export interface BenchSummary {
  totalOnBench: number;
  totalBenchCost: number;
  avgBenchDays: number;
  benchByAging: {
    fresh: number;    // 0-7 days
    moderate: number; // 8-30 days
    critical: number; // 31-60 days
    severe: number;   // 60+ days
  };
  benchByPractice: Array<{
    practiceId: string;
    practiceName: string;
    count: number;
    cost: number;
    avgDays: number;
  }>;
  benchByBand: Array<{
    band: string;
    count: number;
    cost: number;
  }>;
  benchTrend: Array<{
    date: string;
    count: number;
    cost: number;
  }>;
  upcomingRolloffs: number;
  willBeOnBenchIn30Days: number;
}

export interface QuickAllocationInput {
  resourceId: string;
  projectId: string;
  role: string;
  percentage: number;
  startDate: Date;
  endDate: Date;
  isBillable?: boolean;
  notes?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const AGING_THRESHOLDS = {
  fresh: 7,      // 0-7 days
  moderate: 30,  // 8-30 days
  critical: 60,  // 31-60 days
  severe: 9999,  // 60+ days
};

const DEFAULT_COST_PER_HOUR = 2500; // INR
const HOURS_PER_DAY = 8;
const DAYS_PER_MONTH = 22;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get aging category based on bench days
 */
function getAgingCategory(benchDays: number): 'fresh' | 'moderate' | 'critical' | 'severe' {
  if (benchDays <= AGING_THRESHOLDS.fresh) return 'fresh';
  if (benchDays <= AGING_THRESHOLDS.moderate) return 'moderate';
  if (benchDays <= AGING_THRESHOLDS.critical) return 'critical';
  return 'severe';
}

/**
 * Get comprehensive bench summary
 */
export async function getBenchSummary(tenantId: string): Promise<BenchSummary> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get bench resources
  const benchResources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      benchSince: { not: null },
    },
    include: {
      practice: { select: { id: true, name: true } },
    },
  });

  // Calculate aging buckets
  const benchByAging = { fresh: 0, moderate: 0, critical: 0, severe: 0 };
  const practiceMap = new Map<string, { id: string; name: string; count: number; cost: number; totalDays: number }>();
  const bandMap = new Map<string, { count: number; cost: number }>();
  
  let totalBenchCost = 0;
  let totalBenchDays = 0;

  for (const resource of benchResources) {
    const benchDays = resource.benchSince
      ? Math.floor((now.getTime() - resource.benchSince.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const dailyCost = ((resource.costPerHour?.toNumber() ?? DEFAULT_COST_PER_HOUR) * HOURS_PER_DAY);
    const monthlyBenchCost = dailyCost * DAYS_PER_MONTH;
    
    totalBenchCost += monthlyBenchCost;
    totalBenchDays += benchDays;
    
    // Aging bucket
    const category = getAgingCategory(benchDays);
    benchByAging[category]++;
    
    // Practice breakdown
    const practiceKey = resource.practice?.id ?? 'unassigned';
    const practiceName = resource.practice?.name ?? 'Unassigned';
    const existing = practiceMap.get(practiceKey) ?? { 
      id: practiceKey, 
      name: practiceName, 
      count: 0, 
      cost: 0, 
      totalDays: 0 
    };
    existing.count++;
    existing.cost += monthlyBenchCost;
    existing.totalDays += benchDays;
    practiceMap.set(practiceKey, existing);
    
    // Band breakdown
    const bandData = bandMap.get(resource.band) ?? { count: 0, cost: 0 };
    bandData.count++;
    bandData.cost += monthlyBenchCost;
    bandMap.set(resource.band, bandData);
  }

  // Get upcoming rolloffs (resources who will become available)
  const upcomingRolloffs = await prisma.allocation.count({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'CONFIRMED'] },
      deletedAt: null,
      endDate: { gte: now, lte: thirtyDaysFromNow },
      resource: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    },
  });

  // Get resources who will be on bench after rolloff (no next allocation)
  const resourcesRollingOff = await prisma.allocation.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'CONFIRMED'] },
      deletedAt: null,
      endDate: { gte: now, lte: thirtyDaysFromNow },
      resource: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    },
    select: {
      resourceId: true,
      endDate: true,
    },
  });

  // Check which ones have next allocation
  let willBeOnBenchCount = 0;
  for (const rolloff of resourcesRollingOff) {
    const nextAllocation = await prisma.allocation.findFirst({
      where: {
        resourceId: rolloff.resourceId,
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        startDate: { gte: rolloff.endDate },
        deletedAt: null,
      },
    });
    if (!nextAllocation) {
      willBeOnBenchCount++;
    }
  }

  // Format practice breakdown
  const benchByPractice = Array.from(practiceMap.values())
    .map((p) => ({
      practiceId: p.id,
      practiceName: p.name,
      count: p.count,
      cost: Math.round(p.cost),
      avgDays: Math.round(p.totalDays / p.count),
    }))
    .sort((a, b) => b.count - a.count);

  // Format band breakdown
  const benchByBand = Array.from(bandMap.entries())
    .map(([band, data]) => ({
      band,
      count: data.count,
      cost: Math.round(data.cost),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalOnBench: benchResources.length,
    totalBenchCost: Math.round(totalBenchCost),
    avgBenchDays: benchResources.length > 0 ? Math.round(totalBenchDays / benchResources.length) : 0,
    benchByAging,
    benchByPractice,
    benchByBand,
    benchTrend: [], // Would be populated from historical data
    upcomingRolloffs,
    willBeOnBenchIn30Days: willBeOnBenchCount,
  };
}

/**
 * Get detailed bench resources with all info
 */
export async function getBenchResourcesDetailed(
  tenantId: string,
  options: {
    agingCategory?: 'fresh' | 'moderate' | 'critical' | 'severe';
    practiceId?: string;
    band?: string;
    skills?: string[];
    sortBy?: 'benchDays' | 'benchCost' | 'name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: BenchResourceDetail[]; total: number }> {
  const now = new Date();

  const benchResources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      benchSince: { not: null },
      ...(options.practiceId && { practiceId: options.practiceId }),
      ...(options.band && { band: options.band }),
      ...(options.skills?.length && {
        skills: { some: { skillId: { in: options.skills } } },
      }),
    },
    include: {
      practice: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      skills: {
        include: {
          skill: {
            select: { id: true, name: true, category: { select: { name: true } } },
          },
        },
      },
      allocations: {
        where: { status: 'COMPLETED', deletedAt: null },
        orderBy: { endDate: 'desc' },
        take: 1,
        include: {
          project: {
            select: { id: true, name: true, client: { select: { name: true } } },
          },
        },
      },
    },
  });

  // Process and enrich data
  let processedResources: BenchResourceDetail[] = benchResources.map((r) => {
    const benchDays = r.benchSince
      ? Math.floor((now.getTime() - r.benchSince.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const costPerHour = r.costPerHour?.toNumber() ?? DEFAULT_COST_PER_HOUR;
    const dailyCost = costPerHour * HOURS_PER_DAY;
    const benchCost = dailyCost * DAYS_PER_MONTH;
    
    const lastAllocation = r.allocations[0];

    return {
      id: r.id,
      employeeId: r.employeeId,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      designation: r.designation,
      band: r.band,
      practice: r.practice,
      location: r.location,
      benchDays,
      benchSince: r.benchSince,
      benchCost: Math.round(benchCost),
      costPerHour,
      skills: r.skills.map((rs) => ({
        id: rs.skill.id,
        name: rs.skill.name,
        category: rs.skill.category?.name ?? null,
        proficiency: rs.proficiency,
      })),
      lastProject: lastAllocation
        ? {
            id: lastAllocation.project.id,
            name: lastAllocation.project.name,
            client: lastAllocation.project.client?.name ?? null,
          }
        : null,
      lastAllocationEnd: lastAllocation?.endDate ?? null,
      agingCategory: getAgingCategory(benchDays),
    };
  });

  // Filter by aging category
  if (options.agingCategory) {
    processedResources = processedResources.filter(
      (r) => r.agingCategory === options.agingCategory
    );
  }

  const total = processedResources.length;

  // Sort
  const sortBy = options.sortBy ?? 'benchDays';
  const sortOrder = options.sortOrder ?? 'desc';
  
  processedResources.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'benchDays':
        comparison = a.benchDays - b.benchDays;
        break;
      case 'benchCost':
        comparison = a.benchCost - b.benchCost;
        break;
      case 'name':
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Paginate
  if (options.limit) {
    const offset = options.offset ?? 0;
    processedResources = processedResources.slice(offset, offset + options.limit);
  }

  return { data: processedResources, total };
}

/**
 * Get upcoming rolloffs with detail
 */
export async function getUpcomingRolloffs(
  tenantId: string,
  options: {
    days?: number;
    practiceId?: string;
    includeWithNextAllocation?: boolean;
  } = {}
): Promise<UpcomingRolloff[]> {
  const now = new Date();
  const daysAhead = options.days ?? 30;
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const allocations = await prisma.allocation.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'CONFIRMED'] },
      deletedAt: null,
      endDate: { gte: now, lte: futureDate },
      resource: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(options.practiceId && { practiceId: options.practiceId }),
      },
    },
    include: {
      resource: {
        include: {
          practice: { select: { name: true } },
          skills: {
            take: 5,
            include: { skill: { select: { name: true } } },
          },
        },
      },
      project: {
        include: { client: { select: { name: true } } },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  const rolloffs: UpcomingRolloff[] = [];

  for (const alloc of allocations) {
    // Check for next allocation
    const nextAlloc = await prisma.allocation.findFirst({
      where: {
        resourceId: alloc.resourceId,
        status: { in: ['CONFIRMED', 'PROPOSED'] },
        startDate: { gte: alloc.endDate },
        deletedAt: null,
        id: { not: alloc.id },
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const hasNextAllocation = !!nextAlloc;

    // Skip if has next allocation and we don't want those
    if (hasNextAllocation && !options.includeWithNextAllocation) {
      continue;
    }

    const daysUntilRolloff = Math.ceil(
      (alloc.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    rolloffs.push({
      id: alloc.id,
      resourceId: alloc.resource.id,
      resourceName: `${alloc.resource.firstName} ${alloc.resource.lastName}`,
      resourceEmail: alloc.resource.email,
      employeeId: alloc.resource.employeeId,
      band: alloc.resource.band,
      designation: alloc.resource.designation,
      practice: alloc.resource.practice?.name ?? null,
      project: {
        id: alloc.project.id,
        name: alloc.project.name,
        client: alloc.project.client?.name ?? null,
      },
      allocationPercentage: alloc.percentage,
      endDate: alloc.endDate,
      daysUntilRolloff,
      hasNextAllocation,
      nextAllocation: nextAlloc
        ? {
            project: nextAlloc.project.name,
            startDate: nextAlloc.startDate,
            percentage: nextAlloc.percentage,
          }
        : null,
      skills: alloc.resource.skills.map((s) => s.skill.name),
    });
  }

  return rolloffs;
}

/**
 * Get bench forecast for future periods
 */
export async function getBenchForecast(
  tenantId: string,
  options: {
    days?: number;
    granularity?: 'daily' | 'weekly';
  } = {}
): Promise<BenchForecast[]> {
  const now = new Date();
  const daysAhead = options.days ?? 90;
  const granularity = options.granularity ?? 'weekly';
  const stepDays = granularity === 'daily' ? 1 : 7;

  const forecast: BenchForecast[] = [];
  
  // Get current bench count
  const currentBenchCount = await prisma.resource.count({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      benchSince: { not: null },
    },
  });

  // Get current average cost
  const avgCost = DEFAULT_COST_PER_HOUR * HOURS_PER_DAY * DAYS_PER_MONTH;
  
  let cumulativeChange = 0;

  for (let i = 0; i <= daysAhead; i += stepDays) {
    const periodStart = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(periodStart.getTime() + stepDays * 24 * 60 * 60 * 1000);

    // Count rolloffs in this period (resources becoming available)
    const rolloffs = await prisma.allocation.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        deletedAt: null,
        endDate: { gte: periodStart, lt: periodEnd },
        resource: { status: 'ACTIVE', deletedAt: null },
      },
    });

    // Count new allocations starting (resources leaving bench)
    const newAllocations = await prisma.allocation.count({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'PROPOSED'] },
        deletedAt: null,
        startDate: { gte: periodStart, lt: periodEnd },
        resource: { status: 'ACTIVE', deletedAt: null, benchSince: { not: null } },
      },
    });

    const periodChange = rolloffs - newAllocations;
    cumulativeChange += periodChange;

    const projectedBenchCount = Math.max(0, currentBenchCount + cumulativeChange);

    forecast.push({
      date: periodStart.toISOString().split('T')[0],
      projectedBenchCount,
      projectedBenchCost: Math.round(projectedBenchCount * avgCost),
      rolloffsCount: rolloffs,
      newAllocationsCount: newAllocations,
      cumulativeChange,
    });
  }

  return forecast;
}

/**
 * Quick allocation from bench
 */
export async function quickAllocateFromBench(
  tenantId: string,
  input: QuickAllocationInput,
  userId: string
) {
  // Verify resource is on bench
  const resource = await prisma.resource.findFirst({
    where: {
      id: input.resourceId,
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      allocations: {
        where: {
          status: { in: ['ACTIVE', 'CONFIRMED'] },
          deletedAt: null,
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
      },
    },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  // Check capacity
  const currentAllocation = resource.allocations.reduce((sum, a) => sum + a.percentage, 0);
  if (currentAllocation + input.percentage > resource.capacity) {
    throw new ApiError(
      `Resource only has ${resource.capacity - currentAllocation}% available capacity`,
      400,
      'INSUFFICIENT_CAPACITY'
    );
  }

  // Verify project exists
  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      tenantId,
      deletedAt: null,
      status: { in: ['ACTIVE', 'PIPELINE'] },
    },
  });

  if (!project) {
    throw new ApiError('Project not found or not active', 404, 'PROJECT_NOT_FOUND');
  }

  const allocation = await prisma.$transaction(async (tx) => {
    const createdAllocation = await tx.allocation.create({
      data: {
        tenantId,
        resourceId: input.resourceId,
        projectId: input.projectId,
        role: input.role,
        percentage: input.percentage,
        startDate: input.startDate,
        endDate: input.endDate,
        isBillable: input.isBillable ?? true,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        notes: input.notes,
      },
      include: {
        resource: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    const newTotalAllocation = currentAllocation + input.percentage;
    if (newTotalAllocation >= resource.capacity) {
      await tx.resource.update({
        where: { id: input.resourceId },
        data: { benchSince: null, lastAllocatedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Allocation',
        entityId: createdAllocation.id,
        action: 'CREATE',
        changes: {
          type: 'QUICK_ALLOCATION_FROM_BENCH',
          ...input,
        },
      },
    });

    return createdAllocation;
  });

  logger.info('Quick allocation created from bench', {
    allocationId: allocation.id,
    resourceId: input.resourceId,
    projectId: input.projectId,
  });

  return allocation;
}

/**
 * Get resources who will be on bench soon (proactive alerts)
 */
export async function getWillBeOnBenchAlerts(
  tenantId: string,
  options: { days?: number } = {}
): Promise<UpcomingRolloff[]> {
  // Get rolloffs without next allocation
  const rolloffs = await getUpcomingRolloffs(tenantId, {
    days: options.days ?? 30,
    includeWithNextAllocation: false,
  });

  return rolloffs;
}

/**
 * Get bench cost trends over time
 */
export async function getBenchCostTrend(
  tenantId: string,
  options: { months?: number } = {}
): Promise<Array<{ month: string; benchCount: number; benchCost: number }>> {
  const months = options.months ?? 6;
  const trends: Array<{ month: string; benchCount: number; benchCost: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    // This is a simplified calculation - in production, you'd track historical bench data
    const benchCount = await prisma.resource.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        benchSince: { lte: monthEnd },
        OR: [
          { lastAllocatedAt: null },
          { lastAllocatedAt: { lt: monthStart } },
        ],
      },
    });

    const avgCost = DEFAULT_COST_PER_HOUR * HOURS_PER_DAY * DAYS_PER_MONTH;

    trends.push({
      month: monthStart.toISOString().slice(0, 7),
      benchCount,
      benchCost: benchCount * avgCost,
    });
  }

  return trends;
}

/**
 * Get matching projects for a bench resource
 */
export async function getMatchingProjectsForResource(
  tenantId: string,
  resourceId: string
): Promise<Array<{
  project: { id: string; name: string; code: string; client: string | null };
  matchScore: number;
  matchedSkills: string[];
  requiredSkills: string[];
  startDate: Date;
  endDate: Date | null;
}>> {
  // Get resource with skills
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
    include: {
      skills: {
        include: { skill: true },
      },
    },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  const resourceSkillIds = new Set(resource.skills.map((s) => s.skillId));
  const resourceSkillNames = new Map(resource.skills.map((s) => [s.skillId, s.skill.name]));

  // Get active/pipeline projects that need resources
  const projects = await prisma.project.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'PIPELINE'] },
      deletedAt: null,
    },
    include: {
      client: { select: { name: true } },
      allocations: {
        where: {
          status: { in: ['ACTIVE', 'CONFIRMED'] },
          deletedAt: null,
        },
        include: {
          resource: {
            include: {
              skills: { include: { skill: true } },
            },
          },
        },
      },
    },
  });

  const matchingProjects: Array<{
    project: { id: string; name: string; code: string; client: string | null };
    matchScore: number;
    matchedSkills: string[];
    requiredSkills: string[];
    startDate: Date;
    endDate: Date | null;
  }> = [];

  for (const project of projects) {
    // Get skills used in this project
    const projectSkillIds = new Set<string>();
    const projectSkillNames: string[] = [];
    
    for (const alloc of project.allocations) {
      for (const rs of alloc.resource.skills) {
        if (!projectSkillIds.has(rs.skillId)) {
          projectSkillIds.add(rs.skillId);
          projectSkillNames.push(rs.skill.name);
        }
      }
    }

    // Calculate match
    const matchedSkillIds = [...resourceSkillIds].filter((id) => projectSkillIds.has(id));
    const matchedSkills = matchedSkillIds.map((id) => resourceSkillNames.get(id) ?? '');
    
    if (matchedSkills.length > 0 || projectSkillIds.size === 0) {
      const matchScore = projectSkillIds.size > 0
        ? Math.round((matchedSkills.length / projectSkillIds.size) * 100)
        : 50; // Default score if project has no skill requirements

      matchingProjects.push({
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          client: project.client?.name ?? null,
        },
        matchScore,
        matchedSkills,
        requiredSkills: projectSkillNames,
        startDate: project.startDate,
        endDate: project.endDate,
      });
    }
  }

  // Sort by match score
  return matchingProjects.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
}

