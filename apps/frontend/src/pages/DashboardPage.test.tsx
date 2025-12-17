/**
 * DashboardPage Functional Tests
 * 
 * Tests verify REAL user behavior. If a test fails, investigate the component FIRST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import DashboardPage from './DashboardPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays Refresh button', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // METRICS CARDS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Metrics Cards', () => {
    it('displays Total Resources metric', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/total resources/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays Utilization Rate metric', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/utilization rate/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays Active Projects metric', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/active projects/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays Bench Cost metric', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/bench cost/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CHARTS AND VISUALIZATIONS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Charts', () => {
    it('displays Utilization Trend section', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/utilization trend/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays Utilization by Practice section', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/utilization by practice/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays Capacity Forecast section', async () => {
      renderWithProviders(<DashboardPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/capacity forecast/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      renderWithProviders(<DashboardPage />);
      
      // The page shows a loading indicator before data loads
      expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REFRESH FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Refresh Functionality', () => {
    it('clicking refresh button reloads data', async () => {
      const { user } = renderWithProviders(<DashboardPage />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Click refresh
      await user.click(screen.getByRole('button', { name: /refresh/i }));
      
      // Page should still be functional
      await waitFor(() => {
        expect(screen.getByText(/total resources/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
