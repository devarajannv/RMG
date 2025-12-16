import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as agentController from './agent.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Query endpoints
router.post('/query', agentController.processQuery);
router.get('/quick', agentController.quickQuery);
router.get('/suggestions', agentController.getSuggestions);

// Conversation management
router.get('/conversations', agentController.getConversations);
router.get('/conversations/:id', agentController.getConversation);
router.post('/conversations', agentController.createConversation);
router.delete('/conversations/:id', agentController.deleteConversation);

// Feedback
router.post('/messages/:messageId/feedback', agentController.provideFeedback);

export default router;

