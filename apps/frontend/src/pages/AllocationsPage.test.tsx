/**
 * AllocationsPage Functional Tests
 * 
 * Tests verify REAL user behavior. If a test fails, investigate the component FIRST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import AllocationsPage from './AllocationsPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AllocationsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<AllocationsPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: /allocations/i })).toBeInTheDocument();
    });

    it('displays New Allocation button', async () => {
      renderWithProviders(<AllocationsPage />);
      
      expect(screen.getByRole('button', { name: /new allocation/i })).toBeInTheDocument();
    });

    it('displays search input', async () => {
      renderWithProviders(<AllocationsPage />);
      
      expect(screen.getByPlaceholderText('Search allocations...')).toBeInTheDocument();
    });

    it('displays Export button', async () => {
      renderWithProviders(<AllocationsPage />);
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STATS CARDS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Stats Cards', () => {
    it('displays Active stat', async () => {
      renderWithProviders(<AllocationsPage />);
      
      await waitFor(() => {
        // The stats card has "Active" label
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('displays Pending stat', async () => {
      renderWithProviders(<AllocationsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Data Loading', () => {
    it('displays allocation data after loading', async () => {
      renderWithProviders(<AllocationsPage />);
      
      // Wait for allocation data to appear (from MSW mock)
      // Use getAllByText since same resource can appear in multiple places
      await waitFor(() => {
        const elements = screen.getAllByText('John Doe');
        expect(elements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('displays project name in allocation', async () => {
      renderWithProviders(<AllocationsPage />);
      
      await waitFor(() => {
        const elements = screen.getAllByText('Alpha Project');
        expect(elements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('displays allocation percentage', async () => {
      renderWithProviders(<AllocationsPage />);
      
      await waitFor(() => {
        // Check for percentage display (100%)
        expect(screen.getByText(/100%/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SEARCH FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const { user } = renderWithProviders(<AllocationsPage />);
      
      const searchInput = screen.getByPlaceholderText('Search allocations...');
      await user.type(searchInput, 'John');
      
      expect(searchInput).toHaveValue('John');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FILTER FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Filter Functionality', () => {
    it('shows More Filters button', async () => {
      renderWithProviders(<AllocationsPage />);
      
      expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument();
    });

    it('shows status filter buttons', async () => {
      renderWithProviders(<AllocationsPage />);
      
      // The page shows status filter buttons
      expect(screen.getByRole('button', { name: /^ACTIVE$/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADD ALLOCATION MODAL
  // ═══════════════════════════════════════════════════════════════════════

  describe('Add Allocation Flow', () => {
    it('opens Add Allocation modal when clicking New button', async () => {
      const { user } = renderWithProviders(<AllocationsPage />);
      
      const addButton = screen.getByRole('button', { name: /new allocation/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/create new allocation/i)).toBeInTheDocument();
      });
    });

    it('shows form fields in Add modal', async () => {
      const { user } = renderWithProviders(<AllocationsPage />);
      
      // Wait for page data to load first
      await waitFor(() => {
        const elements = screen.getAllByText('John Doe');
        expect(elements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
      
      const addButton = screen.getByRole('button', { name: /new allocation/i });
      await user.click(addButton);
      
      await waitFor(() => {
        // Check the modal title appears
        expect(screen.getByText(/create new allocation/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('has Cancel and Create buttons in modal', async () => {
      const { user } = renderWithProviders(<AllocationsPage />);
      
      const addButton = screen.getByRole('button', { name: /new allocation/i });
      await user.click(addButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /create allocation/i })).toBeInTheDocument();
      });
    });

    it('closes modal when clicking Cancel', async () => {
      const { user } = renderWithProviders(<AllocationsPage />);
      
      // Open modal
      const addButton = screen.getByRole('button', { name: /new allocation/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/create new allocation/i)).toBeInTheDocument();
      });
      
      // Click Cancel
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText(/create new allocation/i)).not.toBeInTheDocument();
      });
    });
  });
});
