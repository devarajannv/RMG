import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import * as currencyController from './currency.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Currency routes (reads open to all authenticated, writes restricted)
router.get('/currencies', currencyController.getCurrencies);
router.get('/currencies/base', currencyController.getBaseCurrency);
router.get('/currencies/:id', currencyController.getCurrency);
router.post('/currencies', requireRoles('ADMIN', 'ORG_ADMIN'), currencyController.createCurrency);
router.put('/currencies/:id', requireRoles('ADMIN', 'ORG_ADMIN'), currencyController.updateCurrency);
router.delete('/currencies/:id', requireRoles('ADMIN'), currencyController.deleteCurrency);
router.post('/currencies/seed', requireRoles('ADMIN'), currencyController.seedCurrencies);

// Exchange rate routes
router.get('/exchange-rates', currencyController.getExchangeRates);
router.get('/exchange-rates/current', currencyController.getCurrentRate);
router.post('/exchange-rates', requireRoles('ADMIN', 'ORG_ADMIN'), currencyController.createExchangeRate);
router.put('/exchange-rates/:id', requireRoles('ADMIN', 'ORG_ADMIN'), currencyController.updateExchangeRate);
router.delete('/exchange-rates/:id', requireRoles('ADMIN'), currencyController.deleteExchangeRate);
router.post('/exchange-rates/convert', currencyController.convertAmount);

export default router;

