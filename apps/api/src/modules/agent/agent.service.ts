import { PrismaClient, AgentConversation, AgentMessage } from '@prisma/client';

const prisma = new PrismaClient();

// Query router configuration
const ROUTING_CONFIG = {
  // Tier 1: Simple queries - Gemini Flash
  tier1: {
    model: 'gemini-1.5-flash',
    patterns: [
      /^(show|list|get|find|search|who|what|where|how many)/i,
      /bench|available|on bench/i,
      /utilization|allocation/i,
    ],
    actions: ['read', 'list', 'search'],
  },
  // Tier 2: Medium complexity - GPT-4o-mini
  tier2: {
    model: 'gpt-4o-mini',
    patterns: [
      /analyze|compare|trend|forecast/i,
      /report|summary|breakdown/i,
    ],
    actions: ['analyze', 'report'],
  },
  // Tier 3: Complex analysis - Gemini Pro
  tier3: {
    model: 'gemini-1.5-pro',
    patterns: [
      /optimize|recommend|suggest|best/i,
      /strategy|plan|predict/i,
    ],
    actions: ['recommend', 'optimize'],
  },
};

// Response types for rich rendering
type ResponseType = 'text' | 'table' | 'cards' | 'chart' | 'gauge' | 'list';

interface QueryClassification {
  tier: 'T1' | 'T2' | 'T3';
  model: string;
  intent: string;
  entities: Record<string, string>;
  responseType: ResponseType;
}

interface AgentResponse {
  content: string;
  responseType: ResponseType;
  responseData?: any;
  model: string;
  tier: string;
  confidence: number;
}

export const agentService = {
  // Classify the query to determine routing
  classifyQuery(query: string): QueryClassification {
    // Simple pattern matching for classification
    // In production, this would use the classifier LLM
    
    let tier: 'T1' | 'T2' | 'T3' = 'T1';
    let model = ROUTING_CONFIG.tier1.model;
    let responseType: ResponseType = 'text';

    // Check for tier 3 patterns first (most specific)
    if (ROUTING_CONFIG.tier3.patterns.some(p => p.test(query))) {
      tier = 'T3';
      model = ROUTING_CONFIG.tier3.model;
      responseType = 'text';
    }
    // Check for tier 2 patterns
    else if (ROUTING_CONFIG.tier2.patterns.some(p => p.test(query))) {
      tier = 'T2';
      model = ROUTING_CONFIG.tier2.model;
      responseType = 'table';
    }

    // Determine response type based on query
    if (/list|show all|find/i.test(query)) {
      responseType = query.length < 50 ? 'cards' : 'table';
    }
    if (/utilization|rate|percentage/i.test(query)) {
      responseType = 'gauge';
    }
    if (/trend|over time|monthly|weekly/i.test(query)) {
      responseType = 'chart';
    }

    // Extract entities (simplified)
    const entities: Record<string, string> = {};
    
    // Extract skill mentions
    const skillMatch = query.match(/with\s+(\w+)\s+skills?/i);
    if (skillMatch) entities.skill = skillMatch[1];
    
    // Extract project mentions
    const projectMatch = query.match(/(?:project|on)\s+(\w+)/i);
    if (projectMatch) entities.project = projectMatch[1];
    
    // Extract resource mentions
    const resourceMatch = query.match(/(?:for|about)\s+(\w+\s+\w+)/i);
    if (resourceMatch) entities.resource = resourceMatch[1];

    return {
      tier,
      model,
      intent: this.extractIntent(query),
      entities,
      responseType,
    };
  },

  // Extract intent from query
  extractIntent(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (/show|list|get|find|search/.test(lowerQuery)) return 'search';
    if (/how many|count|total/.test(lowerQuery)) return 'count';
    if (/who is|who are/.test(lowerQuery)) return 'identify';
    if (/what is|what are/.test(lowerQuery)) return 'describe';
    if (/utilization|rate/.test(lowerQuery)) return 'metric';
    if (/trend|over time/.test(lowerQuery)) return 'trend';
    if (/compare|vs|versus/.test(lowerQuery)) return 'compare';
    if (/recommend|suggest/.test(lowerQuery)) return 'recommend';
    if (/forecast|predict/.test(lowerQuery)) return 'forecast';
    
    return 'query';
  },

  // Process query (simulated - would call actual LLM in production)
  async processQuery(
    tenantId: string,
    userId: string,
    query: string,
    conversationId?: string,
    _context?: any
  ): Promise<AgentResponse> {
    // Classify the query
    const classification = this.classifyQuery(query);
    
    // Get or create conversation
    let conversation: AgentConversation;
    if (conversationId) {
      const existing = await prisma.agentConversation.findUnique({
        where: { id: conversationId },
      });
      if (existing) {
        conversation = existing;
      } else {
        conversation = await this.createConversation(tenantId, userId);
      }
    } else {
      conversation = await this.createConversation(tenantId, userId);
    }

    // Get conversation history for context (used for future multi-turn conversations)
    await this.getConversationHistory(conversation.id, 5);

    // Save user message
    await this.saveMessage(conversation.id, 'user', query);

    // Execute the query based on intent
    const response = await this.executeQuery(tenantId, classification, query, []);

    // Save assistant response
    await this.saveMessage(conversation.id, 'assistant', response.content, {
      model: response.model,
      tier: response.tier,
      confidence: response.confidence,
      responseType: response.responseType,
      responseData: response.responseData,
    });

    return response;
  },

  // Execute query and generate response
  async executeQuery(
    tenantId: string,
    classification: QueryClassification,
    query: string,
    _history: AgentMessage[]
  ): Promise<AgentResponse> {
    // In production, this would call the actual LLM API
    // For now, we'll execute database queries based on intent
    
    const { intent, entities, responseType, tier, model } = classification;
    let content = '';
    let responseData: any = null;
    let confidence = 0.9;

    try {
      switch (intent) {
        case 'search':
          if (/bench|available/i.test(query)) {
            const resources = await prisma.resource.findMany({
              where: { tenantId, status: 'ACTIVE', benchSince: { not: null } },
              include: { skills: { include: { skill: true } }, location: true },
              take: 10,
            });
            
            if (resources.length === 0) {
              content = 'No resources are currently on bench.';
            } else {
              content = `Found ${resources.length} resource(s) on bench:`;
              responseData = resources.map(r => ({
                id: r.id,
                name: `${r.firstName} ${r.lastName}`,
                designation: r.designation,
                location: r.location?.name,
                benchSince: r.benchSince,
                skills: r.skills.map(s => s.skill.name),
              }));
            }
          } else if (entities.skill) {
            const skill = await prisma.skill.findFirst({
              where: { tenantId, name: { contains: entities.skill, mode: 'insensitive' } },
            });
            
            if (skill) {
              const resources = await prisma.resourceSkill.findMany({
                where: { skillId: skill.id },
                include: { resource: { include: { location: true } } },
                take: 10,
              });
              
              content = `Found ${resources.length} resource(s) with ${skill.name} skills:`;
              responseData = resources.map(rs => ({
                id: rs.resource.id,
                name: `${rs.resource.firstName} ${rs.resource.lastName}`,
                designation: rs.resource.designation,
                proficiency: rs.proficiency,
                yearsExp: rs.yearsExp,
              }));
            } else {
              content = `No resources found with ${entities.skill} skills.`;
            }
          } else {
            content = 'Please specify what you would like to search for (e.g., "Show me bench resources" or "Find React developers").';
            confidence = 0.7;
          }
          break;

        case 'count':
          if (/bench/i.test(query)) {
            const count = await prisma.resource.count({
              where: { tenantId, status: 'ACTIVE', benchSince: { not: null } },
            });
            content = `There are currently ${count} resource(s) on bench.`;
            responseData = { count };
          } else if (/project/i.test(query)) {
            const count = await prisma.project.count({
              where: { tenantId, status: 'ACTIVE' },
            });
            content = `There are ${count} active project(s).`;
            responseData = { count };
          } else if (/resource|employee/i.test(query)) {
            const count = await prisma.resource.count({
              where: { tenantId, status: 'ACTIVE' },
            });
            content = `There are ${count} active resource(s) in the organization.`;
            responseData = { count };
          }
          break;

        case 'metric':
          if (/utilization/i.test(query)) {
            const totalResources = await prisma.resource.count({
              where: { tenantId, status: 'ACTIVE' },
            });
            const benchResources = await prisma.resource.count({
              where: { tenantId, status: 'ACTIVE', benchSince: { not: null } },
            });
            const utilization = totalResources > 0 
              ? Math.round(((totalResources - benchResources) / totalResources) * 100) 
              : 0;
            
            content = `Current utilization rate is ${utilization}%.`;
            responseData = { 
              utilization, 
              total: totalResources, 
              bench: benchResources,
              allocated: totalResources - benchResources,
            };
          }
          break;

        case 'identify':
          if (entities.resource) {
            const nameParts = entities.resource.split(' ');
            const resource = await prisma.resource.findFirst({
              where: {
                tenantId,
                OR: [
                  { firstName: { contains: nameParts[0], mode: 'insensitive' } },
                  { lastName: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' } },
                ],
              },
              include: {
                skills: { include: { skill: true } },
                allocations: { 
                  where: { status: 'ACTIVE' },
                  include: { project: true },
                },
                location: true,
                practice: true,
              },
            });
            
            if (resource) {
              content = `${resource.firstName} ${resource.lastName} is a ${resource.designation} in the ${resource.practice?.name || 'N/A'} practice.`;
              responseData = {
                id: resource.id,
                name: `${resource.firstName} ${resource.lastName}`,
                designation: resource.designation,
                practice: resource.practice?.name,
                location: resource.location?.name,
                status: resource.status,
                skills: resource.skills.map(s => s.skill.name),
                currentProjects: resource.allocations.map(a => a.project.name),
              };
            } else {
              content = `Could not find a resource matching "${entities.resource}".`;
              confidence = 0.6;
            }
          }
          break;

        default:
          content = `I can help you with queries like:
• "Show me bench resources"
• "Find developers with React skills"
• "What's our current utilization?"
• "How many active projects do we have?"
• "Who is Rahul Kumar?"

Please try one of these or ask something similar.`;
          confidence = 0.5;
      }
    } catch (error) {
      console.error('Agent query error:', error);
      content = 'I encountered an error processing your request. Please try again.';
      confidence = 0.3;
    }

    return {
      content,
      responseType: responseData ? responseType : 'text',
      responseData,
      model,
      tier,
      confidence,
    };
  },

  // Create a new conversation
  async createConversation(tenantId: string, userId: string, title?: string): Promise<AgentConversation> {
    return prisma.agentConversation.create({
      data: {
        tenantId,
        userId,
        title: title || 'New Conversation',
      },
    });
  },

  // Get conversation history
  async getConversationHistory(conversationId: string, limit: number = 10): Promise<AgentMessage[]> {
    return prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  },

  // Save a message
  async saveMessage(
    conversationId: string,
    role: string,
    content: string,
    metadata?: {
      model?: string;
      tier?: string;
      confidence?: number;
      responseType?: string;
      responseData?: any;
    }
  ): Promise<AgentMessage> {
    return prisma.agentMessage.create({
      data: {
        conversationId,
        role,
        content,
        model: metadata?.model,
        routingTier: metadata?.tier,
        confidence: metadata?.confidence,
        responseType: metadata?.responseType,
        responseData: metadata?.responseData,
      },
    });
  },

  // Get user's conversations
  async getConversations(tenantId: string, userId: string): Promise<AgentConversation[]> {
    return prisma.agentConversation.findMany({
      where: { tenantId, userId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  },

  // Get a specific conversation with messages
  async getConversation(conversationId: string): Promise<AgentConversation | null> {
    return prisma.agentConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  },

  // Delete/archive a conversation
  async deleteConversation(conversationId: string): Promise<void> {
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { status: 'ARCHIVED' },
    });
  },

  // Provide feedback on a message
  async provideFeedback(messageId: string, feedback: 'positive' | 'negative', note?: string): Promise<void> {
    await prisma.agentMessage.update({
      where: { id: messageId },
      data: { feedback, feedbackNote: note },
    });
  },
};

export default agentService;

