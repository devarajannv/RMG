import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { agentQueryLimiter } from '../../middleware/rateLimiter';
import * as agentController from './agent.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// M-06: Query endpoints require agent:query permission
router.post('/query', agentQueryLimiter, authorize('agent:query'), agentController.processQuery);
router.get('/quick', agentQueryLimiter, authorize('agent:query'), agentController.quickQuery);
router.get('/suggestions', agentQueryLimiter, authorize('agent:query'), agentController.getSuggestions);

// M-06: Conversation management requires agent:manage permission
router.get('/conversations', authorize('agent:manage'), agentController.getConversations);
router.get('/conversations/:id', authorize('agent:manage'), agentController.getConversation);
router.post('/conversations', authorize('agent:manage'), agentController.createConversation);
router.delete('/conversations/:id', authorize('agent:manage'), agentController.deleteConversation);

// Feedback - requires agent:query permission
router.post('/messages/:messageId/feedback', agentQueryLimiter, authorize('agent:query'), agentController.provideFeedback);

export default router;

