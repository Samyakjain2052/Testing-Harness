import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppWorkspacePage from './pages/AppWorkspacePage';
import TestDetailPage from './pages/TestDetailPage';
import ExecutionHistoryPage from './pages/ExecutionHistoryPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="apps/:appId" element={<AppWorkspacePage />} />
        <Route path="apps/:appId/scripts/:scriptId" element={<TestDetailPage />} />
        <Route path="apps/:appId/history" element={<ExecutionHistoryPage />} />
        <Route path="executions/:executionId" element={<ExecutionDetailPage />} />
      </Route>
    </Routes>
  );
}
