/**
 * Currency Context
 * Provides global currency state management for the application
 * 
 * Created: 2026-01-20
 * Part of: Currency Display Fix Implementation
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

interface ExchangeRateResponse {
  convertedAmount: number;
  rate: number;
}

interface CurrencyContextValue {
  // State
  baseCurrency: Currency | null;
  currencies: Currency[];
  selectedCurrency: Currency | null;
  exchangeRate: number;
  isLoading: boolean;
  error: string | null;
  
  // Formatting functions
  formatAmount: (amount: number, currencyCode?: string) => string;
  formatCompact: (amount: number, currencyCode?: string) => string;
  getCurrencySymbol: (currencyCode?: string) => string;
  
  // Actions
  setSelectedCurrency: (code: string) => void;
  refreshCurrencies: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<Currency | null>(null);
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load currencies on mount
  const loadCurrencies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await api.get<Currency[]>('/currency/currencies');
      const currencyList = res || [];
      setCurrencies(currencyList);
      
      // Find base currency
      const base = currencyList.find((c: Currency) => c.isBase);
      if (base) {
        setBaseCurrency(base);
        // Default selected to base currency
        if (!selectedCurrency) {
          setSelectedCurrencyState(base);
        }
      }
    } catch (err) {
      console.error('Failed to load currencies:', err);
      setError('Failed to load currencies');
      
      // Set fallback based on what's likely configured
      // This will be overwritten once API is available
      const fallback: Currency = {
        id: '',
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        isBase: true,
        isActive: true,
      };
      setBaseCurrency(fallback);
      setSelectedCurrencyState(fallback);
      setCurrencies([fallback]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCurrency]);

  // Load exchange rate when selected currency changes
  const loadExchangeRate = useCallback(async () => {
    if (!selectedCurrency || !baseCurrency) {
      setExchangeRate(1);
      return;
    }

    if (selectedCurrency.code === baseCurrency.code) {
      setExchangeRate(1);
      return;
    }

    try {
      const res = await api.post<ExchangeRateResponse>('/currency/exchange-rates/convert', {
        amount: 1,
        fromCurrency: baseCurrency.code,
        toCurrency: selectedCurrency.code,
      });
      setExchangeRate(res.rate || 1);
    } catch (err) {
      console.error('Failed to get exchange rate:', err);
      setExchangeRate(1);
    }
  }, [selectedCurrency, baseCurrency]);

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    loadExchangeRate();
  }, [loadExchangeRate]);

  // Set selected currency by code
  const setSelectedCurrency = useCallback((code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency) {
      setSelectedCurrencyState(currency);
    }
  }, [currencies]);

  // Get currency symbol for a specific currency or selected/base
  const getCurrencySymbol = useCallback((currencyCode?: string): string => {
    if (currencyCode) {
      const currency = currencies.find(c => c.code === currencyCode);
      return currency?.symbol || currencyCode;
    }
    return selectedCurrency?.symbol || baseCurrency?.symbol || '$';
  }, [currencies, selectedCurrency, baseCurrency]);

  // Format amount with currency
  const formatAmount = useCallback((amount: number, currencyCode?: string): string => {
    const code = currencyCode || selectedCurrency?.code || baseCurrency?.code || 'USD';
    const symbol = getCurrencySymbol(code);
    
    // Apply exchange rate if viewing in different currency
    let displayAmount = amount;
    if (!currencyCode && selectedCurrency && baseCurrency && selectedCurrency.code !== baseCurrency.code) {
      displayAmount = amount * exchangeRate;
    }
    
    // Use Intl.NumberFormat for proper formatting
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }).format(displayAmount);
    } catch {
      // Fallback formatting
      return `${symbol}${displayAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
  }, [selectedCurrency, baseCurrency, exchangeRate, getCurrencySymbol]);

  // Format amount in compact form (e.g., $1.5M, ₹10L)
  const formatCompact = useCallback((amount: number, currencyCode?: string): string => {
    const code = currencyCode || selectedCurrency?.code || baseCurrency?.code || 'USD';
    const symbol = getCurrencySymbol(code);
    
    // Apply exchange rate if viewing in different currency
    let displayAmount = amount;
    if (!currencyCode && selectedCurrency && baseCurrency && selectedCurrency.code !== baseCurrency.code) {
      displayAmount = amount * exchangeRate;
    }
    
    // Indian numbering system for INR
    if (code === 'INR') {
      if (displayAmount >= 10000000) return `${symbol}${(displayAmount / 10000000).toFixed(1)}Cr`;
      if (displayAmount >= 100000) return `${symbol}${(displayAmount / 100000).toFixed(1)}L`;
      if (displayAmount >= 1000) return `${symbol}${(displayAmount / 1000).toFixed(1)}K`;
      return `${symbol}${displayAmount.toFixed(0)}`;
    }
    
    // Western numbering system for other currencies
    if (displayAmount >= 1000000000) return `${symbol}${(displayAmount / 1000000000).toFixed(1)}B`;
    if (displayAmount >= 1000000) return `${symbol}${(displayAmount / 1000000).toFixed(1)}M`;
    if (displayAmount >= 1000) return `${symbol}${(displayAmount / 1000).toFixed(1)}K`;
    return `${symbol}${displayAmount.toFixed(0)}`;
  }, [selectedCurrency, baseCurrency, exchangeRate, getCurrencySymbol]);

  const value: CurrencyContextValue = {
    baseCurrency,
    currencies,
    selectedCurrency,
    exchangeRate,
    isLoading,
    error,
    formatAmount,
    formatCompact,
    getCurrencySymbol,
    setSelectedCurrency,
    refreshCurrencies: loadCurrencies,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// ============================================================================
// Optional Hook (doesn't throw if outside provider)
// ============================================================================

export function useCurrencyOptional(): CurrencyContextValue | null {
  return useContext(CurrencyContext);
}

export default CurrencyContext;
