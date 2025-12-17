/**
 * @file ResourceDetailPage.test.tsx
 * @description Functional tests for Resource Detail page
 * Tests resource information display, skills, allocations, etc.
 */

import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Route, Routes } from 'react-router-dom';
import ResourceDetailPage from './ResourceDetailPage';

// Wrapper to provide route params
function renderResourceDetail(resourceId: string = 'res-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/resources/:id" element={<ResourceDetailPage />} />
    </Routes>,
    { initialEntries: [`/resources/${resourceId}`] }
  );
}

describe('ResourceDetailPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('shows loading state initially', async () => {
      renderResourceDetail();
      
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error State', () => {
    it('shows not found message for invalid resource', async () => {
      renderResourceDetail('invalid-id-that-does-not-exist');
      
      await waitFor(() => {
        expect(screen.getByText(/resource not found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows back to resources link on error', async () => {
      renderResourceDetail('invalid-id-that-does-not-exist');
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to resources/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
