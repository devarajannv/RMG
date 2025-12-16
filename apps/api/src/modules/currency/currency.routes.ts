import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as currencyController from './currency.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Currency routes
router.get('/currencies', currencyController.getCurrencies);
router.get('/currencies/base', currencyController.getBaseCurrency);
router.get('/currencies/:id', currencyController.getCurrency);
router.post('/currencies', currencyController.createCurrency);
router.put('/currencies/:id', currencyController.updateCurrency);
router.delete('/currencies/:id', currencyController.deleteCurrency);
router.post('/currencies/seed', currencyController.seedCurrencies);

// Exchange rate routes
router.get('/exchange-rates', currencyController.getExchangeRates);
router.get('/exchange-rates/current', currencyController.getCurrentRate);
router.post('/exchange-rates', currencyController.createExchangeRate);
router.put('/exchange-rates/:id', currencyController.updateExchangeRate);
router.delete('/exchange-rates/:id', currencyController.deleteExchangeRate);
router.post('/exchange-rates/convert', currencyController.convertAmount);

export default router;

