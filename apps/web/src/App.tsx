import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppShell } from './layouts/AppShell';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFound } from './pages/NotFound';
import { Unauthorized } from './pages/Unauthorized';
import { UiLab } from './pages/UiLab';
import { Dashboard } from './features/dashboard/Dashboard';
import { EquipmentList } from './features/equipment/EquipmentList';
import { MaterialList } from './features/inventory/MaterialList';
import { TransactionLedger } from './features/inventory/TransactionLedger';
import { DeliveryForm } from './features/inventory/DeliveryForm';
import { TaskConsumption } from './features/tasks/TaskConsumption';
import { TaskBoard } from './features/tasks/TaskBoard';
import { TaskDetail } from './features/tasks/TaskDetail';
import { AiAssistant } from './features/ai/AiAssistant';
import { ProjectsList } from './features/projects/ProjectsList';
import { Reports } from './features/reports/Reports';
import { Documents } from './features/documents/Documents';
import { AuditLog } from './features/audit/AuditLog';
import { SettingsPage } from './features/settings/Settings';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { useAuthStore } from './stores/auth-store';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function TokenAware({ children }: { children: (token: string) => React.ReactNode }) {
  const { token } = useAuthStore();
  return <>{children(token)}</>;
}

function ProjectsPageWrapper() {
  return <ProjectsList />;
}

function ProjectDetailPageWrapper() {
  return <ProjectDetail />;
}

function ReportsPage() {
  return <Reports />;
}

function AuditPage() {
  return <AuditLog />;
}

function SettingsPageWrapper() {
  return <SettingsPage />;
}

function ProfileSettingsPage() {
  return <SettingsPage />;
}

function FetchUserOnMount() {
  const { isAuthenticated, fetchUser, user } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);
  return null;
}

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <FetchUserOnMount />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/ui-lab" element={<UiLab />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<TokenAware>{(t) => <Dashboard token={t} />}</TokenAware>} />
              <Route path="projects" element={<ProjectsPageWrapper />} />
              <Route path="projects/:id" element={<ProjectDetailPageWrapper />} />
              <Route path="tasks" element={<TaskBoard />} />
              <Route path="tasks/:taskId" element={<TaskDetail />} />
              <Route path="tasks/consumption" element={<TokenAware>{(t) => <TaskConsumption token={t} />}</TokenAware>} />
              <Route path="equipment" element={<TokenAware>{(t) => <EquipmentList token={t} />}</TokenAware>} />
              <Route path="inventory" element={<MaterialList />} />
              <Route path="inventory/transactions" element={<TransactionLedger />} />
              <Route path="inventory/deliveries" element={<DeliveryForm />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="documents" element={<Documents />} />
              <Route path="ai" element={<TokenAware>{(t) => <AiAssistant token={t} />}</TokenAware>} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="settings" element={<SettingsPageWrapper />} />
              <Route path="settings/profile" element={<ProfileSettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
