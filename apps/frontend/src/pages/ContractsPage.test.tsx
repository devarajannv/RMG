/**
 * ContractsPage Functional Tests
 * 
 * Tests verify REAL user behavior. If a test fails, investigate the component FIRST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import ContractsPage from './ContractsPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ContractsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<ContractsPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: /contracts/i })).toBeInTheDocument();
    });

    it('displays New Contract button', async () => {
      renderWithProviders(<ContractsPage />);
      
      expect(screen.getByRole('button', { name: /new contract/i })).toBeInTheDocument();
    });

    it('displays search input', async () => {
      renderWithProviders(<ContractsPage />);
      
      expect(screen.getByPlaceholderText(/search by name, number, or client/i)).toBeInTheDocument();
    });

    it('displays Export button', async () => {
      renderWithProviders(<ContractsPage />);
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Data Loading', () => {
    it('displays contract data after loading', async () => {
      renderWithProviders(<ContractsPage />);
      
      // Wait for contract data to appear (from MSW mock)
      await waitFor(() => {
        expect(screen.getByText('Annual Service Agreement')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays contract number', async () => {
      renderWithProviders(<ContractsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('CNT-001')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays client name', async () => {
      renderWithProviders(<ContractsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SEARCH FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const { user } = renderWithProviders(<ContractsPage />);
      
      const searchInput = screen.getByPlaceholderText(/search by name, number, or client/i);
      await user.type(searchInput, 'Annual');
      
      expect(searchInput).toHaveValue('Annual');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FILTER FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Filter Functionality', () => {
    it('shows Filters button', async () => {
      renderWithProviders(<ContractsPage />);
      
      // The page has a "Filters" button (not "More Filters")
      expect(screen.getByRole('button', { name: /^filters$/i })).toBeInTheDocument();
    });

    it('shows Search button', async () => {
      renderWithProviders(<ContractsPage />);
      
      expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADD CONTRACT MODAL
  // ═══════════════════════════════════════════════════════════════════════

  describe('Add Contract Flow', () => {
    it('opens Add Contract modal when clicking New button', async () => {
      const { user } = renderWithProviders(<ContractsPage />);
      
      const addButton = screen.getByRole('button', { name: /new contract/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/create new contract/i)).toBeInTheDocument();
      });
    });

    it('shows contract number field in Add modal', async () => {
      const { user } = renderWithProviders(<ContractsPage />);
      
      const addButton = screen.getByRole('button', { name: /new contract/i });
      await user.click(addButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/contract number/i)).toBeInTheDocument();
      });
    });

    it('has Cancel and Create buttons in modal', async () => {
      const { user } = renderWithProviders(<ContractsPage />);
      
      const addButton = screen.getByRole('button', { name: /new contract/i });
      await user.click(addButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /create contract/i })).toBeInTheDocument();
      });
    });

    it('closes modal when clicking Cancel', async () => {
      const { user } = renderWithProviders(<ContractsPage />);
      
      // Open modal
      const addButton = screen.getByRole('button', { name: /new contract/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/create new contract/i)).toBeInTheDocument();
      });
      
      // Click Cancel
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText(/create new contract/i)).not.toBeInTheDocument();
      });
    });
  });
});
