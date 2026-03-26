import { PrismaClient, Currency, ExchangeRate } from '@prisma/client';
import { createAuditLog } from '../audit/audit.service';

const prisma = new PrismaClient();

// Currency Service
export const currencyService = {
  // Get all currencies for a tenant
  async getCurrencies(tenantId: string): Promise<Currency[]> {
    return prisma.currency.findMany({
      where: { tenantId },
      orderBy: [{ isBase: 'desc' }, { code: 'asc' }],
    });
  },

  // Get a single currency
  async getCurrency(tenantId: string, id: string): Promise<Currency | null> {
    return prisma.currency.findFirst({
      where: { id, tenantId },
    });
  },

  // Get base currency
  async getBaseCurrency(tenantId: string): Promise<Currency | null> {
    return prisma.currency.findFirst({
      where: { tenantId, isBase: true },
    });
  },

  // Create a currency
  async createCurrency(tenantId: string, data: {
    code: string;
    name: string;
    symbol: string;
    isBase?: boolean;
    decimalPlaces?: number;
  }, actorUserId?: string): Promise<Currency> {
    // If this is being set as base, unset other base currencies
    if (data.isBase) {
      await prisma.currency.updateMany({
        where: { tenantId, isBase: true },
        data: { isBase: false },
      });
    }

    const created = await prisma.currency.create({
      data: {
        tenantId,
        code: data.code.toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        isBase: data.isBase || false,
        decimalPlaces: data.decimalPlaces || 2,
      },
    });

    await createAuditLog(
      tenantId,
      actorUserId ?? null,
      'Currency',
      created.id,
      'CREATE',
      {
        code: created.code,
        name: created.name,
        symbol: created.symbol,
        isBase: created.isBase,
        decimalPlaces: created.decimalPlaces,
      }
    );

    return created;
  },

  // Update a currency
  async updateCurrency(tenantId: string, id: string, data: {
    name?: string;
    symbol?: string;
    isBase?: boolean;
    isActive?: boolean;
    decimalPlaces?: number;
  }, actorUserId?: string): Promise<Currency> {
    const existing = await prisma.currency.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Currency not found');
    }

    // If this is being set as base, unset other base currencies
    if (data.isBase) {
      await prisma.currency.updateMany({
        where: { tenantId, isBase: true, id: { not: id } },
        data: { isBase: false },
      });
    }

    const updated = await prisma.currency.update({
      where: { id },
      data,
    });

    await createAuditLog(
      tenantId,
      actorUserId ?? null,
      'Currency',
      updated.id,
      'UPDATE',
      {
        before: {
          name: existing.name,
          symbol: existing.symbol,
          isBase: existing.isBase,
          isActive: existing.isActive,
          decimalPlaces: existing.decimalPlaces,
        },
        after: data,
      }
    );

    return updated;
  },

  // Delete a currency (soft delete by deactivating)
  async deleteCurrency(tenantId: string, id: string, actorUserId?: string): Promise<Currency> {
    const currency = await prisma.currency.findFirst({
      where: { id, tenantId },
    });

    if (!currency) {
      throw new Error('Currency not found');
    }

    if (currency?.isBase) {
      throw new Error('Cannot delete base currency');
    }

    const updated = await prisma.currency.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog(
      tenantId,
      actorUserId ?? null,
      'Currency',
      updated.id,
      'DELETE',
      {
        code: currency.code,
        name: currency.name,
        reason: 'SOFT_DELETE',
      }
    );

    return updated;
  },

  // Seed default currencies
  async seedDefaultCurrencies(tenantId: string): Promise<void> {
    // Get tenant's base currency setting
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const baseCurrencyCode = tenant?.currency || 'INR'; // Default to INR for Indian company

    const defaultCurrencies = [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    ];

    for (const curr of defaultCurrencies) {
      await prisma.currency.upsert({
        where: { tenantId_code: { tenantId, code: curr.code } },
        update: {},
        create: { 
          tenantId, 
          ...curr,
          isBase: curr.code === baseCurrencyCode, // Set base based on tenant setting
        },
      });
    }
  },
};

// Exchange Rate Service
export const exchangeRateService = {
  // Get all exchange rates for a tenant
  async getExchangeRates(tenantId: string, filters?: {
    fromCurrencyId?: string;
    toCurrencyId?: string;
    effectiveDate?: Date;
  }): Promise<ExchangeRate[]> {
    const where: any = { tenantId };

    if (filters?.fromCurrencyId) {
      where.fromCurrencyId = filters.fromCurrencyId;
    }
    if (filters?.toCurrencyId) {
      where.toCurrencyId = filters.toCurrencyId;
    }
    if (filters?.effectiveDate) {
      where.effectiveFrom = { lte: filters.effectiveDate };
      where.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: filters.effectiveDate } },
      ];
    }

    return prisma.exchangeRate.findMany({
      where,
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  },

  // Get current exchange rate between two currencies
  async getCurrentRate(
    tenantId: string,
    fromCurrencyCode: string,
    toCurrencyCode: string
  ): Promise<number | null> {
    const fromCurrency = await prisma.currency.findFirst({
      where: { tenantId, code: fromCurrencyCode },
    });
    const toCurrency = await prisma.currency.findFirst({
      where: { tenantId, code: toCurrencyCode },
    });

    if (!fromCurrency || !toCurrency) {
      return null;
    }

    if (fromCurrency.id === toCurrency.id) {
      return 1;
    }

    const today = new Date();
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        tenantId,
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id,
        effectiveFrom: { lte: today },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: today } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return rate ? Number(rate.rate) : null;
  },

  // Get historical rate for a specific date
  async getHistoricalRate(
    tenantId: string,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date: Date
  ): Promise<number | null> {
    const fromCurrency = await prisma.currency.findFirst({
      where: { tenantId, code: fromCurrencyCode },
    });
    const toCurrency = await prisma.currency.findFirst({
      where: { tenantId, code: toCurrencyCode },
    });

    if (!fromCurrency || !toCurrency) {
      return null;
    }

    if (fromCurrency.id === toCurrency.id) {
      return 1;
    }

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        tenantId,
        fromCurrencyId: fromCurrency.id,
        toCurrencyId: toCurrency.id,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: date } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return rate ? Number(rate.rate) : null;
  },

  // Create an exchange rate
  async createExchangeRate(tenantId: string, data: {
    fromCurrencyId: string;
    toCurrencyId: string;
    rate: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    source?: string;
    createdById?: string;
  }): Promise<ExchangeRate> {
    // Close any existing open rates for the same pair
    await prisma.exchangeRate.updateMany({
      where: {
        tenantId,
        fromCurrencyId: data.fromCurrencyId,
        toCurrencyId: data.toCurrencyId,
        effectiveTo: null,
        effectiveFrom: { lt: data.effectiveFrom },
      },
      data: {
        effectiveTo: new Date(data.effectiveFrom.getTime() - 86400000), // Day before
      },
    });

    const created = await prisma.exchangeRate.create({
      data: {
        tenantId,
        fromCurrencyId: data.fromCurrencyId,
        toCurrencyId: data.toCurrencyId,
        rate: data.rate,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || null,
        source: data.source || 'MANUAL',
        createdById: data.createdById,
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });

    await createAuditLog(
      tenantId,
      data.createdById ?? null,
      'ExchangeRate',
      created.id,
      'CREATE',
      {
        fromCurrencyId: created.fromCurrencyId,
        toCurrencyId: created.toCurrencyId,
        rate: Number(created.rate),
        effectiveFrom: created.effectiveFrom.toISOString(),
        effectiveTo: created.effectiveTo?.toISOString(),
        source: created.source,
      }
    );

    return created;
  },

  // Update an exchange rate
  async updateExchangeRate(
    tenantId: string,
    id: string,
    data: {
      rate?: number;
      effectiveTo?: Date;
    },
    actorUserId?: string,
  ): Promise<ExchangeRate> {
    const existing = await prisma.exchangeRate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Exchange rate not found');
    }

    const updated = await prisma.exchangeRate.update({
      where: { id },
      data,
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });

    await createAuditLog(
      tenantId,
      actorUserId ?? null,
      'ExchangeRate',
      updated.id,
      'UPDATE',
      {
        before: {
          rate: Number(existing.rate),
          effectiveTo: existing.effectiveTo?.toISOString(),
        },
        after: {
          rate: data.rate,
          effectiveTo: data.effectiveTo?.toISOString(),
        },
      }
    );

    return updated;
  },

  // Delete an exchange rate
  async deleteExchangeRate(tenantId: string, id: string, actorUserId?: string): Promise<void> {
    const existing = await prisma.exchangeRate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Exchange rate not found');
    }

    await prisma.exchangeRate.delete({ where: { id } });

    await createAuditLog(
      tenantId,
      actorUserId ?? null,
      'ExchangeRate',
      id,
      'DELETE',
      {
        fromCurrencyId: existing.fromCurrencyId,
        toCurrencyId: existing.toCurrencyId,
        rate: Number(existing.rate),
        effectiveFrom: existing.effectiveFrom.toISOString(),
      }
    );
  },

  // Convert amount between currencies
  async convertAmount(
    tenantId: string,
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    useHistorical?: Date
  ): Promise<{ amount: number; rate: number } | null> {
    const rate = useHistorical
      ? await this.getHistoricalRate(tenantId, fromCurrencyCode, toCurrencyCode, useHistorical)
      : await this.getCurrentRate(tenantId, fromCurrencyCode, toCurrencyCode);

    if (rate === null) {
      return null;
    }

    return {
      amount: amount * rate,
      rate,
    };
  },

  // Seed default exchange rates
  async seedDefaultRates(tenantId: string): Promise<void> {
    const currencies = await prisma.currency.findMany({ where: { tenantId } });
    const usd = currencies.find(c => c.code === 'USD');
    
    if (!usd) return;

    const defaultRates: Record<string, number> = {
      INR: 83.5,
      EUR: 0.92,
      GBP: 0.79,
      AUD: 1.53,
      SGD: 1.34,
    };

    for (const currency of currencies) {
      if (currency.code !== 'USD' && defaultRates[currency.code]) {
        await prisma.exchangeRate.upsert({
          where: {
            tenantId_fromCurrencyId_toCurrencyId_effectiveFrom: {
              tenantId,
              fromCurrencyId: usd.id,
              toCurrencyId: currency.id,
              effectiveFrom: new Date('2025-01-01'),
            },
          },
          update: { rate: defaultRates[currency.code] },
          create: {
            tenantId,
            fromCurrencyId: usd.id,
            toCurrencyId: currency.id,
            rate: defaultRates[currency.code],
            effectiveFrom: new Date('2025-01-01'),
            source: 'SEED',
          },
        });
      }
    }
  },
};

export default { currencyService, exchangeRateService };

