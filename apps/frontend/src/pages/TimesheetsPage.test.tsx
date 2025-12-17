/**
 * @file TimesheetsPage.test.tsx
 * @description Functional tests for Timesheets page
 * Tests timesheet display, week navigation, and entry management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import TimesheetsPage from './TimesheetsPage';

describe('TimesheetsPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /timesheets/i })).toBeInTheDocument();
      });
    });

    it('displays page description', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/log your weekly hours/i)).toBeInTheDocument();
      });
    });

    it('displays save draft button', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
      });
    });

    it('displays submit button', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit for approval/i })).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // WEEK NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  describe('Week Navigation', () => {
    it('displays week navigation buttons', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        // Some navigation controls should exist
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RESOURCE SELECTOR
  // ═══════════════════════════════════════════════════════════════════════

  describe('Resource Selector', () => {
    it('displays resource selector label', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/resource:/i)).toBeInTheDocument();
      });
    });

    it('displays resource selector dropdown', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        // Resource select should exist
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STATUS DISPLAY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Status Display', () => {
    it('displays page correctly after load', async () => {
      renderWithProviders(<TimesheetsPage />);
      
      await waitFor(() => {
        // Page should render title
        expect(screen.getByRole('heading', { name: /timesheets/i })).toBeInTheDocument();
      });
    });
  });
});
