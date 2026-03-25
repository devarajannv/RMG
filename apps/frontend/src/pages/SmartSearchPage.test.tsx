/**
 * @file SmartSearchPage.test.tsx
 * @description Functional tests for Smart/AI Search page
 * Tests skill-based resource matching and intelligence features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import SmartSearchPage from './SmartSearchPage';

describe('SmartSearchPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /smart search/i })).toBeInTheDocument();
      });
    });

    it('displays page description', async () => {
      renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/resource matching and utilization insights/i)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Navigation', () => {
    it('displays Smart Search tab', async () => {
      renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🔍 smart search/i })).toBeInTheDocument();
      });
    });

    it('displays Utilization Insights tab', async () => {
      renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📊 utilization insights/i })).toBeInTheDocument();
      });
    });

    it('displays Skill Inventory tab', async () => {
      renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🎯 skill inventory/i })).toBeInTheDocument();
      });
    });

    it('Smart Search tab is active by default', async () => {
      renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        const searchTab = screen.getByRole('button', { name: /🔍 smart search/i });
        expect(searchTab).toHaveClass('bg-primary');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Switching', () => {
    it('switches to Utilization Insights tab when clicked', async () => {
      const { user } = renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📊 utilization insights/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /📊 utilization insights/i }));
      
      await waitFor(() => {
        const insightsTab = screen.getByRole('button', { name: /📊 utilization insights/i });
        expect(insightsTab).toHaveClass('bg-primary');
      });
    });

    it('switches to Skill Inventory tab when clicked', async () => {
      const { user } = renderWithProviders(<SmartSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🎯 skill inventory/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /🎯 skill inventory/i }));
      
      await waitFor(() => {
        const skillsTab = screen.getByRole('button', { name: /🎯 skill inventory/i });
        expect(skillsTab).toHaveClass('bg-primary');
      });
    });

    it('returns to Smart Search tab when clicked', async () => {
      const { user } = renderWithProviders(<SmartSearchPage />);
      
      // Navigate to another tab first
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📊 utilization insights/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /📊 utilization insights/i }));
      
      // Return to search
      await user.click(screen.getByRole('button', { name: /🔍 smart search/i }));
      
      await waitFor(() => {
        const searchTab = screen.getByRole('button', { name: /🔍 smart search/i });
        expect(searchTab).toHaveClass('bg-primary');
      });
    });
  });
});
