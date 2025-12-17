/**
 * @file ExportImportPage.test.tsx
 * @description Functional tests for Data Management (Export/Import) page
 * Tests export, import, AI migration, and webhooks functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import ExportImportPage from './ExportImportPage';

describe('ExportImportPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /data management/i })).toBeInTheDocument();
      });
    });

    it('displays page description', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/export, import data/i)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Navigation', () => {
    it('displays Export tab', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📤 export/i })).toBeInTheDocument();
      });
    });

    it('displays Import tab', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📥 import/i })).toBeInTheDocument();
      });
    });

    it('displays AI Migration tab', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🤖 ai migration/i })).toBeInTheDocument();
      });
    });

    it('displays Webhooks tab', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🔗 webhooks/i })).toBeInTheDocument();
      });
    });

    it('Export tab is active by default', async () => {
      renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        const exportTab = screen.getByRole('button', { name: /📤 export/i });
        expect(exportTab).toHaveClass('bg-primary');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Switching', () => {
    it('switches to Import tab when clicked', async () => {
      const { user } = renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📥 import/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /📥 import/i }));
      
      await waitFor(() => {
        const importTab = screen.getByRole('button', { name: /📥 import/i });
        expect(importTab).toHaveClass('bg-primary');
      });
    });

    it('switches to AI Migration tab when clicked', async () => {
      const { user } = renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🤖 ai migration/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /🤖 ai migration/i }));
      
      await waitFor(() => {
        const aiTab = screen.getByRole('button', { name: /🤖 ai migration/i });
        expect(aiTab).toHaveClass('bg-primary');
      });
    });

    it('switches to Webhooks tab when clicked', async () => {
      const { user } = renderWithProviders(<ExportImportPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🔗 webhooks/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /🔗 webhooks/i }));
      
      await waitFor(() => {
        const webhooksTab = screen.getByRole('button', { name: /🔗 webhooks/i });
        expect(webhooksTab).toHaveClass('bg-primary');
      });
    });

    it('returns to Export tab when clicked', async () => {
      const { user } = renderWithProviders(<ExportImportPage />);
      
      // Navigate to another tab first
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📥 import/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /📥 import/i }));
      
      // Return to export
      await user.click(screen.getByRole('button', { name: /📤 export/i }));
      
      await waitFor(() => {
        const exportTab = screen.getByRole('button', { name: /📤 export/i });
        expect(exportTab).toHaveClass('bg-primary');
      });
    });
  });
});
