/**
 * @file BenchAnalysisPage.test.tsx
 * @description Functional tests for Bench Management / Analysis page
 * Tests tabs: Overview, Bench Resources, Rolloffs, Alerts, Forecast
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import BenchAnalysisPage from './BenchAnalysisPage';

describe('BenchAnalysisPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /bench management/i })).toBeInTheDocument();
      });
    });

    it('displays page description', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/comprehensive view of bench resources/i)).toBeInTheDocument();
      });
    });

    it('displays refresh button', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('shows loading spinner initially', () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Navigation', () => {
    it('displays Overview tab', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📊 overview/i })).toBeInTheDocument();
      });
    });

    it('displays Bench tab with count', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /👥 bench/i })).toBeInTheDocument();
      });
    });

    it('displays Rolloffs tab', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📅 rolloffs/i })).toBeInTheDocument();
      });
    });

    it('displays Alerts tab', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /⚠️ alerts/i })).toBeInTheDocument();
      });
    });

    it('displays Forecast tab', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📈 forecast/i })).toBeInTheDocument();
      });
    });

    it('Overview tab is active by default', async () => {
      renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        const overviewTab = screen.getByRole('button', { name: /📊 overview/i });
        expect(overviewTab).toHaveClass('bg-primary');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Switching', () => {
    it('switches to Bench resources tab when clicked', async () => {
      const { user } = renderWithProviders(<BenchAnalysisPage />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /👥 bench/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /👥 bench/i }));
      
      // Bench tab should be active
      await waitFor(() => {
        const benchTab = screen.getByRole('button', { name: /👥 bench/i });
        expect(benchTab).toHaveClass('bg-primary');
      });
    });

    it('switches to Alerts tab when clicked', async () => {
      const { user } = renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /⚠️ alerts/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /⚠️ alerts/i }));
      
      await waitFor(() => {
        const alertsTab = screen.getByRole('button', { name: /⚠️ alerts/i });
        expect(alertsTab).toHaveClass('bg-primary');
      });
    });

    it('switches to Forecast tab when clicked', async () => {
      const { user } = renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📈 forecast/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /📈 forecast/i }));
      
      await waitFor(() => {
        const forecastTab = screen.getByRole('button', { name: /📈 forecast/i });
        expect(forecastTab).toHaveClass('bg-primary');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // USER INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  describe('User Interactions', () => {
    it('refresh button can be clicked', async () => {
      const { user } = renderWithProviders(<BenchAnalysisPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
      
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshBtn);
      
      // Page should still work after refresh
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /bench management/i })).toBeInTheDocument();
      });
    });
  });
});
