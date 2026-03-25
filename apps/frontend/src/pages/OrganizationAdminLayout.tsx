import { NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  Database,
  FileText,
  GitBranch,
  Rocket,
  Settings2,
  Shield,
  Users,
  Workflow,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const adminLinks = [
  { label: 'Onboarding', to: '/admin/onboarding', icon: Rocket },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Roles', to: '/admin/roles', icon: Shield },
  { label: 'Functions', to: '/admin/functions', icon: Settings2 },
  { label: 'Request Types', to: '/admin/request-types', icon: FileText },
  { label: 'Workflows', to: '/admin/workflows', icon: Workflow },
  { label: 'Currency', to: '/admin/currency', icon: Building2 },
  { label: 'Integrations', to: '/admin/integrations', icon: GitBranch },
  { label: 'Organization', to: '/admin/organization', icon: Building2 },
  { label: 'Audit Logs', to: '/admin/audit', icon: FileText },
  { label: 'Data Management', to: '/admin/data-management', icon: Database },
] as const;

export default function OrganizationAdminLayout() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Admin</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage tenant-wide configuration, governance, workflow controls, and organizational setup.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admin Areas</CardTitle>
            <CardDescription>Each area now has a dedicated route.</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="space-y-1">
              {adminLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <link.icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-gray-500')} />
                      <span>{link.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}