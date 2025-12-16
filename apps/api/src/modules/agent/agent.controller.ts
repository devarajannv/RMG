import { Request, Response, NextFunction } from 'express';
import { agentService } from './agent.service';
import { z } from 'zod';

// Validation schemas
const querySchema = z.object({
  query: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
  context: z.object({
    currentPage: z.string().optional(),
    selectedEntity: z.object({
      type: z.string(),
      id: z.string(),
    }).optional(),
  }).optional(),
});

const feedbackSchema = z.object({
  feedback: z.enum(['positive', 'negative']),
  note: z.string().max(500).optional(),
});

// Controllers
export const processQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = querySchema.parse(req.body);
    
    const response = await agentService.processQuery(
      tenantId,
      userId,
      data.query,
      data.conversationId,
      data.context
    );

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversations = await agentService.getConversations(tenantId, userId);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conversation = await agentService.getConversation(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversation = await agentService.createConversation(
      tenantId,
      userId,
      req.body.title
    );
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await agentService.deleteConversation(_req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const provideFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = feedbackSchema.parse(req.body);
    await agentService.provideFeedback(req.params.messageId, data.feedback, data.note);
    res.json({ message: 'Feedback recorded' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

// Quick query endpoint (no conversation tracking)
export const quickQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const classification = agentService.classifyQuery(query);
    const response = await agentService.executeQuery(tenantId, classification, query, []);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get suggestions based on context
export const getSuggestions = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const page = req.query.page as string;
  
  // Provide context-aware suggestions
  const suggestions: string[] = [];
  
  switch (page) {
    case 'dashboard':
      suggestions.push(
        'What is our current utilization?',
        'How many resources are on bench?',
        'Show me upcoming rolloffs',
      );
      break;
    case 'resources':
      suggestions.push(
        'Find developers with React skills',
        'Show me bench resources',
        'Who has AWS certifications?',
      );
      break;
    case 'projects':
      suggestions.push(
        'How many active projects?',
        'Show projects with red health status',
        'Which projects are understaffed?',
      );
      break;
    case 'bench':
      suggestions.push(
        'Show resources on bench for more than 30 days',
        'What is the bench cost this month?',
        'Find bench resources with Java skills',
      );
      break;
    default:
      suggestions.push(
        'What is our current utilization?',
        'Show me bench resources',
        'Find React developers',
        'How many active projects?',
      );
  }

  res.json({ suggestions });
};
