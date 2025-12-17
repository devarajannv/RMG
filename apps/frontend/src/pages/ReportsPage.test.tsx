/**
 * @file ReportsPage.test.tsx
 * @description Functional tests for Reports page
 * Tests report categories, report generation buttons, and recent reports
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import ReportsPage from './ReportsPage';

describe('ReportsPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', () => {
      renderWithProviders(<ReportsPage />);
      
      // Use more specific selector - h1 heading
      const headings = screen.getAllByRole('heading', { name: /reports/i });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('displays page description', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByText(/generate and download reports/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY FILTERS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Category Filters', () => {
    it('displays All Reports filter', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByRole('button', { name: /📁 all reports/i })).toBeInTheDocument();
    });

    it('displays Utilization category filter', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByRole('button', { name: /📊 utilization/i })).toBeInTheDocument();
    });

    it('displays Resource category filter', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByRole('button', { name: /👥 resource/i })).toBeInTheDocument();
    });

    it('displays Financial category filter', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByRole('button', { name: /💰 financial/i })).toBeInTheDocument();
    });

    it('displays Project category filter', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByRole('button', { name: /📋 project/i })).toBeInTheDocument();
    });

    it('All Reports is selected by default', () => {
      renderWithProviders(<ReportsPage />);
      
      const allReportsBtn = screen.getByRole('button', { name: /📁 all reports/i });
      // Active category has different styling
      expect(allReportsBtn).toHaveClass('bg-primary');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REPORT LIST
  // ═══════════════════════════════════════════════════════════════════════

  describe('Report List', () => {
    it('displays Utilization Summary report', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByText('Utilization Summary')).toBeInTheDocument();
    });

    it('displays Bench Report', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByText('Bench Report')).toBeInTheDocument();
    });

    it('displays Skill Matrix report', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByText('Skill Matrix')).toBeInTheDocument();
    });

    it('displays Project Health report', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByText('Project Health')).toBeInTheDocument();
    });

    it('displays report descriptions', () => {
      renderWithProviders(<ReportsPage />);
      
      expect(screen.getByText(/overall utilization metrics with trend analysis/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY FILTERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Category Filtering', () => {
    it('filters to show only Utilization reports when clicked', async () => {
      const { user } = renderWithProviders(<ReportsPage />);
      
      await user.click(screen.getByRole('button', { name: /📊 utilization/i }));
      
      // Utilization reports should be visible
      expect(screen.getByText('Utilization Summary')).toBeInTheDocument();
      expect(screen.getByText('Practice Utilization')).toBeInTheDocument();
      expect(screen.getByText('Billable vs Non-Billable')).toBeInTheDocument();
    });

    it('filters to show only Resource reports when clicked', async () => {
      const { user } = renderWithProviders(<ReportsPage />);
      
      await user.click(screen.getByRole('button', { name: /👥 resource/i }));
      
      // Resource reports should be visible
      expect(screen.getByText('Bench Report')).toBeInTheDocument();
      expect(screen.getByText('Skill Matrix')).toBeInTheDocument();
    });

    it('filters to show only Financial reports when clicked', async () => {
      const { user } = renderWithProviders(<ReportsPage />);
      
      await user.click(screen.getByRole('button', { name: /💰 financial/i }));
      
      // Financial reports should be visible
      expect(screen.getByText('Bench Cost Analysis')).toBeInTheDocument();
      expect(screen.getByText('Revenue Potential')).toBeInTheDocument();
    });

    it('returns to All Reports when clicked again', async () => {
      const { user } = renderWithProviders(<ReportsPage />);
      
      // First filter
      await user.click(screen.getByRole('button', { name: /📊 utilization/i }));
      
      // Then back to all
      await user.click(screen.getByRole('button', { name: /📁 all reports/i }));
      
      // All reports should be visible
      expect(screen.getByText('Utilization Summary')).toBeInTheDocument();
      expect(screen.getByText('Bench Report')).toBeInTheDocument();
      expect(screen.getByText('Project Health')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EXPORT BUTTONS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Export Buttons', () => {
    it('displays JSON export button for reports', () => {
      renderWithProviders(<ReportsPage />);
      
      // At least one JSON button should exist
      const jsonButtons = screen.getAllByRole('button', { name: /📄 json/i });
      expect(jsonButtons.length).toBeGreaterThan(0);
    });

    it('displays CSV export button for reports', () => {
      renderWithProviders(<ReportsPage />);
      
      // At least one CSV button should exist
      const csvButtons = screen.getAllByRole('button', { name: /📊 csv/i });
      expect(csvButtons.length).toBeGreaterThan(0);
    });
  });
});
