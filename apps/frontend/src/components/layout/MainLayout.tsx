import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  FileText,
  Clock,
  Settings,
  LogOut,
  Bell,
  Search,
  BarChart3,
  Building2,
  Armchair,
  ChevronRight,
  Brain,
  PieChart,
  Database,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getEnvironmentBadge } from '@/config/env';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Resources', href: '/resources' },
  { icon: FolderKanban, label: 'Projects', href: '/projects' },
  { icon: Calendar, label: 'Allocations', href: '/allocations' },
  { icon: Building2, label: 'Clients', href: '/clients' },
  { icon: FileText, label: 'Contracts', href: '/contracts' },
  { icon: Armchair, label: 'Bench Analysis', href: '/bench' },
  { icon: Brain, label: 'Smart Search', href: '/smart-search' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: Clock, label: 'Timesheets', href: '/timesheets' },
  { icon: PieChart, label: 'Analytics', href: '/analytics' },
  { icon: Database, label: 'Data Management', href: '/export-import' },
  { icon: Settings, label: 'Settings', href: '/settings' },
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
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/15 text-white shadow-lg backdrop-blur-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-[#F7941D]" : "text-white/60 group-hover:text-[#F7941D]"
                  )} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-[#F7941D]" />
                  )}
                </a>
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative rounded-xl hover:bg-gray-100"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F7941D] ring-2 ring-white" />
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                    <div className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 mt-2 rounded-full bg-[#F7941D]" />
                      <div>
                        <p className="text-sm font-medium">New rolloff alert</p>
                        <p className="text-xs text-gray-500">3 resources rolling off next week</p>
                        <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium">Utilization target met</p>
                        <p className="text-xs text-gray-500">Engineering practice achieved 85%</p>
                        <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg opacity-60">
                      <div className="w-2 h-2 mt-2 rounded-full bg-gray-300" />
                      <div>
                        <p className="text-sm">Timesheet reminder</p>
                        <p className="text-xs text-gray-500">Week ending Dec 15 due</p>
                        <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="w-full text-primary">
                      View all notifications
                    </Button>
                  </div>
                </div>
              )}
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
