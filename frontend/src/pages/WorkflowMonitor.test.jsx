import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WorkflowMonitor from './WorkflowMonitor';
import WorkflowMetaInspector from '../components/workflow/WorkflowMetaInspector';
import { workflowApi } from '../services/api';
import * as AuthContextModule from '../contexts/AuthContext';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Workflow Bulk Validation of Not Validated Pipelines', () => {
  let container = null, root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    jest.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'u-1', fullName: 'Admin' },
      hasPermission: () => true,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    container = null;
    jest.restoreAllMocks();
  });

  test('renders Validate All button and hides Start Workflow until all pipelines are validated', async () => {
    const mockWorkflow = {
      id: 'wf-1', name: 'ETL Pipeline Chain', status: 'DRAFT', chainCount: 1, singleChainReady: false,
      nodes: [
        { id: 'n-1', pipelineId: 'p-1', pipelineName: 'Extract', pipelineStatus: 'NOT_VALIDATED' },
        { id: 'n-2', pipelineId: 'p-2', pipelineName: 'Transform', pipelineStatus: 'NOT_VALIDATED' },
      ],
      edges: [{ sourcePipelineId: 'p-1', targetPipelineId: 'p-2' }],
    };

    jest.spyOn(workflowApi, 'getById').mockResolvedValue({ data: mockWorkflow });
    jest.spyOn(workflowApi, 'getErrors').mockResolvedValue({ data: { totalErrors: 0, errors: [] } });
    const validateSpy = jest.spyOn(workflowApi, 'validatePipelines').mockResolvedValue({
      data: {
        ...mockWorkflow, status: 'READY', singleChainReady: true,
        nodes: [
          { id: 'n-1', pipelineId: 'p-1', pipelineName: 'Extract', pipelineStatus: 'VALIDATED' },
          { id: 'n-2', pipelineId: 'p-2', pipelineName: 'Transform', pipelineStatus: 'VALIDATED' },
        ],
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/workflows/wf-1/monitor']}>
          <Routes>
            <Route path="/workflows/:workflowId/monitor" element={<WorkflowMonitor />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const headerValBtn = container.querySelector('#btn-validate-all-pipelines');
    expect(headerValBtn).not.toBeNull();
    expect(headerValBtn.textContent).toContain('Validate All (2)');
    expect(container.textContent).not.toContain('Start Workflow');

    // No validate button under checklist
    expect(container.querySelector('#btn-checklist-validate-all')).toBeNull();

    await act(async () => {
      headerValBtn.click();
    });

    expect(validateSpy).toHaveBeenCalledWith('wf-1');
  });

  test('WorkflowMetaInspector renders Validate All Pipelines button when validation errors present', () => {
    const handleValidate = jest.fn();
    act(() => {
      root.render(
        <WorkflowMetaInspector
          topologyInfo={{ chainCount: 1, singleChainReady: false, validationErrors: ["Pipeline 'p-1' must be VALIDATED."] }}
          onValidateAll={handleValidate}
        />
      );
    });

    const metaValBtn = container.querySelector('#btn-meta-validate-all');
    expect(metaValBtn).not.toBeNull();
    expect(metaValBtn.textContent).toContain('Validate All Pipelines');
    act(() => { metaValBtn.click(); });
    expect(handleValidate).toHaveBeenCalledTimes(1);
  });
});
