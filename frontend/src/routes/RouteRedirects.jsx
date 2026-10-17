import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * Route redirects for canonical pipeline and workflow paths (<= 100 lines).
 */
export const PipelineRedirect = () => {
  const { pipelineId } = useParams();
  return <Navigate to={`/pipelines/${pipelineId}/monitor`} replace />;
};

export const WorkflowRedirect = () => {
  const { workflowId } = useParams();
  return <Navigate to={`/workflows/${workflowId}/monitor`} replace />;
};

export default PipelineRedirect;
