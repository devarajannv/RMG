import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency in compact form (e.g., $1.5M, ₹10L)
 */
export function formatCurrencyCompact(amount: number, currency = 'USD', symbol = '$'): string {
  // Indian numbering system for INR
  if (currency === 'INR') {
    if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
    return `${symbol}${amount.toFixed(0)}`;
  }
  
  // Western numbering system for other currencies
  if (amount >= 1000000000) return `${symbol}${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

/**
 * Format rate per hour with currency symbol
 */
export function formatRate(amount: number, symbol = '$'): string {
  return `${symbol}${amount.toFixed(0)}/hr`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

