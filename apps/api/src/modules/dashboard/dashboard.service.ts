import prisma from '../../lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface DashboardMetrics {
  resources: {
    total: number;      // Active resources only (primary metric)
    active: number;     // Same as total for clarity
    inactive: number;   // Former employees (for reference only)
    onBench: number;
    inNotice: number;
    contractors: number;
  };
  utilization: {
    current: number;
    target: number;
    billable: number;
    nonBillable: number;
    trend: 'up' | 'down' | 'stable';
  };
  projects: {
    total: number;
    active: number;
    pipeline: number;
    atRisk: number;
  };
  allocations: {
    active: number;
    pending: number;
    rolloffsNext30Days: number;
  };
  financials: {
    benchCostMonthly: number;
    potentialRevenueLoss: number;
  };
}

export interface UtilizationTrend {
  date: string;
  billable: number;
  nonBillable: number;
  bench: number;
  total: number;
}

export interface BenchResource {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  band: string;
  practice: string | null;
  benchDays: number;
  benchCost: number;
  skills: string[];
  lastProject: string | null;
  availableDate: Date;
}

export interface PracticeUtilization {
  practiceId: string;
  practiceName: string;
  totalResources: number;
  allocatedResources: number;
  benchResources: number;
  utilizationRate: number;
  targetUtilization: number;
  variance: number;
}

export interface UpcomingCapacity {
  week: string;
  startDate: Date;
  endDate: Date;
  currentAllocated: number;
  rolloffs: number;
  newStarts: number;
  projectedAvailable: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get comprehensive dashboard metrics
 */
export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Parallel queries for performance
  const [
    resourceStats,
    benchResources,
    projectStats,
    activeAllocations,
    pendingAllocations,
    rolloffs,
    utilizationData,
  ] = await Promise.all([
    // Resource statistics
    prisma.resource.groupBy({
      by: ['status', 'employmentType'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),

    // Bench resources
    prisma.resource.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        benchSince: { not: null },
      },
    }),

    // Project statistics
    prisma.project.groupBy({
      by: ['status', 'healthStatus'],
      where: { tenantId, deletedAt: null },
      _count: true,
    }),

    // Active allocations
    prisma.allocation.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),

    // Pending allocations
    prisma.allocation.count({
      where: {
        tenantId,
        status: { in: ['PROPOSED', 'CONFIRMED'] },
        deletedAt: null,
      },
    }),

    // Roll-offs in next 30 days
    prisma.allocation.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        deletedAt: null,
        endDate: { gte: now, lte: thirtyDaysFromNow },
      },
    }),

    // Utilization calculation
    calculateCurrentUtilization(tenantId),
  ]);

  // Process resource stats
  let totalResources = 0;
  let activeResources = 0;
  let inactiveResources = 0;
  let inNotice = 0;
  let contractors = 0;

  for (const stat of resourceStats) {
    totalResources += stat._count;
    if (stat.status === 'ACTIVE') activeResources += stat._count;
    if (stat.status === 'INACTIVE') inactiveResources += stat._count;
    if (stat.status === 'NOTICE') inNotice += stat._count;
    if (stat.employmentType === 'CONTRACTOR' && stat.status === 'ACTIVE') contractors += stat._count;
  }

  // Process project stats
  let totalProjects = 0;
  let activeProjects = 0;
  let pipelineProjects = 0;
  let atRiskProjects = 0;

  for (const stat of projectStats) {
    totalProjects += stat._count;
    if (stat.status === 'ACTIVE') activeProjects += stat._count;
    if (stat.status === 'PIPELINE') pipelineProjects += stat._count;
    if (stat.healthStatus === 'RED') atRiskProjects += stat._count;
  }

  // Calculate bench cost (assuming average cost)
  const avgMonthlyCost = 150000; // INR - should come from config
  const benchCostMonthly = benchResources * avgMonthlyCost;
  const potentialRevenueLoss = benchCostMonthly * 2; // Rough estimate

  return {
    resources: {
      total: activeResources,      // Active is now the primary "total" metric
      active: activeResources,
      inactive: inactiveResources, // Former employees
      onBench: benchResources,
      inNotice,
      contractors,
    },
    utilization: {
      current: utilizationData.rate,
      target: 85, // Should come from tenant settings
      billable: utilizationData.billable,
      nonBillable: utilizationData.nonBillable,
      trend: utilizationData.trend,
    },
    projects: {
      total: totalProjects,
      active: activeProjects,
      pipeline: pipelineProjects,
      atRisk: atRiskProjects,
    },
    allocations: {
      active: activeAllocations,
      pending: pendingAllocations,
      rolloffsNext30Days: rolloffs,
    },
    financials: {
      benchCostMonthly,
      potentialRevenueLoss,
    },
  };
}

/**
 * Calculate current utilization rate
 */
async function calculateCurrentUtilization(tenantId: string) {
  const now = new Date();

  const resources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      allocations: {
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: {
          percentage: true,
          isBillable: true,
        },
      },
    },
  });

  let totalCapacity = 0;
  let totalBillable = 0;
  let totalNonBillable = 0;

  for (const resource of resources) {
    totalCapacity += resource.capacity;
    for (const alloc of resource.allocations) {
      if (alloc.isBillable) {
        totalBillable += alloc.percentage;
      } else {
        totalNonBillable += alloc.percentage;
      }
    }
  }

  const rate = totalCapacity > 0 ? (totalBillable / totalCapacity) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    billable: Math.round((totalBillable / Math.max(totalCapacity, 1)) * 100 * 10) / 10,
    nonBillable: Math.round((totalNonBillable / Math.max(totalCapacity, 1)) * 100 * 10) / 10,
    trend: 'stable' as const, // Would compare with previous period
  };
}

/**
 * Get utilization trend over time
 */
export async function getUtilizationTrend(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<UtilizationTrend[]> {
  const trends: UtilizationTrend[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    let periodEnd: Date;
    
    switch (granularity) {
      case 'daily':
        periodEnd = new Date(current);
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;
      case 'weekly':
        periodEnd = new Date(current);
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;
      case 'monthly':
        periodEnd = new Date(current);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;
    }

    // Get allocations for this period
    const allocations = await prisma.allocation.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        deletedAt: null,
        startDate: { lte: periodEnd },
        endDate: { gte: current },
      },
      include: {
        resource: { select: { capacity: true } },
      },
    });

    // Get total resources for the period
    const resourceCount = await prisma.resource.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
        dateOfJoining: { lte: periodEnd },
      },
    });

    const totalCapacity = resourceCount * 100;
    let billable = 0;
    let nonBillable = 0;

    for (const alloc of allocations) {
      if (alloc.isBillable) {
        billable += alloc.percentage;
      } else {
        nonBillable += alloc.percentage;
      }
    }

    const bench = Math.max(0, totalCapacity - billable - nonBillable);

    trends.push({
      date: current.toISOString().split('T')[0],
      billable: Math.round((billable / Math.max(totalCapacity, 1)) * 100),
      nonBillable: Math.round((nonBillable / Math.max(totalCapacity, 1)) * 100),
      bench: Math.round((bench / Math.max(totalCapacity, 1)) * 100),
      total: Math.round(((billable + nonBillable) / Math.max(totalCapacity, 1)) * 100),
    });

    current.setTime(periodEnd.getTime());
  }

  return trends;
}

/**
 * Get bench analysis
 */
export async function getBenchAnalysis(tenantId: string): Promise<BenchResource[]> {
  const now = new Date();

  const benchResources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      benchSince: { not: null },
    },
    include: {
      practice: { select: { name: true } },
      skills: {
        include: {
          skill: { select: { name: true } },
        },
        take: 5,
      },
      allocations: {
        where: {
          status: 'COMPLETED',
          deletedAt: null,
        },
        orderBy: { endDate: 'desc' },
        take: 1,
        include: {
          project: { select: { name: true } },
        },
      },
    },
    orderBy: { benchSince: 'asc' },
  });

  return benchResources.map((r) => {
    const benchDays = r.benchSince
      ? Math.floor((now.getTime() - r.benchSince.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const dailyCost = (r.costPerHour?.toNumber() ?? 2500) * 8; // 8 hours/day
    const benchCost = benchDays * dailyCost;

    return {
      id: r.id,
      employeeId: r.employeeId,
      firstName: r.firstName,
      lastName: r.lastName,
      designation: r.designation,
      band: r.band,
      practice: r.practice?.name ?? null,
      benchDays,
      benchCost,
      skills: r.skills.map((s) => s.skill.name),
      lastProject: r.allocations[0]?.project.name ?? null,
      availableDate: r.benchSince ?? now,
    };
  });
}

/**
 * Get utilization by practice
 */
export async function getPracticeUtilization(tenantId: string): Promise<PracticeUtilization[]> {
  const now = new Date();

  const practices = await prisma.practice.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      resources: {
        where: { status: 'ACTIVE', deletedAt: null },
        include: {
          allocations: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
              startDate: { lte: now },
              endDate: { gte: now },
            },
            select: { percentage: true, isBillable: true },
          },
        },
      },
    },
  });

  return practices.map((practice) => {
    const totalResources = practice.resources.length;
    let totalCapacity = 0;
    let totalAllocated = 0;
    let allocatedCount = 0;

    for (const resource of practice.resources) {
      totalCapacity += resource.capacity;
      const resourceAllocation = resource.allocations.reduce(
        (sum, a) => sum + a.percentage,
        0
      );
      totalAllocated += resourceAllocation;
      if (resourceAllocation > 0) allocatedCount++;
    }

    const utilizationRate = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
    const targetUtilization = practice.targetUtilization ?? 85;

    return {
      practiceId: practice.id,
      practiceName: practice.name,
      totalResources,
      allocatedResources: allocatedCount,
      benchResources: totalResources - allocatedCount,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      targetUtilization,
      variance: Math.round((utilizationRate - targetUtilization) * 10) / 10,
    };
  });
}

/**
 * Get capacity forecast
 */
export async function getCapacityForecast(
  tenantId: string,
  weeks: number = 8
): Promise<UpcomingCapacity[]> {
  const forecast: UpcomingCapacity[] = [];
  const now = new Date();

  // Get current Monday
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() - now.getDay() + 1);
  currentMonday.setHours(0, 0, 0, 0);

  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() + i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Get allocations active during this week
    const allocations = await prisma.allocation.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        deletedAt: null,
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
      select: { percentage: true },
    });

    // Roll-offs this week
    const rolloffs = await prisma.allocation.count({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        deletedAt: null,
        endDate: { gte: weekStart, lte: weekEnd },
      },
    });

    // New starts this week
    const newStarts = await prisma.allocation.count({
      where: {
        tenantId,
        status: { in: ['CONFIRMED'] },
        deletedAt: null,
        startDate: { gte: weekStart, lte: weekEnd },
      },
    });

    // Total resources
    const totalResources = await prisma.resource.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    const totalCapacity = totalResources * 100;
    const currentAllocated = allocations.reduce((sum, a) => sum + a.percentage, 0);

    forecast.push({
      week: `Week ${i + 1}`,
      startDate: weekStart,
      endDate: weekEnd,
      currentAllocated: Math.round((currentAllocated / Math.max(totalCapacity, 1)) * 100),
      rolloffs,
      newStarts,
      projectedAvailable: Math.max(0, totalCapacity - currentAllocated),
    });
  }

  return forecast;
}

/**
 * Get skill demand analysis
 */
export async function getSkillDemandAnalysis(tenantId: string) {
  // Get skills from active projects
  const activeProjects = await prisma.project.findMany({
    where: {
      tenantId,
      status: { in: ['ACTIVE', 'PIPELINE'] },
      deletedAt: null,
    },
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'CONFIRMED', 'PROPOSED'] } },
        include: {
          resource: {
            include: {
              skills: {
                include: { skill: true },
              },
            },
          },
        },
      },
    },
  });

  // Count skill frequency
  const skillDemand = new Map<string, { name: string; demand: number; supply: number }>();

  for (const project of activeProjects) {
    for (const alloc of project.allocations) {
      for (const rs of alloc.resource.skills) {
        const existing = skillDemand.get(rs.skillId) ?? {
          name: rs.skill.name,
          demand: 0,
          supply: 0,
        };
        existing.demand++;
        skillDemand.set(rs.skillId, existing);
      }
    }
  }

  // Get supply (all resources with these skills)
  for (const [skillId, data] of skillDemand) {
    const supply = await prisma.resourceSkill.count({
      where: {
        skillId,
        resource: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
    });
    data.supply = supply;
  }

  return Array.from(skillDemand.values())
    .map((s) => ({
      ...s,
      gap: s.demand - s.supply,
    }))
    .sort((a, b) => b.gap - a.gap);
}

