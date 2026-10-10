import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AuthLayout from './components/auth/AuthLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SubscriptionGuard from './components/auth/SubscriptionGuard';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import {
  BillingPage,
  ColumnMappingBoard,
  ConnectionsManager,
  DocsPage,
  ErrorLogViewer,
  ForgotPasswordPage,
  LiveMonitor,
  LoginPage,
  MembersPage,
  OnboardPage,
  OrgSettingsPage,
  PipelineDashboard,
  ForbiddenPage,
  NotFoundPage,
  ServerErrorPage,
  PipelineSettings,
  PipelineWizard,
  ResetPasswordPage,
  RolesPage,
  SignupPage,
  UdfLibrary,
  UserProfile,
} from './pages';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <NotificationProvider>
        <Routes>
          {/* Auth pages — no sidebar */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboard" element={<OnboardPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Docs — standalone page, no sidebar */}
          <Route path="/docs" element={<DocsPage />} />

          {/* App pages — sidebar, protected */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/pipelines" replace />} />

            {/* Billing — always accessible (owner check inside component) */}
            <Route path="/settings/billing" element={<BillingPage />} />

            {/* Everything below is gated by subscription status */}
            <Route
              path="/pipelines"
              element={
                <SubscriptionGuard>
                  <ProtectedRoute permission="pipeline:view">
                    <Outlet />
                  </ProtectedRoute>
                </SubscriptionGuard>
              }
            >
              <Route index element={<PipelineDashboard />} />
              <Route path="new" element={<ProtectedRoute permission="pipeline:create"><PipelineWizard /></ProtectedRoute>} />
              <Route path=":pipelineId/monitor" element={<ProtectedRoute permission="monitor:view"><LiveMonitor /></ProtectedRoute>} />
              <Route path=":pipelineId/mapping" element={<ColumnMappingBoard />} />
              <Route path=":pipelineId/errors" element={<ProtectedRoute permission="monitor:view_errors"><ErrorLogViewer /></ProtectedRoute>} />
              <Route path=":pipelineId/settings" element={<ProtectedRoute permission="settings:edit"><PipelineSettings /></ProtectedRoute>} />
            </Route>
            <Route path="/connections" element={<SubscriptionGuard><ProtectedRoute permission="connection:view"><ConnectionsManager /></ProtectedRoute></SubscriptionGuard>} />
            <Route path="/udfs" element={<SubscriptionGuard><ProtectedRoute permission="udf:view"><UdfLibrary /></ProtectedRoute></SubscriptionGuard>} />
            <Route path="/settings/org" element={<SubscriptionGuard><OrgSettingsPage /></SubscriptionGuard>} />
            <Route path="/settings/members" element={<SubscriptionGuard><ProtectedRoute anyOf={['org:manage_members', 'org:manage_invites']}><MembersPage /></ProtectedRoute></SubscriptionGuard>} />
            <Route path="/settings/roles" element={<SubscriptionGuard><ProtectedRoute permission="org:manage_roles"><RolesPage /></ProtectedRoute></SubscriptionGuard>} />
            <Route path="/profile" element={<UserProfile />} />

            {/* Dedicated error pages */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/500" element={<ServerErrorPage />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;