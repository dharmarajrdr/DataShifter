import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SubscriptionGuard from './components/auth/SubscriptionGuard';
import AuthLayout from './components/auth/AuthLayout';
import AppLayout from './components/layout/AppLayout';
import {
  PipelineDashboard,
  ColumnMappingBoard,
  LiveMonitor,
  PipelineWizard,
  ConnectionsManager,
  ErrorLogViewer,
  PipelineSettings,
  UserProfile,
  LoginPage,
  SignupPage,
  OnboardPage,
  OrgSettingsPage,
  RolesPage,
  DocsPage,
  BillingPage,
} from './pages';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Auth pages — no sidebar */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboard" element={<OnboardPage />} />
        </Route>

        {/* Docs — standalone page, no sidebar */}
        <Route path="/docs" element={<DocsPage />} />

        {/* App pages — sidebar, protected */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/pipelines" replace />} />

          {/* Billing — always accessible (owner check inside component) */}
          <Route path="/settings/billing" element={<BillingPage />} />

          {/* Everything below is gated by subscription status */}
          <Route path="/pipelines" element={<SubscriptionGuard><PipelineDashboard /></SubscriptionGuard>} />
          <Route path="/pipelines/new" element={<SubscriptionGuard><PipelineWizard /></SubscriptionGuard>} />
          <Route path="/pipelines/:pipelineId/monitor" element={<SubscriptionGuard><LiveMonitor /></SubscriptionGuard>} />
          <Route path="/pipelines/:pipelineId/mapping" element={<SubscriptionGuard><ColumnMappingBoard /></SubscriptionGuard>} />
          <Route path="/pipelines/:pipelineId/errors" element={<SubscriptionGuard><ErrorLogViewer /></SubscriptionGuard>} />
          <Route path="/pipelines/:pipelineId/settings" element={<SubscriptionGuard><PipelineSettings /></SubscriptionGuard>} />
          <Route path="/connections" element={<SubscriptionGuard><ConnectionsManager /></SubscriptionGuard>} />
          <Route path="/settings/org" element={<SubscriptionGuard><OrgSettingsPage /></SubscriptionGuard>} />
          <Route path="/settings/roles" element={<SubscriptionGuard><RolesPage /></SubscriptionGuard>} />
          <Route path="/profile" element={<UserProfile />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/pipelines" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;