import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RoleFormModal, type RoleCatalog } from './shared';

const catalog: RoleCatalog = {
  permissions: [
    {
      key: 'client:write',
      label: 'Manage clients',
      description: 'Create, update, and delete client records.',
      category: 'OPERATIONAL',
      riskLevel: 'HIGH',
    },
    {
      key: 'project:write',
      label: 'Manage projects',
      description: 'Create, update, and delete projects.',
      category: 'OPERATIONAL',
      riskLevel: 'HIGH',
    },
  ],
  sections: [
    {
      key: 'operational',
      label: 'Operational Work',
      description: 'Direct day-to-day access.',
      groups: [
        {
          key: 'clients',
          label: 'Clients',
          permissions: [
            {
              key: 'client:write',
              label: 'Manage clients',
              description: 'Create, update, and delete client records.',
              category: 'OPERATIONAL',
              riskLevel: 'HIGH',
            },
          ],
        },
        {
          key: 'projects',
          label: 'Projects',
          permissions: [
            {
              key: 'project:write',
              label: 'Manage projects',
              description: 'Create, update, and delete projects.',
              category: 'OPERATIONAL',
              riskLevel: 'HIGH',
            },
          ],
        },
      ],
    },
  ],
  presets: [
    {
      code: 'PMO',
      name: 'PMO',
      description: 'PMO blueprint',
      permissionKeys: ['client:write', 'project:write'],
    },
  ],
};

describe('RoleFormModal', () => {
  it('hides the legacy level input and applies the PMO preset', () => {
    const onSave = vi.fn();

    render(
      <RoleFormModal
        isOpen
        onClose={() => {}}
        catalog={catalog}
        onSave={onSave}
        isSaving={false}
      />
    );

    expect(screen.queryByText(/Level \(1-1000\)/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /PMO/i }));

    expect(screen.getByLabelText(/Manage clients/i)).toHaveProperty('checked', true);
    expect(screen.getByLabelText(/Manage projects/i)).toHaveProperty('checked', true);
  });
});
