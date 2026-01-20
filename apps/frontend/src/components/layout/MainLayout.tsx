import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  FileText,
  Clock,
  Settings,
  LogOut,
  Search,
  BarChart3,
  Building2,
  Armchair,
  ChevronRight,
  ChevronDown,
  Brain,
  PieChart,
  Database,
  X,
  ClipboardList,
  CheckSquare,
  GitBranch,
  Rocket,
  Briefcase,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { authApi, api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getEnvironmentBadge } from '@/config/env';
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions';
import { NotificationBell, NotificationPanel } from '@/components/notifications';

// Navigation structure - reorganized logically
// Group 1: Daily Activities (things users do every day)
// Group 2: Core Business (main business entities)
// Group 3: Intelligence (AI & analytics)
// Group 4: Administration (settings, data management)

interface NavSection {
  title?: string;
  items: NavItem[];
  /**
   * Required permission(s) to see this entire section.
   * If array, user needs ANY of the permissions.
   */
  permissions?: string | string[];
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: 'pending-approvals' | 'notifications';
  /**
   * Required permission(s) to see this nav item.
   * If array, user needs ANY of the permissions.
   * If undefined, always visible.
   */
  permissions?: string | string[];
  /**
   * Required role(s) to see this nav item.
   * If array, user needs ANY of the roles.
   */
  roles?: string | string[];
  /**
   * If true, only admins can see this item
   */
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    // No title for first section - primary navigation (always visible)
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    ],
  },
  {
    title: 'Daily Work',
    items: [
      { 
        icon: ClipboardList, 
        label: 'Requests', 
        href: '/requests', 
        badge: 'pending-approvals',
        permissions: [PERMISSIONS.REQUESTS_READ, PERMISSIONS.REQUESTS_CREATE],
      },
      { 
        icon: Clock, 
        label: 'Timesheets', 
        href: '/timesheets',
        permissions: [PERMISSIONS.TIMESHEETS_READ, PERMISSIONS.TIMESHEETS_CREATE],
      },
      { 
        icon: CheckSquare, 
        label: 'My Approvals', 
        href: '/requests?tab=pending-approvals', 
        badge: 'pending-approvals',
        permissions: [PERMISSIONS.REQUESTS_APPROVE, PERMISSIONS.TIMESHEETS_APPROVE, PERMISSIONS.ALLOCATIONS_APPROVE],
      },
      { 
        icon: Briefcase, 
        label: 'My Functions', 
        href: '/my-functions',
        // Available to all authenticated users who might have functions
      },
    ],
  },
  {
    title: 'Resource Management',
    permissions: [PERMISSIONS.RESOURCES_READ, PERMISSIONS.ALLOCATIONS_READ],
    items: [
      { 
        icon: Users, 
        label: 'Resources', 
        href: '/resources',
        permissions: PERMISSIONS.RESOURCES_READ,
      },
      { 
        icon: Armchair, 
        label: 'Bench', 
        href: '/bench',
        permissions: PERMISSIONS.RESOURCES_READ,
      },
      { 
        icon: Calendar, 
        label: 'Allocations', 
        href: '/allocations',
        permissions: PERMISSIONS.ALLOCATIONS_READ,
      },
    ],
  },
  {
    title: 'Business',
    permissions: [PERMISSIONS.CLIENTS_READ, PERMISSIONS.PROJECTS_READ, PERMISSIONS.CONTRACTS_READ],
    items: [
      { 
        icon: Building2, 
        label: 'Clients', 
        href: '/clients',
        permissions: PERMISSIONS.CLIENTS_READ,
      },
      { 
        icon: FolderKanban, 
        label: 'Projects', 
        href: '/projects',
        permissions: PERMISSIONS.PROJECTS_READ,
      },
      { 
        icon: FileText, 
        label: 'Contracts', 
        href: '/contracts',
        permissions: PERMISSIONS.CONTRACTS_READ,
      },
    ],
  },
  {
    title: 'Intelligence',
    permissions: [PERMISSIONS.ANALYTICS_READ, PERMISSIONS.REPORTS_READ],
    items: [
      { 
        icon: Brain, 
        label: 'Smart Search', 
        href: '/smart-search',
        // Smart search is available to all authenticated users
      },
      { 
        icon: PieChart, 
        label: 'Analytics', 
        href: '/analytics',
        permissions: PERMISSIONS.ANALYTICS_READ,
      },
      { 
        icon: BarChart3, 
        label: 'Reports', 
        href: '/reports',
        permissions: PERMISSIONS.REPORTS_READ,
      },
    ],
  },
  {
    title: 'Administration',
    permissions: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.ROLES_READ],
    items: [
      { 
        icon: Rocket, 
        label: 'Onboarding', 
        href: '/onboarding',
        permissions: PERMISSIONS.SETTINGS_UPDATE,
        adminOnly: true,
      },
      { 
        icon: Database, 
        label: 'Data Management', 
        href: '/data-management',
        permissions: PERMISSIONS.SETTINGS_UPDATE,
      },
      { 
        icon: GitBranch, 
        label: 'Workflows', 
        href: '/workflows',
        permissions: [PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.ROLES_READ],
      },
      { 
        icon: Settings, 
        label: 'Settings', 
        href: '/settings',
        permissions: PERMISSIONS.SETTINGS_READ,
      },
    ],
  },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const envBadge = getEnvironmentBadge();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Get user permissions
  const { 
    hasAnyPermission, 
    hasAnyRole,
    isAdmin,
  } = usePermissions();

  // Fetch pending approvals count for badge
  const { data: dashboardData } = useQuery({
    queryKey: ['requests-dashboard-badge'],
    queryFn: async () => {
      try {
        const response = await api.get<{ data: { pendingApprovals: number } }>('/requests/dashboard');
        return response.data;
      } catch {
        return { pendingApprovals: 0 };
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  const pendingApprovals = dashboardData?.pendingApprovals || 0;

  // Filter navigation based on permissions
  const filteredNavSections = useMemo(() => {
    // Helper to check if user can see an item
    const canSeeItem = (item: NavItem): boolean => {
      // Admin can see everything
      if (isAdmin) return true;
      
      // Check adminOnly flag
      if (item.adminOnly) return false;
      
      // Check role requirements
      if (item.roles) {
        const roles = Array.isArray(item.roles) ? item.roles : [item.roles];
        if (!hasAnyRole(roles)) return false;
      }
      
      // Check permission requirements
      if (item.permissions) {
        const perms = Array.isArray(item.permissions) ? item.permissions : [item.permissions];
        if (!hasAnyPermission(perms)) return false;
      }
      
      // No restrictions - show item
      return true;
    };
    
    // Helper to check if user can see a section
    const canSeeSection = (section: NavSection): boolean => {
      // Admin can see everything
      if (isAdmin) return true;
      
      // Check section-level permissions
      if (section.permissions) {
        const perms = Array.isArray(section.permissions) ? section.permissions : [section.permissions];
        if (!hasAnyPermission(perms)) return false;
      }
      
      return true;
    };
    
    return navSections
      .filter(section => canSeeSection(section))
      .map(section => ({
        ...section,
        items: section.items.filter(item => canSeeItem(item)),
      }))
      .filter(section => section.items.length > 0); // Remove empty sections
  }, [isAdmin, hasAnyPermission, hasAnyRole]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/smart-search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  }, [handleSearch]);

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Get user role from user object (roles is an array of role names)
  const userRole = user?.roles?.[0] || 'User';

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#1B3A5F] to-[#0F2744] shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-center border-b border-white/10 px-6 relative">
            <img src="/logo.png" alt="NewVision" className="h-12 object-contain" />
            {envBadge && (
              <span className={`absolute bottom-2 right-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${envBadge.color}`}>
                {envBadge.label}
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {filteredNavSections.map((section, sectionIndex) => {
              const isCollapsed = section.title ? collapsedSections[section.title] : false;
              
              return (
                <div key={sectionIndex} className={section.title ? 'mt-4' : ''}>
                  {section.title && (
                    <button
                      onClick={() => toggleSection(section.title!)}
                      className="flex items-center justify-between w-full px-3 py-2 mb-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/70 transition-colors"
                    >
                      {section.title}
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform",
                        isCollapsed && "-rotate-90"
                      )} />
                    </button>
                  )}
                  
                  {!isCollapsed && section.items.map((item) => {
                    const isActive = item.href === '/' 
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.href.split('?')[0]);
                    
                    // Get badge value
                    let badgeValue = 0;
                    if (item.badge === 'pending-approvals' && pendingApprovals > 0) {
                      badgeValue = pendingApprovals;
                    }
                    
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-[#F7941D]" : "text-white/60 group-hover:text-[#F7941D]"
                        )} />
                        <span className="flex-1">{item.label}</span>
                        {badgeValue > 0 && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-[#F7941D] text-white rounded-full">
                            {badgeValue > 99 ? '99+' : badgeValue}
                          </span>
                        )}
                        {isActive && !badgeValue && (
                          <ChevronRight className="h-4 w-4 text-[#F7941D]" />
                        )}
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#F7941D] to-[#FF6B00] text-white font-bold shadow-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-white/60">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-3 w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-64 flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-200/80 bg-white/80 backdrop-blur-md px-8 shadow-sm">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search resources, projects, clients... (Enter to search)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-11 h-10 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F7941D]/20 focus:border-[#F7941D] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          <div className="flex items-center gap-3">
            <div className="relative">
              <NotificationBell 
                onClick={() => setShowNotifications(!showNotifications)}
                isOpen={showNotifications}
              />
              <NotificationPanel 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8 min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}
