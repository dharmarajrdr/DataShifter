import React from 'react';
import { CloseIcon } from '../../layout/Icons';

/**
 * Header bar for Transform slide-over panel (<= 100 lines).
 */
export const TransformPanelHeader = ({
  isSystemValue,
  mapping,
  rawSourceType,
  rawTargetType,
  onClose,
}) => (
  <div
    id="transform-panel-header"
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: '1px solid #E8E8E5',
      flexShrink: 0,
    }}
  >
    <div>
      <p style={{ fontSize: '14px', fontWeight: 500 }}>
        {isSystemValue ? 'System value + Transformation' : 'Transformation'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
        {isSystemValue ? (
          <span style={{ fontSize: '12px', color: '#6B6B6B' }}>
            <i className="fa-solid fa-gear" style={{ marginRight: '4px' }} />
            {mapping?.target} ({rawTargetType || 'AUTO'})
          </span>
        ) : (
          <>
            <span
              style={{
                fontSize: '12px',
                color: '#3C3489',
                background: '#EEEDFE',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 500,
              }}
            >
              {mapping?.source} <small style={{ opacity: 0.8 }}>({rawSourceType || 'STRING'})</small>
            </span>
            <span style={{ fontSize: '12px', color: '#9B9B9B' }}>→</span>
            <span
              style={{
                fontSize: '12px',
                color: '#085041',
                background: '#E1F5EE',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 500,
              }}
            >
              {mapping?.target} <small style={{ opacity: 0.8 }}>({rawTargetType || 'STRING'})</small>
            </span>
          </>
        )}
      </div>
    </div>
    <span onClick={onClose} style={{ cursor: 'pointer' }}>
      <CloseIcon />
    </span>
  </div>
);

export default TransformPanelHeader;
