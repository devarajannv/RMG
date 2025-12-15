import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';

// ============================================================================
// Skill Category Operations
// ============================================================================

export async function createSkillCategory(
  tenantId: string,
  input: { name: string; color?: string; sortOrder?: number }
) {
  const existing = await prisma.skillCategory.findFirst({
    where: { tenantId, name: input.name },
  });

  if (existing) {
    throw new ApiError('Skill category already exists', 409, 'DUPLICATE_CATEGORY');
  }

  return prisma.skillCategory.create({
    data: {
      tenantId,
      name: input.name,
      color: input.color,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function listSkillCategories(tenantId: string) {
  return prisma.skillCategory.findMany({
    where: { tenantId },
    include: {
      skills: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function updateSkillCategory(
  tenantId: string,
  categoryId: string,
  input: { name?: string; color?: string; sortOrder?: number }
) {
  const existing = await prisma.skillCategory.findFirst({
    where: { id: categoryId, tenantId },
  });

  if (!existing) {
    throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  return prisma.skillCategory.update({
    where: { id: categoryId },
    data: input,
  });
}

export async function deleteSkillCategory(tenantId: string, categoryId: string) {
  const existing = await prisma.skillCategory.findFirst({
    where: { id: categoryId, tenantId },
    include: { skills: true },
  });

  if (!existing) {
    throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  if (existing.skills.length > 0) {
    throw new ApiError('Category has skills', 400, 'CATEGORY_HAS_SKILLS');
  }

  await prisma.skillCategory.delete({ where: { id: categoryId } });
}

// ============================================================================
// Skill Operations
// ============================================================================

export async function createSkill(
  tenantId: string,
  input: {
    name: string;
    description?: string;
    categoryId?: string;
    isVerifiable?: boolean;
  }
) {
  const existing = await prisma.skill.findFirst({
    where: { tenantId, name: input.name },
  });

  if (existing) {
    throw new ApiError('Skill already exists', 409, 'DUPLICATE_SKILL');
  }

  if (input.categoryId) {
    const category = await prisma.skillCategory.findFirst({
      where: { id: input.categoryId, tenantId },
    });
    if (!category) {
      throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }
  }

  return prisma.skill.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      isVerifiable: input.isVerifiable ?? false,
      status: 'ACTIVE',
    },
    include: { category: true },
  });
}

export async function listSkills(
  tenantId: string,
  filters?: { categoryId?: string; status?: 'ACTIVE' | 'DEPRECATED' }
) {
  const where: Prisma.SkillWhereInput = { tenantId };
  
  if (filters?.categoryId) {
    where.categoryId = filters.categoryId;
  }
  
  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.skill.findMany({
    where,
    include: {
      category: true,
      _count: { select: { resources: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  });
}

export async function updateSkill(
  tenantId: string,
  skillId: string,
  input: {
    name?: string;
    description?: string;
    categoryId?: string;
    isVerifiable?: boolean;
    status?: 'ACTIVE' | 'DEPRECATED';
  }
) {
  const existing = await prisma.skill.findFirst({
    where: { id: skillId, tenantId },
  });

  if (!existing) {
    throw new ApiError('Skill not found', 404, 'SKILL_NOT_FOUND');
  }

  return prisma.skill.update({
    where: { id: skillId },
    data: input,
    include: { category: true },
  });
}

// ============================================================================
// Resource Skill Operations
// ============================================================================

export async function assignSkillToResource(
  tenantId: string,
  resourceId: string,
  input: {
    skillId: string;
    proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    yearsExp?: number;
    lastUsed?: Date;
    certified?: boolean;
    certExpiry?: Date;
    notes?: string;
  },
  userId?: string
) {
  // Verify resource exists
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  // Verify skill exists
  const skill = await prisma.skill.findFirst({
    where: { id: input.skillId, tenantId },
  });

  if (!skill) {
    throw new ApiError('Skill not found', 404, 'SKILL_NOT_FOUND');
  }

  // Check if already assigned
  const existing = await prisma.resourceSkill.findUnique({
    where: {
      resourceId_skillId: { resourceId, skillId: input.skillId },
    },
  });

  if (existing) {
    // Update existing
    return prisma.resourceSkill.update({
      where: {
        resourceId_skillId: { resourceId, skillId: input.skillId },
      },
      data: {
        proficiency: input.proficiency,
        yearsExp: input.yearsExp,
        lastUsed: input.lastUsed,
        certified: input.certified,
        certExpiry: input.certExpiry,
        notes: input.notes,
      },
      include: {
        skill: { include: { category: true } },
      },
    });
  }

  // Create new assignment
  return prisma.resourceSkill.create({
    data: {
      resourceId,
      skillId: input.skillId,
      proficiency: input.proficiency,
      yearsExp: input.yearsExp,
      lastUsed: input.lastUsed,
      certified: input.certified ?? false,
      certExpiry: input.certExpiry,
      notes: input.notes,
      verifiedBy: userId,
      verifiedAt: userId ? new Date() : null,
    },
    include: {
      skill: { include: { category: true } },
    },
  });
}

export async function getResourceSkills(tenantId: string, resourceId: string) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  return prisma.resourceSkill.findMany({
    where: { resourceId },
    include: {
      skill: { include: { category: true } },
      verifiedByUser: { select: { firstName: true, lastName: true } },
    },
    orderBy: [
      { skill: { category: { sortOrder: 'asc' } } },
      { proficiency: 'desc' },
    ],
  });
}

export async function removeSkillFromResource(
  tenantId: string,
  resourceId: string,
  skillId: string
) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });

  if (!resource) {
    throw new ApiError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  }

  await prisma.resourceSkill.delete({
    where: {
      resourceId_skillId: { resourceId, skillId },
    },
  });
}

export async function findResourcesBySkills(
  tenantId: string,
  skillIds: string[],
  minProficiency?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
) {
  const proficiencyOrder = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
  const minIndex = minProficiency ? proficiencyOrder.indexOf(minProficiency) : 0;
  const validProficiencies = proficiencyOrder.slice(minIndex) as ('BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT')[];

  return prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      skills: {
        some: {
          skillId: { in: skillIds },
          proficiency: { in: validProficiencies },
        },
      },
    },
    include: {
      practice: { select: { name: true } },
      skills: {
        where: { skillId: { in: skillIds } },
        include: { skill: true },
      },
      allocations: {
        where: {
          status: 'ACTIVE',
          endDate: { gte: new Date() },
        },
        select: { percentage: true },
      },
    },
  });
}

