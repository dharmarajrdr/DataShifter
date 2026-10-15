import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import SubscriptionGuard from '../components/auth/SubscriptionGuard';
import AppLayout from '../components/layout/AppLayout';
import MarketplacePage from '../pages/marketplace/MarketplacePage';
import {
  BeetelAgentPage, BillingPage, ColumnMappingBoard, ConnectionsManager,
  DocsPage, ErrorLogViewer, ForgotPasswordPage, LiveMonitor, LoginPage,
  MembersPage, OnboardPage, OrgApiKeysPage, OrgSettingsPage, PipelineDashboard,
  ForbiddenPage, NotFoundPage, ServerErrorPage, PipelineSettings, PipelineWizard,
  ResetPasswordPage, RolesPage, SignupPage, UdfLibrary, UserProfile,
  WorkflowBuilderPage, WorkflowDashboard, WorkflowMonitor, WorkflowSettings, NotifyHubPage,
} from '../pages';

/**
 * Top-level application routes configuration (<= 100 lines).
 */
export const AppRoutes = () => (
  <div id="app-routes-container" className="app-routes-container min-h-screen">
    <Routes>
      {/* Standalone pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route path="/docs" element={<DocsPage />} />

      {/* Authenticated app shell */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/pipelines" replace />} />
        <Route path="/marketplace" element={<SubscriptionGuard><MarketplacePage /></SubscriptionGuard>} />
        <Route path="/settings/billing" element={<BillingPage />} />

        {/* Pipelines module */}
        <Route path="/pipelines" element={<SubscriptionGuard><ProtectedRoute permission="pipeline:view"><Outlet /></ProtectedRoute></SubscriptionGuard>}>
          <Route index element={<PipelineDashboard />} />
          <Route path="new" element={<ProtectedRoute permission="pipeline:create"><PipelineWizard /></ProtectedRoute>} />
          <Route path=":pipelineId/monitor" element={<ProtectedRoute permission="monitor:view"><LiveMonitor /></ProtectedRoute>} />
          <Route path=":pipelineId/mapping" element={<ColumnMappingBoard />} />
          <Route path=":pipelineId/errors" element={<ProtectedRoute permission="monitor:view_errors"><ErrorLogViewer /></ProtectedRoute>} />
          <Route path=":pipelineId/settings" element={<ProtectedRoute permission="settings:edit"><PipelineSettings /></ProtectedRoute>} />
        </Route>

        {/* Workflows module */}
        <Route path="/workflows" element={<SubscriptionGuard><ProtectedRoute permission="workflow:view"><Outlet /></ProtectedRoute></SubscriptionGuard>}>
          <Route index element={<WorkflowDashboard />} />
          <Route path="new" element={<ProtectedRoute permission="workflow:create"><WorkflowBuilderPage /></ProtectedRoute>} />
          <Route path=":workflowId/edit" element={<ProtectedRoute permission="workflow:edit"><WorkflowBuilderPage /></ProtectedRoute>} />
          <Route path=":workflowId/monitor" element={<ProtectedRoute permission="workflow:view"><WorkflowMonitor /></ProtectedRoute>} />
          <Route path=":workflowId/errors" element={<ProtectedRoute permission="monitor:view_errors"><WorkflowMonitor /></ProtectedRoute>} />
          <Route path=":workflowId/settings" element={<ProtectedRoute anyOf={['workflow:edit', 'workflow:delete']}><WorkflowSettings /></ProtectedRoute>} />
        </Route>

        {/* Connectors & tooling */}
        <Route path="/connections" element={<SubscriptionGuard><ProtectedRoute permission="connection:view"><ConnectionsManager /></ProtectedRoute></SubscriptionGuard>} />
        <Route path="/udfs" element={<SubscriptionGuard><ProtectedRoute permission="udf:view"><UdfLibrary /></ProtectedRoute></SubscriptionGuard>} />
        <Route path="/beetel" element={<SubscriptionGuard><BeetelAgentPage /></SubscriptionGuard>} />
        <Route path="/beetel/:sessionId" element={<SubscriptionGuard><BeetelAgentPage /></SubscriptionGuard>} />
        <Route path="/notifyhub" element={<SubscriptionGuard><NotifyHubPage /></SubscriptionGuard>} />

        {/* Admin settings */}
        <Route path="/settings/org" element={<SubscriptionGuard><OrgSettingsPage /></SubscriptionGuard>} />
        <Route path="/settings/members" element={<SubscriptionGuard><ProtectedRoute anyOf={['org:manage_members', 'org:manage_invites']}><MembersPage /></ProtectedRoute></SubscriptionGuard>} />
        <Route path="/settings/roles" element={<SubscriptionGuard><ProtectedRoute permission="org:manage_roles"><RolesPage /></ProtectedRoute></SubscriptionGuard>} />
        <Route path="/settings/api-keys" element={<SubscriptionGuard><OrgApiKeysPage /></SubscriptionGuard>} />
        <Route path="/profile" element={<UserProfile />} />

        {/* Error pages */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </div>
);

export default AppRoutes;
