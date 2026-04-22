import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
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

        {/* App pages — sidebar, protected */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/pipelines" replace />} />

          {/* Pipelines */}
          <Route path="/pipelines" element={<PipelineDashboard />} />
          <Route path="/pipelines/new" element={<PipelineWizard />} />
          <Route path="/pipelines/:pipelineId/monitor" element={<LiveMonitor />} />
          <Route path="/pipelines/:pipelineId/mapping" element={<ColumnMappingBoard />} />
          <Route path="/pipelines/:pipelineId/errors" element={<ErrorLogViewer />} />
          <Route path="/pipelines/:pipelineId/settings" element={<PipelineSettings />} />

          {/* Connections */}
          <Route path="/connections" element={<ConnectionsManager />} />

          {/* Org settings + Roles */}
          <Route path="/settings/org" element={<OrgSettingsPage />} />
          <Route path="/settings/roles" element={<RolesPage />} />

          {/* Profile */}
          <Route path="/profile" element={<UserProfile />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/pipelines" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;