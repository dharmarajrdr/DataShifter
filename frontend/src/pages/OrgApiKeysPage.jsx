import React from 'react';
import SettingsTabs from '../components/common/SettingsTabs';
import AiKeyManagerSection from '../components/ai/AiKeyManagerSection';
import { SPACING } from '../constants/design';
import { AGENT } from '../constants/literals';
import { useAuth } from '../contexts/AuthContext';

const OrgApiKeysPage = () => {
  const { user, hasPermission } = useAuth();
  const canEditOrg =
    hasPermission('org:manage_roles') ||
    hasPermission('org:manage_members') ||
    Boolean(user?.orgOwner);

  return (
    <div>
      <SettingsTabs
        title={`${AGENT.name} AI — Organization Shared LLM API Keys`}
        subtitle="Manage shared Groq and Ollama API keys with automatic multi-key failover across your organization"
      />

      <div style={{ maxWidth: '680px', paddingTop: SPACING.xl }}>
        <AiKeyManagerSection
          scope="ORG"
          canEdit={canEditOrg}
          style={{ marginTop: 0 }}
        />
      </div>
    </div>
  );
};

export default OrgApiKeysPage;
