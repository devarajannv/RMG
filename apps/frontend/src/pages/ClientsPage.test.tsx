/**
 * ClientsPage Functional Tests
 * 
 * Tests verify REAL user behavior. If a test fails, investigate the component FIRST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import ClientsPage from './ClientsPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ClientsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<ClientsPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: /clients/i })).toBeInTheDocument();
    });

    it('displays Add Client button', async () => {
      renderWithProviders(<ClientsPage />);
      
      expect(screen.getByRole('button', { name: /add client/i })).toBeInTheDocument();
    });

    it('displays search input', async () => {
      renderWithProviders(<ClientsPage />);
      
      // Use specific placeholder to avoid matching global search
      expect(screen.getByPlaceholderText('Search clients...')).toBeInTheDocument();
    });

    it('displays Export button', async () => {
      renderWithProviders(<ClientsPage />);
      
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Data Loading', () => {
    it('displays client data after loading', async () => {
      renderWithProviders(<ClientsPage />);
      
      // Wait for client data to appear (from MSW mock)
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays client code', async () => {
      renderWithProviders(<ClientsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('ACME')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays multiple clients', async () => {
      renderWithProviders(<ClientsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('Globex Inc')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SEARCH FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Search Functionality', () => {
    it('allows typing in search field', async () => {
      const { user } = renderWithProviders(<ClientsPage />);
      
      const searchInput = screen.getByPlaceholderText('Search clients...');
      await user.type(searchInput, 'Acme');
      
      expect(searchInput).toHaveValue('Acme');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FILTER FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════════════════

  describe('Filter Functionality', () => {
    it('shows Filters button', async () => {
      renderWithProviders(<ClientsPage />);
      
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADD CLIENT MODAL
  // ═══════════════════════════════════════════════════════════════════════

  describe('Add Client Flow', () => {
    it('opens Add Client modal when clicking Add button', async () => {
      const { user } = renderWithProviders(<ClientsPage />);
      
      const addButton = screen.getByRole('button', { name: /add client/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/add new client/i)).toBeInTheDocument();
      });
    });

    it('shows form fields in Add modal', async () => {
      const { user } = renderWithProviders(<ClientsPage />);
      
      const addButton = screen.getByRole('button', { name: /add client/i });
      await user.click(addButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        // Check for client name field
        expect(within(dialog).getByText(/client name/i)).toBeInTheDocument();
      });
    });

    it('shows client code field in Add modal', async () => {
      const { user } = renderWithProviders(<ClientsPage />);
      
      const addButton = screen.getByRole('button', { name: /add client/i });
      await user.click(addButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/client code/i)).toBeInTheDocument();
      });
    });

    it('has Cancel and Create buttons in modal', async () => {
      const { user } = renderWithProviders(<ClientsPage />);
      
      const addButton = screen.getByRole('button', { name: /add client/i });
      await user.click(addButton);
      
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: /create client/i })).toBeInTheDocument();
      });
    });

    it('closes modal when clicking Cancel', async () => {
      const { user } = renderWithProviders(<ClientsPage />);
      
      // Open modal
      const addButton = screen.getByRole('button', { name: /add client/i });
      await user.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/add new client/i)).toBeInTheDocument();
      });
      
      // Click Cancel
      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText(/add new client/i)).not.toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STATS CARDS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Stats Cards', () => {
    it('displays Total Clients stat', async () => {
      renderWithProviders(<ClientsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/total clients/i)).toBeInTheDocument();
      });
    });

    it('displays Strategic stat', async () => {
      renderWithProviders(<ClientsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/strategic/i)).toBeInTheDocument();
      });
    });
  });
});
