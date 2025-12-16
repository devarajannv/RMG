import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface ResourceMatch {
  resourceId: string;
  resourceName: string;
  employeeId: string;
  email: string;
  designation: string;
  band: string;
  practice: string | null;
  location: string | null;
  
  // Scoring
  overallScore: number;
  skillScore: number;
  availabilityScore: number;
  utilizationScore: number;
  experienceScore: number;
  
  // Details
  matchedSkills: Array<{ name: string; proficiency: string; required: boolean }>;
  missingSkills: string[];
  currentUtilization: number;
  availableCapacity: number;
  availableFrom: Date;
  
  // Explanations
  scoreBreakdown: {
    category: string;
    score: number;
    maxScore: number;
    reason: string;
  }[];
  recommendation: string;
}

export interface MatchCriteria {
  requiredSkills?: string[];        // Skill IDs that are required
  preferredSkills?: string[];       // Skill IDs that are nice-to-have
  minProficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  startDate?: Date;
  endDate?: Date;
  allocationPercentage?: number;
  practiceId?: string;
  locationId?: string;
  band?: string[];
  excludeResourceIds?: string[];
  projectId?: string;               // For skill gap analysis
}

export interface SkillGap {
  projectId: string;
  projectName: string;
  requiredSkills: Array<{
    skillId: string;
    skillName: string;
    category: string | null;
    requiredCount: number;
    currentCount: number;
    gap: number;
    proficiencyNeeded: string;
    availableResources: Array<{
      resourceId: string;
      resourceName: string;
      proficiency: string;
      available: boolean;
    }>;
  }>;
  overallCoverage: number;
  criticalGaps: string[];
  recommendations: string[];
}

export interface UtilizationInsight {
  currentUtilization: number;
  targetUtilization: number;
  optimalUtilization: number;
  variance: number;
  trend: 'improving' | 'declining' | 'stable';
  benchCount: number;
  benchCost: number;
  recommendations: Array<{
    type: 'action' | 'insight' | 'warning';
    priority: 'high' | 'medium' | 'low';
    message: string;
    impact: string;
  }>;
  practiceBreakdown: Array<{
    practiceId: string;
    practiceName: string;
    utilization: number;
    target: number;
    status: 'above' | 'at' | 'below';
    recommendation: string;
  }>;
}

export interface ResourceRecommendation {
  resource: ResourceMatch;
  reasons: string[];
  concerns: string[];
  alternativeActions: string[];
}

// ============================================================================
// Configuration - Scoring Weights
// ============================================================================

const SCORING_WEIGHTS = {
  skills: 40,           // 40% weight for skill match
  availability: 30,     // 30% weight for availability
  utilization: 20,      // 20% weight for utilization optimization
  experience: 10,       // 10% weight for experience/seniority
};

const PROFICIENCY_SCORES: Record<string, number> = {
  EXPERT: 100,
  ADVANCED: 75,
  INTERMEDIATE: 50,
  BEGINNER: 25,
};

const PROFICIENCY_ORDER = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

// ============================================================================
// Smart Matching Algorithm
// ============================================================================

/**
 * Find best matching resources for given criteria
 */
export async function findMatchingResources(
  tenantId: string,
  criteria: MatchCriteria,
  options: { limit?: number; includePartialMatches?: boolean } = {}
): Promise<ResourceMatch[]> {
  const { limit = 10, includePartialMatches = true } = options;
  const now = new Date();
  const startDate = criteria.startDate ?? now;
  const endDate = criteria.endDate ?? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const requiredPercentage = criteria.allocationPercentage ?? 100;

  // Get all active resources with their skills and allocations
  const resources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      ...(criteria.practiceId && { practiceId: criteria.practiceId }),
      ...(criteria.locationId && { locationId: criteria.locationId }),
      ...(criteria.band?.length && { band: { in: criteria.band } }),
      ...(criteria.excludeResourceIds?.length && { id: { notIn: criteria.excludeResourceIds } }),
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
        where: {
          status: { in: ['ACTIVE', 'CONFIRMED'] },
          deletedAt: null,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: { percentage: true, startDate: true, endDate: true },
      },
    },
  });

  // Get required skill names for display
  const requiredSkillIds = new Set(criteria.requiredSkills ?? []);
  const preferredSkillIds = new Set(criteria.preferredSkills ?? []);
  const allRequiredSkillIds = [...requiredSkillIds];
  
  const skillNames = await prisma.skill.findMany({
    where: { id: { in: [...requiredSkillIds, ...preferredSkillIds] } },
    select: { id: true, name: true },
  });
  const skillNameMap = new Map(skillNames.map(s => [s.id, s.name]));

  // Score each resource
  const matches: ResourceMatch[] = [];

  for (const resource of resources) {
    // Calculate availability
    const currentAllocation = resource.allocations.reduce((sum, a) => {
      // Check if allocation overlaps with requested period
      const overlapStart = Math.max(a.startDate.getTime(), startDate.getTime());
      const overlapEnd = Math.min(a.endDate.getTime(), endDate.getTime());
      if (overlapStart <= overlapEnd) {
        return sum + a.percentage;
      }
      return sum;
    }, 0);
    
    const availableCapacity = Math.max(0, resource.capacity - currentAllocation);
    
    // Skip if not enough capacity (unless including partial matches)
    if (availableCapacity < requiredPercentage && !includePartialMatches) {
      continue;
    }

    // Calculate skill match
    const resourceSkillMap = new Map(
      resource.skills.map(rs => [rs.skillId, { proficiency: rs.proficiency, name: rs.skill.name }])
    );
    
    const matchedSkills: ResourceMatch['matchedSkills'] = [];
    const missingSkills: string[] = [];
    let skillMatchScore = 0;
    let maxSkillScore = 0;

    // Score required skills (weighted higher)
    for (const skillId of requiredSkillIds) {
      maxSkillScore += 100;
      const resourceSkill = resourceSkillMap.get(skillId);
      if (resourceSkill) {
        const profScore = PROFICIENCY_SCORES[resourceSkill.proficiency] ?? 50;
        skillMatchScore += profScore;
        matchedSkills.push({
          name: resourceSkill.name,
          proficiency: resourceSkill.proficiency,
          required: true,
        });
      } else {
        missingSkills.push(skillNameMap.get(skillId) ?? skillId);
      }
    }

    // Score preferred skills (weighted lower)
    for (const skillId of preferredSkillIds) {
      maxSkillScore += 50;
      const resourceSkill = resourceSkillMap.get(skillId);
      if (resourceSkill) {
        const profScore = (PROFICIENCY_SCORES[resourceSkill.proficiency] ?? 50) * 0.5;
        skillMatchScore += profScore;
        matchedSkills.push({
          name: resourceSkill.name,
          proficiency: resourceSkill.proficiency,
          required: false,
        });
      }
    }

    // Normalize skill score to 0-100
    const normalizedSkillScore = maxSkillScore > 0 
      ? Math.round((skillMatchScore / maxSkillScore) * 100) 
      : 100; // If no skills required, give full score

    // Skip if required skills are missing (unless including partial)
    if (missingSkills.length > 0 && missingSkills.length === allRequiredSkillIds.length && !includePartialMatches) {
      continue;
    }

    // Calculate availability score
    const availabilityScore = Math.min(100, Math.round((availableCapacity / requiredPercentage) * 100));

    // Calculate utilization score (prefer resources closer to optimal utilization)
    const currentUtilization = Math.round((currentAllocation / resource.capacity) * 100);
    const targetUtilization = 85;
    const utilizationDiff = Math.abs(currentUtilization - targetUtilization);
    const utilizationScore = Math.max(0, 100 - utilizationDiff);

    // Calculate experience score (based on band - simplified)
    const bandScores: Record<string, number> = { 'L1': 40, 'L2': 55, 'L3': 70, 'L4': 85, 'L5': 100 };
    const experienceScore = bandScores[resource.band] ?? 60;

    // Calculate overall score
    const overallScore = Math.round(
      (normalizedSkillScore * SCORING_WEIGHTS.skills / 100) +
      (availabilityScore * SCORING_WEIGHTS.availability / 100) +
      (utilizationScore * SCORING_WEIGHTS.utilization / 100) +
      (experienceScore * SCORING_WEIGHTS.experience / 100)
    );

    // Build score breakdown
    const scoreBreakdown = [
      {
        category: 'Skills',
        score: normalizedSkillScore,
        maxScore: 100,
        reason: matchedSkills.length > 0 
          ? `Matches ${matchedSkills.length} skills: ${matchedSkills.map(s => s.name).join(', ')}`
          : 'No matching skills',
      },
      {
        category: 'Availability',
        score: availabilityScore,
        maxScore: 100,
        reason: `${availableCapacity}% capacity available (need ${requiredPercentage}%)`,
      },
      {
        category: 'Utilization',
        score: utilizationScore,
        maxScore: 100,
        reason: `Currently at ${currentUtilization}% utilization (target: ${targetUtilization}%)`,
      },
      {
        category: 'Experience',
        score: experienceScore,
        maxScore: 100,
        reason: `Band ${resource.band}`,
      },
    ];

    // Generate recommendation text
    let recommendation = '';
    if (overallScore >= 80) {
      recommendation = 'Excellent match - highly recommended';
    } else if (overallScore >= 60) {
      recommendation = 'Good match - recommended with minor considerations';
    } else if (overallScore >= 40) {
      recommendation = 'Partial match - consider if other options unavailable';
    } else {
      recommendation = 'Low match - not recommended unless necessary';
    }

    if (missingSkills.length > 0) {
      recommendation += `. Missing skills: ${missingSkills.join(', ')}`;
    }

    matches.push({
      resourceId: resource.id,
      resourceName: `${resource.firstName} ${resource.lastName}`,
      employeeId: resource.employeeId,
      email: resource.email,
      designation: resource.designation,
      band: resource.band,
      practice: resource.practice?.name ?? null,
      location: resource.location?.name ?? null,
      overallScore,
      skillScore: normalizedSkillScore,
      availabilityScore,
      utilizationScore,
      experienceScore,
      matchedSkills,
      missingSkills,
      currentUtilization,
      availableCapacity,
      availableFrom: resource.benchSince ?? now,
      scoreBreakdown,
      recommendation,
    });
  }

  // Sort by overall score descending
  matches.sort((a, b) => b.overallScore - a.overallScore);

  return matches.slice(0, limit);
}

// ============================================================================
// Skill Gap Detection
// ============================================================================

/**
 * Analyze skill gaps for a project
 */
export async function analyzeProjectSkillGap(
  tenantId: string,
  projectId: string
): Promise<SkillGap> {
  // Get project with current allocations
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    include: {
      allocations: {
        where: { 
          status: { in: ['ACTIVE', 'CONFIRMED'] },
          deletedAt: null,
        },
        include: {
          resource: {
            include: {
              skills: {
                include: {
                  skill: {
                    include: { category: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Aggregate skills from allocated resources
  const currentSkills = new Map<string, {
    skillId: string;
    skillName: string;
    category: string | null;
    count: number;
    resources: Array<{ resourceId: string; resourceName: string; proficiency: string }>;
  }>();

  for (const allocation of project.allocations) {
    for (const rs of allocation.resource.skills) {
      const existing = currentSkills.get(rs.skillId) ?? {
        skillId: rs.skillId,
        skillName: rs.skill.name,
        category: rs.skill.category?.name ?? null,
        count: 0,
        resources: [],
      };
      existing.count++;
      existing.resources.push({
        resourceId: allocation.resource.id,
        resourceName: `${allocation.resource.firstName} ${allocation.resource.lastName}`,
        proficiency: rs.proficiency,
      });
      currentSkills.set(rs.skillId, existing);
    }
  }

  // Get all skills used in similar projects (for comparison)
  const similarProjects = await prisma.project.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      type: project.type,
      id: { not: projectId },
    },
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'CONFIRMED'] } },
        include: {
          resource: {
            include: {
              skills: { include: { skill: true } },
            },
          },
        },
      },
    },
    take: 5,
  });

  // Find common skills in similar projects that this project might need
  const skillFrequency = new Map<string, { name: string; category: string | null; count: number }>();
  for (const sp of similarProjects) {
    const projectSkills = new Set<string>();
    for (const alloc of sp.allocations) {
      for (const rs of alloc.resource.skills) {
        if (!projectSkills.has(rs.skillId)) {
          projectSkills.add(rs.skillId);
          const existing = skillFrequency.get(rs.skillId) ?? { 
            name: rs.skill.name, 
            category: rs.skill.category?.name ?? null,
            count: 0 
          };
          existing.count++;
          skillFrequency.set(rs.skillId, existing);
        }
      }
    }
  }

  // Identify gaps - skills common in similar projects but missing/underrepresented
  const requiredSkills: SkillGap['requiredSkills'] = [];
  const criticalGaps: string[] = [];
  const recommendations: string[] = [];

  // Check skills that appear in >50% of similar projects
  const threshold = Math.max(1, Math.floor(similarProjects.length * 0.5));
  
  for (const [skillId, freq] of skillFrequency) {
    if (freq.count >= threshold) {
      const current = currentSkills.get(skillId);
      const currentCount = current?.count ?? 0;
      const requiredCount = Math.ceil(freq.count / similarProjects.length * project.allocations.length) || 1;
      
      // Find available resources with this skill
      const availableResources = await prisma.resource.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
          skills: { some: { skillId } },
        },
        include: {
          skills: { where: { skillId }, select: { proficiency: true } },
          allocations: {
            where: {
              status: { in: ['ACTIVE', 'CONFIRMED'] },
              deletedAt: null,
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
            select: { percentage: true },
          },
        },
        take: 5,
      });

      const gap = Math.max(0, requiredCount - currentCount);
      
      requiredSkills.push({
        skillId,
        skillName: freq.name,
        category: freq.category,
        requiredCount,
        currentCount,
        gap,
        proficiencyNeeded: 'INTERMEDIATE',
        availableResources: availableResources.map(r => ({
          resourceId: r.id,
          resourceName: `${r.firstName} ${r.lastName}`,
          proficiency: r.skills[0]?.proficiency ?? 'INTERMEDIATE',
          available: r.allocations.reduce((sum, a) => sum + a.percentage, 0) < r.capacity,
        })),
      });

      if (gap > 0) {
        criticalGaps.push(freq.name);
        const availableCount = availableResources.filter(r => 
          r.allocations.reduce((sum, a) => sum + a.percentage, 0) < r.capacity
        ).length;
        
        if (availableCount > 0) {
          recommendations.push(`Add ${gap} resource(s) with ${freq.name} skill. ${availableCount} available in bench.`);
        } else {
          recommendations.push(`Need ${gap} resource(s) with ${freq.name} skill. Consider hiring or training.`);
        }
      }
    }
  }

  // Calculate overall coverage
  const totalRequired = requiredSkills.reduce((sum, s) => sum + s.requiredCount, 0);
  const totalCurrent = requiredSkills.reduce((sum, s) => sum + Math.min(s.currentCount, s.requiredCount), 0);
  const overallCoverage = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 100;

  return {
    projectId: project.id,
    projectName: project.name,
    requiredSkills: requiredSkills.sort((a, b) => b.gap - a.gap),
    overallCoverage,
    criticalGaps,
    recommendations,
  };
}

// ============================================================================
// Utilization Insights
// ============================================================================

/**
 * Get intelligent utilization insights and recommendations
 */
export async function getUtilizationInsights(tenantId: string): Promise<UtilizationInsight> {
  const now = new Date();

  // Get all active resources with allocations
  const resources = await prisma.resource.findMany({
    where: { tenantId, status: 'ACTIVE', deletedAt: null },
    include: {
      practice: { select: { id: true, name: true, targetUtilization: true } },
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
  });

  // Calculate current utilization
  let totalCapacity = 0;
  let totalBillable = 0;
  let totalAllocated = 0;
  let benchCount = 0;

  const practiceData = new Map<string, {
    id: string;
    name: string;
    target: number;
    capacity: number;
    allocated: number;
    resourceCount: number;
  }>();

  for (const resource of resources) {
    totalCapacity += resource.capacity;
    const resourceAllocation = resource.allocations.reduce((sum, a) => sum + a.percentage, 0);
    const resourceBillable = resource.allocations
      .filter(a => a.isBillable)
      .reduce((sum, a) => sum + a.percentage, 0);
    
    totalAllocated += resourceAllocation;
    totalBillable += resourceBillable;
    
    if (resourceAllocation === 0) {
      benchCount++;
    }

    // Practice breakdown
    if (resource.practice) {
      const existing = practiceData.get(resource.practice.id) ?? {
        id: resource.practice.id,
        name: resource.practice.name,
        target: resource.practice.targetUtilization ?? 85,
        capacity: 0,
        allocated: 0,
        resourceCount: 0,
      };
      existing.capacity += resource.capacity;
      existing.allocated += resourceBillable;
      existing.resourceCount++;
      practiceData.set(resource.practice.id, existing);
    }
  }

  const currentUtilization = totalCapacity > 0 ? Math.round((totalBillable / totalCapacity) * 100) : 0;
  const targetUtilization = 85;
  
  // Calculate optimal utilization based on data
  // Rule: If bench is high, optimal should be current + achievable increase
  // If bench is low, optimal is around target
  const benchPercentage = resources.length > 0 ? (benchCount / resources.length) * 100 : 0;
  let optimalUtilization = targetUtilization;
  
  if (benchPercentage > 15) {
    // High bench - optimal is higher to reduce bench
    optimalUtilization = Math.min(95, currentUtilization + 10);
  } else if (benchPercentage < 5) {
    // Low bench - might be over-utilized
    optimalUtilization = Math.max(80, currentUtilization - 5);
  }

  // Generate recommendations
  const recommendations: UtilizationInsight['recommendations'] = [];

  // Bench cost (estimated)
  const avgMonthlyCost = 150000; // INR
  const benchCost = benchCount * avgMonthlyCost;

  if (benchCount > 0) {
    recommendations.push({
      type: 'warning',
      priority: benchCount > 10 ? 'high' : 'medium',
      message: `${benchCount} resources currently on bench`,
      impact: `Monthly bench cost: ₹${(benchCost / 100000).toFixed(1)}L`,
    });
  }

  if (currentUtilization < targetUtilization - 10) {
    recommendations.push({
      type: 'action',
      priority: 'high',
      message: `Utilization ${targetUtilization - currentUtilization}% below target`,
      impact: `Increasing to ${targetUtilization}% could add ₹${((targetUtilization - currentUtilization) * totalCapacity * 1000 / 100).toFixed(0)} monthly revenue`,
    });
  }

  if (currentUtilization > 90) {
    recommendations.push({
      type: 'warning',
      priority: 'medium',
      message: 'High utilization may lead to burnout',
      impact: 'Consider maintaining buffer capacity for urgent requests',
    });
  }

  // Practice breakdown
  const practiceBreakdown: UtilizationInsight['practiceBreakdown'] = [];
  
  for (const [, practice] of practiceData) {
    const utilization = practice.capacity > 0 
      ? Math.round((practice.allocated / practice.capacity) * 100) 
      : 0;
    
    let status: 'above' | 'at' | 'below' = 'at';
    let recommendation = 'On target';
    
    if (utilization < practice.target - 10) {
      status = 'below';
      recommendation = `${practice.target - utilization}% below target. Focus on project acquisition or cross-practice allocation.`;
    } else if (utilization > practice.target + 5) {
      status = 'above';
      recommendation = 'Above target. Good performance, but watch for over-utilization.';
    }

    practiceBreakdown.push({
      practiceId: practice.id,
      practiceName: practice.name,
      utilization,
      target: practice.target,
      status,
      recommendation,
    });
  }

  // Sort by variance from target
  practiceBreakdown.sort((a, b) => Math.abs(b.target - b.utilization) - Math.abs(a.target - a.utilization));

  // Add practice-specific recommendations
  const underPerforming = practiceBreakdown.filter(p => p.status === 'below');
  if (underPerforming.length > 0) {
    recommendations.push({
      type: 'insight',
      priority: 'medium',
      message: `${underPerforming.length} practice(s) below utilization target`,
      impact: `Focus areas: ${underPerforming.slice(0, 3).map(p => p.practiceName).join(', ')}`,
    });
  }

  return {
    currentUtilization,
    targetUtilization,
    optimalUtilization,
    variance: currentUtilization - targetUtilization,
    trend: 'stable', // Would need historical data
    benchCount,
    benchCost,
    recommendations,
    practiceBreakdown,
  };
}

// ============================================================================
// Resource Recommendations
// ============================================================================

/**
 * Get top resource recommendations for a project with detailed explanations
 */
export async function getResourceRecommendations(
  tenantId: string,
  projectId: string,
  options: { count?: number; requiredSkills?: string[] } = {}
): Promise<ResourceRecommendation[]> {
  const { count = 5 } = options;

  // Get project details
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'CONFIRMED'] }, deletedAt: null },
        select: { resourceId: true },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  // Get skills from project's current team
  const existingResourceIds = project.allocations.map(a => a.resourceId);
  
  // Determine required skills from existing team or provided list
  let requiredSkills = options.requiredSkills ?? [];
  
  if (requiredSkills.length === 0 && existingResourceIds.length > 0) {
    // Infer skills from existing team
    const teamSkills = await prisma.resourceSkill.findMany({
      where: { resourceId: { in: existingResourceIds } },
      select: { skillId: true },
    });
    requiredSkills = [...new Set(teamSkills.map(s => s.skillId))];
  }

  // Find matching resources
  const matches = await findMatchingResources(tenantId, {
    requiredSkills,
    startDate: project.startDate,
    endDate: project.endDate ?? undefined,
    excludeResourceIds: existingResourceIds,
  }, { limit: count * 2, includePartialMatches: true });

  // Enhance with detailed recommendations
  const recommendations: ResourceRecommendation[] = [];

  for (const match of matches.slice(0, count)) {
    const reasons: string[] = [];
    const concerns: string[] = [];
    const alternativeActions: string[] = [];

    // Generate reasons
    if (match.skillScore >= 80) {
      reasons.push(`Strong skill match (${match.skillScore}%) - has ${match.matchedSkills.filter(s => s.required).length} required skills`);
    } else if (match.skillScore >= 50) {
      reasons.push(`Partial skill match (${match.skillScore}%) - can contribute immediately`);
    }

    if (match.availabilityScore >= 100) {
      reasons.push('Fully available for the requested allocation');
    } else if (match.availabilityScore >= 50) {
      reasons.push(`${match.availableCapacity}% capacity available`);
    }

    if (match.currentUtilization < 50) {
      reasons.push('Currently on bench - immediate availability');
    }

    // Generate concerns
    if (match.missingSkills.length > 0) {
      concerns.push(`Missing skills: ${match.missingSkills.join(', ')}`);
      alternativeActions.push(`Consider training on: ${match.missingSkills.slice(0, 2).join(', ')}`);
    }

    if (match.availableCapacity < 100) {
      concerns.push(`Only ${match.availableCapacity}% available (has other allocations)`);
      alternativeActions.push('Consider partial allocation or phased onboarding');
    }

    if (match.currentUtilization > 80) {
      concerns.push('Already highly utilized - risk of over-allocation');
      alternativeActions.push('Check with resource manager before allocation');
    }

    recommendations.push({
      resource: match,
      reasons,
      concerns,
      alternativeActions,
    });
  }

  return recommendations;
}

// ============================================================================
// Skill Inventory Analysis
// ============================================================================

/**
 * Get organization-wide skill inventory with supply/demand analysis
 */
export async function getSkillInventory(tenantId: string): Promise<{
  skills: Array<{
    skillId: string;
    skillName: string;
    category: string | null;
    totalResources: number;
    availableResources: number;
    avgProficiency: number;
    demandScore: number;
    supplyDemandRatio: number;
    trend: 'growing' | 'stable' | 'declining';
  }>;
  topInDemand: string[];
  skillGaps: string[];
  recommendations: string[];
}> {
  const now = new Date();

  // Get all skills with resource counts
  const skills = await prisma.skill.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      category: true,
      resources: {
        include: {
          resource: {
            include: {
              allocations: {
                where: {
                  status: { in: ['ACTIVE', 'CONFIRMED'] },
                  deletedAt: null,
                  startDate: { lte: now },
                  endDate: { gte: now },
                },
              },
            },
          },
        },
      },
    },
  });

  // Get demand from active projects
  const activeProjects = await prisma.project.findMany({
    where: { tenantId, status: { in: ['ACTIVE', 'PIPELINE'] }, deletedAt: null },
    include: {
      allocations: {
        where: { status: { in: ['ACTIVE', 'CONFIRMED', 'PROPOSED'] } },
        include: {
          resource: {
            include: { skills: true },
          },
        },
      },
    },
  });

  // Count skill demand from projects
  const skillDemand = new Map<string, number>();
  for (const project of activeProjects) {
    for (const alloc of project.allocations) {
      for (const rs of alloc.resource.skills) {
        skillDemand.set(rs.skillId, (skillDemand.get(rs.skillId) ?? 0) + 1);
      }
    }
  }

  const skillAnalysis = skills.map(skill => {
    const totalResources = skill.resources.length;
    const availableResources = skill.resources.filter(rs => {
      const allocation = rs.resource.allocations.reduce((sum, a) => sum + a.percentage, 0);
      return allocation < rs.resource.capacity;
    }).length;

    const avgProficiency = totalResources > 0
      ? skill.resources.reduce((sum, rs) => sum + (PROFICIENCY_SCORES[rs.proficiency] ?? 50), 0) / totalResources
      : 0;

    const demandScore = skillDemand.get(skill.id) ?? 0;
    const supplyDemandRatio = demandScore > 0 ? totalResources / demandScore : totalResources > 0 ? 999 : 0;

    return {
      skillId: skill.id,
      skillName: skill.name,
      category: skill.category?.name ?? null,
      totalResources,
      availableResources,
      avgProficiency: Math.round(avgProficiency),
      demandScore,
      supplyDemandRatio: Math.round(supplyDemandRatio * 100) / 100,
      trend: 'stable' as const,
    };
  });

  // Sort by demand
  skillAnalysis.sort((a, b) => b.demandScore - a.demandScore);

  // Identify top in demand
  const topInDemand = skillAnalysis
    .filter(s => s.demandScore > 0)
    .slice(0, 10)
    .map(s => s.skillName);

  // Identify skill gaps (high demand, low supply)
  const skillGaps = skillAnalysis
    .filter(s => s.demandScore > 0 && s.supplyDemandRatio < 0.5)
    .slice(0, 5)
    .map(s => s.skillName);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (skillGaps.length > 0) {
    recommendations.push(`Critical skill gaps: ${skillGaps.join(', ')}. Consider hiring or training programs.`);
  }

  const underutilizedSkills = skillAnalysis.filter(s => s.totalResources > 5 && s.demandScore === 0);
  if (underutilizedSkills.length > 0) {
    recommendations.push(`Underutilized skills: ${underutilizedSkills.slice(0, 3).map(s => s.skillName).join(', ')}. Consider diversifying project types.`);
  }

  return {
    skills: skillAnalysis,
    topInDemand,
    skillGaps,
    recommendations,
  };
}

