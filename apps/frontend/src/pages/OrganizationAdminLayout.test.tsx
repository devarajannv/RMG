import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test/utils';
import OrganizationAdminLayout from './OrganizationAdminLayout';

vi.mock('./OnboardingPage', () => ({
  default: () => <div>Onboarding Page Mock</div>,
}));

vi.mock('./WorkflowBuilderPage', () => ({
  default: () => <div>Workflow Builder Page Mock</div>,
}));

vi.mock('./ExportImportPage', () => ({
  default: () => <div>Data Management Page Mock</div>,
}));

vi.mock('@/components/settings/FunctionsTab', () => ({
  default: () => <div>Functions Tab Mock</div>,
}));

vi.mock('@/components/settings/RequestTypesTab', () => ({
  default: () => <div>Request Types Tab Mock</div>,
}));

function renderAdminRoute(initialEntry: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin" element={<OrganizationAdminLayout />}>
        <Route index element={<div>Index Mock</div>} />
        <Route path="onboarding" element={<div>Onboarding Page Mock</div>} />
        <Route path="users" element={<div>Users Page Mock</div>} />
        <Route path="workflows" element={<div>Workflow Builder Page Mock</div>} />
        <Route path="data-management" element={<div>Data Management Page Mock</div>} />
      </Route>
    </Routes>,
    { initialEntries: [initialEntry] }
  );
}

describe('OrganizationAdminLayout', () => {
  it('renders dedicated admin navigation', () => {
    renderAdminRoute('/admin/onboarding');

    expect(screen.getByRole('heading', { level: 1, name: /organization admin/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /onboarding/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /users/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /workflows/i })).toBeTruthy();
  });

  it('renders onboarding content on onboarding route', () => {
    renderAdminRoute('/admin/onboarding');

    expect(screen.getByText(/onboarding page mock/i)).toBeTruthy();
  });

  it('renders workflow destination on workflows route', () => {
    renderAdminRoute('/admin/workflows');

    expect(screen.getByText(/workflow builder page mock/i)).toBeTruthy();
  });

  it('renders data management destination on data management route', () => {
    renderAdminRoute('/admin/data-management');

    expect(screen.getByText(/data management page mock/i)).toBeTruthy();
  });
});