import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Toaster } from '@/components/ui/toaster';
import { AgentWidget, CommandPalette } from '@/components/agent';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import MainLayout from '@/components/layout/MainLayout';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

// Lazy loaded pages - code splitting for optimal bundle size
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ResourcesPage = lazy(() => import('@/pages/ResourcesPage'));
const ResourceDetailPage = lazy(() => import('@/pages/ResourceDetailPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const AllocationsPage = lazy(() => import('@/pages/AllocationsPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'));
const BenchAnalysisPage = lazy(() => import('@/pages/BenchAnalysisPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const ContractsPage = lazy(() => import('@/pages/ContractsPage'));
const ContractDetailPage = lazy(() => import('@/pages/ContractDetailPage'));
const TimesheetsPage = lazy(() => import('@/pages/TimesheetsPage'));
const SmartSearchPage = lazy(() => import('@/pages/SmartSearchPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const ExportImportPage = lazy(() => import('@/pages/ExportImportPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const RequestsPage = lazy(() => import('@/pages/RequestsPage'));
const RequestDetailPage = lazy(() => import('@/pages/RequestDetailPage'));
const WorkflowBuilderPage = lazy(() => import('@/pages/WorkflowBuilderPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const MyFunctionsPage = lazy(() => import('@/pages/MyFunctionsPage'));
const OrganizationAdminLayout = lazy(() => import('@/pages/OrganizationAdminLayout'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRolesPage = lazy(() => import('@/pages/admin/AdminRolesPage'));
const AdminFunctionsPage = lazy(() => import('@/pages/admin/AdminFunctionsPage'));
const AdminRequestTypesPage = lazy(() => import('@/pages/admin/AdminRequestTypesPage'));
const AdminCurrencyPage = lazy(() => import('@/pages/admin/AdminCurrencyPage'));
const AdminIntegrationsPage = lazy(() => import('@/pages/admin/AdminIntegrationsPage'));
const AdminOrganizationPage = lazy(() => import('@/pages/admin/AdminOrganizationPage'));
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'));

// Auth guard component with optional role-based access control
function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) {
  const { isAuthenticated, hasHydrated, user } = useAuthStore();

  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // M-09: Role-based route protection
  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = user?.roles ?? [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <CurrencyProvider>
      {children}
    </CurrencyProvider>
  );
}

// Public route - redirect if already authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

function App() {
  // M-14: Auto-logout on idle
  useIdleTimeout();

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes - shared MainLayout */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/resources/:id" element={<ResourceDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/allocations" element={<AllocationsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/bench" element={<BenchAnalysisPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/timesheets" element={<TimesheetsPage />} />
          <Route path="/smart-search" element={<SmartSearchPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/data-management" element={<Navigate to="/admin/data-management" replace />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/workflows" element={<Navigate to="/admin/workflows" replace />} />
          <Route path="/onboarding" element={<Navigate to="/admin/onboarding" replace />} />
          <Route path="/admin" element={<OrganizationAdminLayout />}>
            <Route index element={<Navigate to="/admin/onboarding" replace />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="roles" element={<AdminRolesPage />} />
            <Route path="functions" element={<AdminFunctionsPage />} />
            <Route path="request-types" element={<AdminRequestTypesPage />} />
            <Route path="workflows" element={<WorkflowBuilderPage />} />
            <Route path="currency" element={<AdminCurrencyPage />} />
            <Route path="integrations" element={<AdminIntegrationsPage />} />
            <Route path="organization" element={<AdminOrganizationPage />} />
            <Route path="audit" element={<AdminAuditLogsPage />} />
            <Route path="data-management" element={<ExportImportPage />} />
          </Route>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/my-functions" element={<MyFunctionsPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      {/* AI Agent components - rendered conditionally inside */}
      <AuthenticatedAgentWidgets />
    </>
  );
}

// Only render AI widgets when authenticated
function AuthenticatedAgentWidgets() {
  const { isAuthenticated, hasHydrated } = useAuthStore();
  
  if (!hasHydrated || !isAuthenticated) {
    return null;
  }
  
  return (
    <>
      <AgentWidget />
      <CommandPalette />
    </>
  );
}


export default App;
