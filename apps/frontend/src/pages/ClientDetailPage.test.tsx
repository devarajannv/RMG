/**
 * @file ClientDetailPage.test.tsx
 * @description Functional tests for Client Detail page
 * Tests client information display and navigation
 */

import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Route, Routes } from 'react-router-dom';
import ClientDetailPage from './ClientDetailPage';

// Wrapper to provide route params
function renderClientDetail(clientId: string = 'client-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/clients/:id" element={<ClientDetailPage />} />
    </Routes>,
    { initialEntries: [`/clients/${clientId}`] }
  );
}

describe('ClientDetailPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('shows loading state initially', async () => {
      renderClientDetail();
      
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error State', () => {
    it('shows error message for invalid client', async () => {
      renderClientDetail('invalid-client-id');
      
      await waitFor(() => {
        // Should show error or back button
        const errorText = screen.queryByText(/failed|not found|error/i);
        const backButton = screen.queryByRole('button', { name: /back/i });
        expect(errorText || backButton).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
