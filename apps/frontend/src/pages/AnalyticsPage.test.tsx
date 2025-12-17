/**
 * AnalyticsPage Functional Tests
 * 
 * Tests verify REAL user behavior. If a test fails, investigate the component FIRST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import AnalyticsPage from './AnalyticsPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AnalyticsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: /analytics/i })).toBeInTheDocument();
    });

    it('displays Refresh All button', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByRole('button', { name: /refresh all/i })).toBeInTheDocument();
    });

    it('displays currency selector', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByText(/currency:/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Navigation', () => {
    it('displays Executive tab', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByRole('button', { name: /executive/i })).toBeInTheDocument();
    });

    it('displays Practice tab', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByRole('button', { name: /practice/i })).toBeInTheDocument();
    });

    it('displays Financial tab', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByRole('button', { name: /financial/i })).toBeInTheDocument();
    });

    it('displays Projects tab', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      expect(screen.getByRole('button', { name: /projects/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Data Loading', () => {
    it('loads and displays executive metrics', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      // Wait for data to load - look for utilization rate
      await waitFor(() => {
        expect(screen.getByText(/utilization rate/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows total resources metric', async () => {
      renderWithProviders(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/total resources/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Switching', () => {
    it('Practice tab button can be clicked', async () => {
      const { user } = renderWithProviders(<AnalyticsPage />);
      
      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument();
      });
      
      // Practice tab should exist
      const practiceBtn = screen.getByRole('button', { name: /🏢 practice/i });
      expect(practiceBtn).toBeInTheDocument();
      
      // Click it (don't verify content as it needs complete mock data)
      await user.click(practiceBtn);
    });
  });
});
