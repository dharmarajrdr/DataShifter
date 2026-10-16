import React from 'react';
import { OracleIcon, PostgresIcon, SpannerIcon } from '../layout/Icons';
import { BORDER_RADIUS, COLORS } from '../../constants/design';

const DB_ICON_CONFIG = {
  ORACLE: { bg: COLORS.status.errorLight, Icon: OracleIcon },
  SPANNER: { bg: COLORS.status.infoLight, Icon: SpannerIcon },
  POSTGRESQL: { bg: COLORS.status.successLight, Icon: PostgresIcon },
};

export const ConnectionDbIcon = ({ dbType, id, className = '' }) => {
  const normalized = (dbType || 'POSTGRESQL').toUpperCase();
  const config = DB_ICON_CONFIG[normalized] || DB_ICON_CONFIG.POSTGRESQL;
  const IconComp = config.Icon;

  return (
    <div
      id={id}
      className={`ds-conn-db-icon flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.md,
        background: config.bg,
        border: `1px solid ${COLORS.border.light}`,
      }}
    >
      <IconComp size={20} />
    </div>
  );
};

export default ConnectionDbIcon;
