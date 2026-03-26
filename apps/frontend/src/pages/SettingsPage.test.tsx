/**
 * SettingsPage Functional Tests
 * 
 * Tests verify REAL user behavior. If a test fails, investigate the component FIRST.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import SettingsPage from './SettingsPage';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SettingsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE RENDERING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Page Rendering', () => {
    it('displays page title', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByRole('heading', { level: 1, name: /my settings/i })).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TABS NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Navigation', () => {
    it('displays Profile tab', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByRole('button', { name: /profile/i })).toBeTruthy();
    });

    it('displays Notifications tab', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByRole('button', { name: /notifications/i })).toBeTruthy();
    });

    it('displays Display tab', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByRole('button', { name: /display/i })).toBeTruthy();
    });

    it('displays Security tab', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByRole('button', { name: /security/i })).toBeTruthy();
    });

    it('does not display tenant admin tabs', async () => {
      renderWithProviders(<SettingsPage />);

      expect(screen.queryByRole('button', { name: /currency/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /roles/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /organization/i })).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PROFILE TAB (DEFAULT)
  // ═══════════════════════════════════════════════════════════════════════

  describe('Profile Tab', () => {
    it('shows Profile Information card by default', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByText(/profile information/i)).toBeTruthy();
    });

    it('shows First Name input', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByText(/first name/i)).toBeTruthy();
    });

    it('shows Last Name input', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByText(/last name/i)).toBeTruthy();
    });

    it('shows Save button', async () => {
      renderWithProviders(<SettingsPage />);
      
      expect(screen.getByRole('button', { name: /save/i })).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════════════

  describe('Tab Switching', () => {
    it('switches to Notifications tab when clicked', async () => {
      const { user } = renderWithProviders(<SettingsPage />);
      
      await user.click(screen.getByRole('button', { name: /notifications/i }));
      
      // Should show notification settings content
      await waitFor(() => {
        expect(screen.getByText(/email notifications/i)).toBeTruthy();
      });
    });

    it('switches to Display tab when clicked', async () => {
      const { user } = renderWithProviders(<SettingsPage />);
      
      await user.click(screen.getByRole('button', { name: /display/i }));
      
      // Should show display settings content
      await waitFor(() => {
        expect(screen.getByText(/theme/i)).toBeTruthy();
      });
    });

    it('switches to Security tab when clicked', async () => {
      const { user } = renderWithProviders(<SettingsPage />);
      
      await user.click(screen.getByRole('button', { name: /security/i }));
      
      // Should show security settings content
      await waitFor(() => {
        expect(screen.getByText(/change password/i)).toBeTruthy();
      });
    });
  });
});
