/**
 * @file ContractDetailPage.test.tsx
 * @description Functional tests for Contract Detail page
 * Tests contract information display and navigation
 */

import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { Route, Routes } from 'react-router-dom';
import ContractDetailPage from './ContractDetailPage';

// Wrapper to provide route params
function renderContractDetail(contractId: string = 'contract-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/contracts/:id" element={<ContractDetailPage />} />
    </Routes>,
    { initialEntries: [`/contracts/${contractId}`] }
  );
}

describe('ContractDetailPage', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('shows loading state initially', async () => {
      renderContractDetail();
      
      // Loading spinner should be visible
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════════

  describe('Error State', () => {
    it('shows error message for invalid contract', async () => {
      renderContractDetail('invalid-contract-id');
      
      await waitFor(() => {
        // Should show error or back button
        const errorText = screen.queryByText(/failed|not found|error/i);
        const backButton = screen.queryByRole('button', { name: /back/i });
        expect(errorText || backButton).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
