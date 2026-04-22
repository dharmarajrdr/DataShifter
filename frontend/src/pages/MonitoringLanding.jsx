import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING } from '../constants/design';
import { FCCC } from '../constants/layouts';
import { PageHeader, Button } from '../components/common';

const MonitoringLanding = () => {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title="Monitoring" subtitle="Select a running pipeline to view live monitoring." />
      <div style={{
        ...FCCC, padding: '80px 0', color: COLORS.text.secondary,
      }}>
        <p style={{ fontSize: FONT.size.lg, marginBottom: SPACING.md }}>No pipeline selected</p>
        <p style={{ fontSize: FONT.size.md, marginBottom: SPACING.lg }}>
          Go to the dashboard and click on a running pipeline to view its live monitor.
        </p>
        <Button onClick={() => navigate('/pipelines')}>Go to pipelines</Button>
      </div>
    </div>
  );
};

export default MonitoringLanding;
