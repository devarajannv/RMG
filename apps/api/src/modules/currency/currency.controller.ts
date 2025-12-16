import { Request, Response, NextFunction } from 'express';
import { currencyService, exchangeRateService } from './currency.service';
import { z } from 'zod';

// Validation schemas
const createCurrencySchema = z.object({
  code: z.string().length(3).toUpperCase(),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  isBase: z.boolean().optional(),
  decimalPlaces: z.number().min(0).max(8).optional(),
});

const updateCurrencySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().min(1).max(10).optional(),
  isBase: z.boolean().optional(),
  isActive: z.boolean().optional(),
  decimalPlaces: z.number().min(0).max(8).optional(),
});

const createExchangeRateSchema = z.object({
  fromCurrencyId: z.string().uuid(),
  toCurrencyId: z.string().uuid(),
  rate: z.number().positive(),
  effectiveFrom: z.string().transform(s => new Date(s)),
  effectiveTo: z.string().transform(s => new Date(s)).optional(),
  source: z.string().optional(),
});

const updateExchangeRateSchema = z.object({
  rate: z.number().positive().optional(),
  effectiveTo: z.string().transform(s => new Date(s)).optional(),
});

const convertAmountSchema = z.object({
  amount: z.number(),
  fromCurrency: z.string().length(3).toUpperCase(),
  toCurrency: z.string().length(3).toUpperCase(),
  date: z.string().transform(s => new Date(s)).optional(),
});

// Currency Controllers
export const getCurrencies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const currencies = await currencyService.getCurrencies(tenantId);
    res.json(currencies);
  } catch (error) {
    next(error);
  }
};

export const getCurrency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const currency = await currencyService.getCurrency(tenantId, req.params.id);
    if (!currency) {
      res.status(404).json({ error: 'Currency not found' });
      return;
    }
    res.json(currency);
  } catch (error) {
    next(error);
  }
};

export const getBaseCurrency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const currency = await currencyService.getBaseCurrency(tenantId);
    if (!currency) {
      res.status(404).json({ error: 'Base currency not configured' });
      return;
    }
    res.json(currency);
  } catch (error) {
    next(error);
  }
};

export const createCurrency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = createCurrencySchema.parse(req.body);
    const currency = await currencyService.createCurrency(tenantId, data);
    res.status(201).json(currency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const updateCurrency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateCurrencySchema.parse(req.body);
    const currency = await currencyService.updateCurrency(tenantId, req.params.id, data);
    res.json(currency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const deleteCurrency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await currencyService.deleteCurrency(tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot delete base currency') {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
};

export const seedCurrencies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await currencyService.seedDefaultCurrencies(tenantId);
    await exchangeRateService.seedDefaultRates(tenantId);
    res.json({ message: 'Default currencies and rates seeded successfully' });
  } catch (error) {
    next(error);
  }
};

// Exchange Rate Controllers
export const getExchangeRates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters: any = {};
    if (req.query.fromCurrencyId) filters.fromCurrencyId = req.query.fromCurrencyId;
    if (req.query.toCurrencyId) filters.toCurrencyId = req.query.toCurrencyId;
    if (req.query.effectiveDate) filters.effectiveDate = new Date(req.query.effectiveDate as string);

    const rates = await exchangeRateService.getExchangeRates(tenantId, filters);
    res.json(rates);
  } catch (error) {
    next(error);
  }
};

export const getCurrentRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { from, to } = req.query;
    if (!from || !to) {
      res.status(400).json({ error: 'from and to currency codes are required' });
      return;
    }

    const rate = await exchangeRateService.getCurrentRate(
      tenantId,
      (from as string).toUpperCase(),
      (to as string).toUpperCase()
    );

    if (rate === null) {
      res.status(404).json({ error: 'Exchange rate not found' });
      return;
    }

    res.json({ from, to, rate });
  } catch (error) {
    next(error);
  }
};

export const createExchangeRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = createExchangeRateSchema.parse(req.body);
    const rate = await exchangeRateService.createExchangeRate(tenantId, {
      ...data,
      createdById: req.user?.id,
    });
    res.status(201).json(rate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const updateExchangeRate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateExchangeRateSchema.parse(req.body);
    const rate = await exchangeRateService.updateExchangeRate(tenantId, req.params.id, data);
    res.json(rate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const deleteExchangeRate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await exchangeRateService.deleteExchangeRate(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const convertAmount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = convertAmountSchema.parse(req.body);
    const result = await exchangeRateService.convertAmount(
      tenantId,
      data.amount,
      data.fromCurrency,
      data.toCurrency,
      data.date
    );

    if (!result) {
      res.status(404).json({ error: 'Exchange rate not found' });
      return;
    }

    res.json({
      originalAmount: data.amount,
      fromCurrency: data.fromCurrency,
      toCurrency: data.toCurrency,
      convertedAmount: result.amount,
      rate: result.rate,
      date: data.date || 'current',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

