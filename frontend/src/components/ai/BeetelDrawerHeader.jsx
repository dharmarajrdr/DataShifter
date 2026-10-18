import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, SPACING } from '../../constants/design';
import { FRSC, FRBC } from '../../constants/layouts';
import { AGENT } from '../../constants/literals';
import { BeetelIcon } from '../layout/Icons';

export const BeetelDrawerHeader = ({ routeContext, onClose }) => {
  const navigate = useNavigate();

  const handleFullView = () => {
    const params = new URLSearchParams();
    if (routeContext?.type && routeContext.type !== 'NONE') {
      params.set('contextType', routeContext.type);
      params.set('entityId', routeContext.id || '');
    }
    navigate(`/beetel${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div style={{
      ...FRBC,
      padding: `${SPACING.sm} ${SPACING.md}`,
      background: COLORS.brand.primary,
      borderBottom: `1px solid ${COLORS.brand.primaryDark}`,
      color: '#FFFFFF',
      flexShrink: 0,
    }}>
      <div style={{ ...FRSC, gap: SPACING.xs }}>
        <div style={{
          width: 28, height: 28, borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.16)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BeetelIcon color="#FFFFFF" size={15} />
        </div>
        <div>
          <p style={{ fontSize: FONT.size.sm, fontWeight: FONT.weight.semibold, color: '#FFFFFF', margin: 0 }}>
            {AGENT.title}
          </p>
          <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.78)', margin: 0 }}>
            {routeContext?.type && routeContext.type !== 'NONE'
              ? `Bound to active ${routeContext.type.toLowerCase()}`
              : 'Contextual AI Assistant'}
          </p>
        </div>
      </div>

      <div style={{ ...FRSC, gap: '6px' }}>
        <button
          type="button"
          onClick={handleFullView}
          title="Expand to full Beetel workspace"
          style={{
            padding: '4px 9px', borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.28)',
            background: 'rgba(255, 255, 255, 0.14)',
            color: '#FFFFFF', fontSize: '11px', fontWeight: FONT.weight.medium,
            cursor: 'pointer',
          }}
        >
          Full view ↗
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close Beetel assistant"
          style={{
            width: 26, height: 26, borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#FFFFFF', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className="fa-solid fa-xmark" style={{ fontSize: '12px' }} />
        </button>
      </div>
    </div>
  );
};

export default BeetelDrawerHeader;
