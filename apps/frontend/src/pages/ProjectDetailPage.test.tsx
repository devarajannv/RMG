/**
 * @file ProjectDetailPage.test.tsx
 * @description Functional tests for Project Detail page
 * Tests project information display and navigation
 */

import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Route, Routes } from 'react-router-dom';
import ProjectDetailPage from './ProjectDetailPage';

// Wrapper to provide route params
function renderProjectDetail(projectId: string = 'proj-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
    </Routes>,
    { initialEntries: [`/projects/${projectId}`] }
  );
}

describe('ProjectDetailPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('shows loading state initially', async () => {
      renderProjectDetail();
      
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error State', () => {
    it('shows error message for invalid project', async () => {
      renderProjectDetail('invalid-project-id');
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load project/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows back to projects button on error', async () => {
      renderProjectDetail('invalid-project-id');
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to projects/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
