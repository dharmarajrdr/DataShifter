import React from 'react';
import PipelineSettingsOriginal from '../PipelineSettings';

/**
 * PipelineSettingsPage container (<= 100 lines).
 * Constrains height to screen height minus header height (calc(100vh - 50px))
 * to prevent viewport overflow issues.
 */
export const PipelineSettingsPage = (props) => (
  <div
    id="pipeline-settings-page"
    className="pipeline-settings-viewport w-full h-[calc(100vh-50px)] max-h-[calc(100vh-50px)] flex flex-col"
    style={{
      height: 'calc(100vh - 50px)',
      maxHeight: 'calc(100vh - 50px)',
    }}
  >
    <PipelineSettingsOriginal {...props} />
  </div>
);

export default PipelineSettingsPage;
