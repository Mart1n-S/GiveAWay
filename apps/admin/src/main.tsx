import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AssociationsPendingPage } from '@/pages/AssociationsPendingPage';
import { AssociationsPage } from '@/pages/AssociationsPage';
import { AssociationDetailPage } from '@/pages/AssociationDetailPage';
import { MissionDetailPage } from '@/pages/MissionDetailPage';
import { UsersPage } from '@/pages/UsersPage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { AdminsPage } from '@/pages/AdminsPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { AdminLogsPage } from '@/pages/AdminLogsPage';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/associations/pending" element={<AssociationsPendingPage />} />
              <Route path="/associations" element={<AssociationsPage />} />
              <Route path="/associations/:id" element={<AssociationDetailPage />} />
              <Route path="/missions/:id" element={<MissionDetailPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/admins" element={<AdminsPage />} />
              <Route path="/account/password" element={<ChangePasswordPage />} />
              <Route path="/logs" element={<AdminLogsPage />} />
              <Route index element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
