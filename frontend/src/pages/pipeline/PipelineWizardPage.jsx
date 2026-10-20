import React from 'react';
import { PageHeader } from '../../components/common';
import CreateNamespaceModal from '../../components/pipeline/CreateNamespaceModal';
import {
  WizardFooter, WizardStepBasics, WizardStepEntities,
  WizardStepIndicator, WizardStepReview, WizardStepSource, WizardStepTarget,
} from '../../components/pipeline/wizard';
import usePipelineWizard from '../../components/pipeline/wizard/usePipelineWizard';
import { WIZARD } from '../../constants/literals';
import { useAuth } from '../../contexts/AuthContext';
import { ForbiddenPage } from '../ErrorPage';

/**
 * 5-Step Pipeline Creation Wizard Page (<= 100 lines).
 */
export const PipelineWizardPage = () => {
  const auth = useAuth() || {};
  const canView = auth.canViewPipeline ?? (auth.hasPermission ? auth.hasPermission('pipeline:view') : true);
  const canCreate = auth.canCreatePipeline ?? (auth.hasPermission ? auth.hasPermission('pipeline:create') : true);
  const wiz = usePipelineWizard();

  if (!canView || !canCreate) {
    return <ForbiddenPage missingPermission="pipeline:create" message="No permission to create pipelines." />;
  }

  const stepContents = [
    <WizardStepBasics config={wiz.config} setConfig={wiz.setConfig} namespaces={wiz.namespaces} onCreateNamespace={() => wiz.setShowCreateNs(true)} errors={wiz.errors} />,
    <WizardStepSource config={wiz.config} setConfig={wiz.setConfig} connections={wiz.connections} errors={wiz.errors} adapters={wiz.sourceAdapters} />,
    <WizardStepTarget config={wiz.config} setConfig={wiz.setConfig} connections={wiz.connections} errors={wiz.errors} adapters={wiz.targetAdapters} />,
    <WizardStepEntities config={wiz.config} setConfig={wiz.setConfig} errors={wiz.errors} />,
    <WizardStepReview config={wiz.config} namespaces={wiz.namespaces} />,
  ];

  return (
    <div id="pipeline-wizard-page" className="pipeline-wizard-page-view min-h-[calc(100vh-80px)] flex flex-col">
      <PageHeader id="pipeline-wizard-header" title="Create New Pipeline" />
      <div
        id="pipeline-wizard-container"
        className="wizard-container max-w-7xl w-full mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col flex-1 my-2"
      >
        <div className="w-3/4 mx-auto mb-3">
          <WizardStepIndicator id="pipeline-step-indicator" steps={WIZARD.steps} currentStep={wiz.step} />
        </div>
        <div id="pipeline-step-content" className="step-content-area flex-1 py-2 w-3/4 mr-auto text-left">
          {stepContents[wiz.step]}
        </div>
        <WizardFooter
          id="pipeline-wizard-footer"
          step={wiz.step}
          maxSteps={WIZARD.steps.length}
          onBack={wiz.handleBack}
          onNext={wiz.handleNext}
          onCreate={wiz.handleCreate}
          creating={wiz.creating}
        />
      </div>
      {wiz.showCreateNs && (
        <CreateNamespaceModal
          onClose={() => wiz.setShowCreateNs(false)}
          onCreated={(ns) => {
            wiz.setNamespaces((p) => [...p, ns]);
            wiz.setConfig((p) => ({ ...p, namespaceId: ns.id }));
          }}
        />
      )}
    </div>
  );
};

export default PipelineWizardPage;
