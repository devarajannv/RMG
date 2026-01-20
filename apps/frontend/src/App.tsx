import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Toaster } from '@/components/ui/toaster';
import { AgentWidget, CommandPalette } from '@/components/agent';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

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

// Auth guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <CurrencyProvider>
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
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

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Placeholder routes - to be implemented */}
        <Route
          path="/resources"
          element={
            <ProtectedRoute>
              <ResourcesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources/:id"
          element={
            <ProtectedRoute>
              <ResourceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/allocations"
          element={
            <ProtectedRoute>
              <AllocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bench"
          element={
            <ProtectedRoute>
              <BenchAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute>
              <ContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts/:id"
          element={
            <ProtectedRoute>
              <ContractDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timesheets"
          element={
            <ProtectedRoute>
              <TimesheetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-search"
          element={
            <ProtectedRoute>
              <SmartSearchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-management"
          element={
            <ProtectedRoute>
              <ExportImportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <ProtectedRoute>
              <RequestDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workflows"
          element={
            <ProtectedRoute>
              <WorkflowBuilderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-functions"
          element={
            <ProtectedRoute>
              <MyFunctionsPage />
            </ProtectedRoute>
          }
        />

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
