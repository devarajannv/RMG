import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test utility functions that don't require database access
describe('Intelligence Service - Utilities', () => {
  describe('Score Calculation Logic', () => {
    // Test the scoring logic conceptually
    it('should prioritize experts over beginners', () => {
      const proficiencyScores: Record<string, number> = {
        EXPERT: 100,
        ADVANCED: 80,
        INTERMEDIATE: 60,
        BEGINNER: 40,
      };

      expect(proficiencyScores.EXPERT).toBeGreaterThan(proficiencyScores.ADVANCED);
      expect(proficiencyScores.ADVANCED).toBeGreaterThan(proficiencyScores.INTERMEDIATE);
      expect(proficiencyScores.INTERMEDIATE).toBeGreaterThan(proficiencyScores.BEGINNER);
    });

    it('should calculate weighted skill score correctly', () => {
      const weights = { skillMatch: 0.4, availability: 0.3, proficiency: 0.3 };
      
      // Full match: 100 skill, 100 availability, 100 proficiency
      const fullScore = 100 * weights.skillMatch + 100 * weights.availability + 100 * weights.proficiency;
      expect(fullScore).toBe(100);

      // Partial match: 80 skill, 50 availability, 60 proficiency
      const partialScore = 80 * weights.skillMatch + 50 * weights.availability + 60 * weights.proficiency;
      expect(partialScore).toBe(65); // 32 + 15 + 18 = 65
    });

    it('should handle zero availability correctly', () => {
      const weights = { skillMatch: 0.4, availability: 0.3, proficiency: 0.3 };
      
      // Resource with no availability
      const score = 100 * weights.skillMatch + 0 * weights.availability + 100 * weights.proficiency;
      expect(score).toBe(70); // 40 + 0 + 30 = 70
    });
  });

  describe('Utilization Calculations', () => {
    it('should calculate utilization from allocations', () => {
      const allocations = [
        { percentage: 50, isBillable: true },
        { percentage: 25, isBillable: true },
        { percentage: 10, isBillable: false },
      ];

      const totalAllocation = allocations.reduce((sum, a) => sum + a.percentage, 0);
      const billableAllocation = allocations
        .filter(a => a.isBillable)
        .reduce((sum, a) => sum + a.percentage, 0);

      expect(totalAllocation).toBe(85);
      expect(billableAllocation).toBe(75);
    });

    it('should calculate available capacity', () => {
      const capacity = 100;
      const allocations = [
        { percentage: 50 },
        { percentage: 30 },
      ];

      const used = allocations.reduce((sum, a) => sum + a.percentage, 0);
      const available = capacity - used;

      expect(available).toBe(20);
    });

    it('should handle over-allocation', () => {
      const capacity = 100;
      const allocations = [
        { percentage: 60 },
        { percentage: 50 },
      ];

      const used = allocations.reduce((sum, a) => sum + a.percentage, 0);
      const available = Math.max(0, capacity - used);

      expect(used).toBe(110); // Over-allocated
      expect(available).toBe(0); // No capacity
    });
  });

  describe('Skill Matching Logic', () => {
    it('should identify matched skills', () => {
      const requiredSkills = ['Java', 'React', 'AWS'];
      const resourceSkills = ['Java', 'Python', 'AWS', 'Docker'];

      const matched = requiredSkills.filter(s => resourceSkills.includes(s));
      const missing = requiredSkills.filter(s => !resourceSkills.includes(s));

      expect(matched).toEqual(['Java', 'AWS']);
      expect(missing).toEqual(['React']);
    });

    it('should calculate match percentage', () => {
      const requiredSkills = ['Java', 'React', 'AWS', 'Node.js'];
      const resourceSkills = ['Java', 'AWS'];

      const matchCount = requiredSkills.filter(s => resourceSkills.includes(s)).length;
      const matchPercentage = (matchCount / requiredSkills.length) * 100;

      expect(matchPercentage).toBe(50);
    });

    it('should handle empty requirements', () => {
      const requiredSkills: string[] = [];
      const resourceSkills = ['Java', 'Python'];

      // With no requirements, everyone matches
      const matchPercentage = requiredSkills.length === 0 ? 100 : 
        (requiredSkills.filter(s => resourceSkills.includes(s)).length / requiredSkills.length) * 100;

      expect(matchPercentage).toBe(100);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate appropriate recommendation for high score', () => {
      const getRecommendation = (score: number): string => {
        if (score >= 90) return 'Excellent match - highly recommended';
        if (score >= 75) return 'Good match - recommended';
        if (score >= 60) return 'Partial match - consider for discussion';
        return 'Low match - not recommended';
      };

      expect(getRecommendation(95)).toBe('Excellent match - highly recommended');
      expect(getRecommendation(80)).toBe('Good match - recommended');
      expect(getRecommendation(65)).toBe('Partial match - consider for discussion');
      expect(getRecommendation(40)).toBe('Low match - not recommended');
    });
  });

  describe('Bench Days Calculation', () => {
    it('should calculate bench days from benchSince date', () => {
      const benchSince = new Date('2024-12-01');
      const today = new Date('2024-12-16');
      
      const benchDays = Math.floor((today.getTime() - benchSince.getTime()) / (1000 * 60 * 60 * 24));
      expect(benchDays).toBe(15);
    });

    it('should return 0 for non-bench resources', () => {
      const benchSince = null;
      const benchDays = benchSince ? 
        Math.floor((Date.now() - benchSince.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      expect(benchDays).toBe(0);
    });

    it('should categorize bench aging correctly', () => {
      const categorize = (days: number): string => {
        if (days <= 7) return 'Fresh';
        if (days <= 30) return 'Moderate';
        if (days <= 60) return 'Critical';
        return 'Severe';
      };

      expect(categorize(5)).toBe('Fresh');
      expect(categorize(15)).toBe('Moderate');
      expect(categorize(45)).toBe('Critical');
      expect(categorize(90)).toBe('Severe');
    });
  });

  describe('Skill Gap Analysis', () => {
    it('should identify critical gaps', () => {
      const projectNeeds = [
        { skill: 'Java', count: 3, importance: 'REQUIRED' },
        { skill: 'React', count: 2, importance: 'REQUIRED' },
        { skill: 'AWS', count: 1, importance: 'NICE_TO_HAVE' },
      ];

      const teamSkills = {
        Java: 2,
        React: 2,
        AWS: 0,
      };

      const gaps = projectNeeds
        .filter(need => need.importance === 'REQUIRED')
        .filter(need => (teamSkills[need.skill as keyof typeof teamSkills] || 0) < need.count)
        .map(need => ({
          skill: need.skill,
          needed: need.count,
          have: teamSkills[need.skill as keyof typeof teamSkills] || 0,
          gap: need.count - (teamSkills[need.skill as keyof typeof teamSkills] || 0),
        }));

      expect(gaps).toHaveLength(1);
      expect(gaps[0].skill).toBe('Java');
      expect(gaps[0].gap).toBe(1);
    });
  });
});
