import React from 'react';
import { COL_ROW_H, DOT_R, getLC, TBL_HEADER_H, TBL_PAD, TBL_WIDTH, toKey } from './DragBoardConstants';

const GearIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth=".8" />
    <path d="M5 1v1M5 8v1M1 5h1M8 5h1M2.2 2.2l.7.7M7.1 7.1l.7.7M7.8 2.2l-.7.7M2.9 7.1l-.7.7" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" />
  </svg>
);

/**
 * SVG Table Card Node with columns, PK badges, and port circles (<= 100 lines).
 */
export const DragBoardTableCard = ({
  table,
  side,
  tp,
  onTableDragStart,
  onDotDown,
  onDotUp,
  mappings = [],
  toMap = {},
  mS,
  mT,
  onSelectMapping,
  onOpenSysTarget,
}) => {
  const iS = side === 'source';
  const pos = tp[table.tableName] || { x: 0, y: 0 };
  const hC = iS ? '#3C3489' : '#085041';
  const hBg = iS ? '#EEEDFE' : '#E1F5EE';
  const tH = TBL_HEADER_H + (table.columns?.length || 0) * COL_ROW_H + TBL_PAD * 2;

  return (
    <g transform={`translate(${pos.x},${pos.y})`}>
      <rect width={TBL_WIDTH} height={tH} rx={8} fill="#fff" stroke="#E8E8E5" strokeWidth={1} />
      <rect width={TBL_WIDTH} height={TBL_HEADER_H} rx={8} fill={hBg} style={{ cursor: 'grab' }} onMouseDown={(e) => onTableDragStart(e, table.tableName)} />
      <rect y={TBL_HEADER_H - 8} width={TBL_WIDTH} height={8} fill={hBg} />
      <text x={10} y={TBL_HEADER_H / 2 + 4} fill={hC} fontSize="11" fontWeight="600" fontFamily="system-ui">{table.tableName}</text>
      <text x={TBL_WIDTH - 8} y={TBL_HEADER_H / 2 + 4} fill={hC} fontSize="9" textAnchor="end" opacity=".6" fontFamily="system-ui">{table.columns?.length} cols</text>
      {(table.columns || []).map((col, ci) => {
        const k = toKey(table.tableName, col.name);
        const hasRegularMapping = iS ? mS.has(k) : (mT.has(k) && !toMap[k]);
        const hasSysMapping = !iS && toMap[k];
        const hasUdfMapping = !iS && toMap[k]?.mapping?.transforms?.some((t) => t.fn === 'UDF');
        const im = hasRegularMapping || hasSysMapping;
        const mp = iS ? mappings.find((m) => m.source === k) : mappings.find((m) => m.target === k && m.source);
        const dc = mp ? getLC(mp).stroke : hasUdfMapping ? '#534AB7' : hasSysMapping ? '#F59E0B' : '#D4D4D0';
        const cy = TBL_HEADER_H + TBL_PAD + ci * COL_ROW_H + COL_ROW_H / 2;
        const dx = iS ? TBL_WIDTH - DOT_R - 4 : DOT_R + 4;
        return (
          <g key={col.name} opacity={im ? 1 : 0.5}>
            {iS ? (
              <>
                {col.primaryKey && <text x={8} y={cy + 3} fontSize="7" fill="#854F0B">PK</text>}
                {!col.nullable && !col.primaryKey && <text x={8} y={cy + 3} fontSize="9" fill="#A32D2D">*</text>}
                <text x={col.primaryKey || !col.nullable ? 22 : 10} y={cy + 3} fontSize="10" fill="#1A1A1A" fontFamily="system-ui">{col.name}</text>
                <text x={TBL_WIDTH - DOT_R * 2 - 14} y={cy + 3} fontSize="8" fill="#9B9B9B" fontFamily="monospace" textAnchor="end">{col.type}</text>
              </>
            ) : (
              <>
                {col.primaryKey && <text x={DOT_R * 2 + 8} y={cy + 3} fontSize="7" fill="#854F0B">PK</text>}
                {!col.nullable && !col.primaryKey && <text x={DOT_R * 2 + 8} y={cy + 3} fontSize="9" fill="#A32D2D">*</text>}
                <text x={col.primaryKey || !col.nullable ? DOT_R * 2 + 20 : DOT_R * 2 + 14} y={cy + 3} fontSize="10" fill="#1A1A1A" fontFamily="system-ui">{col.name}</text>
                <text x={!col.primaryKey ? TBL_WIDTH - 22 : TBL_WIDTH - 8} y={cy + 3} fontSize="8" fill="#9B9B9B" fontFamily="monospace" textAnchor="end">{col.type}</text>
                {!col.primaryKey && !hasRegularMapping && (
                  <g transform={`translate(${TBL_WIDTH - 16},${cy - 5})`} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (hasSysMapping) onSelectMapping(toMap[k].idx); else onOpenSysTarget(table.tableName, col.name); }}>
                    <rect x={-3} y={-3} width={16} height={16} rx={4} fill={hasUdfMapping ? '#EEEDFE' : hasSysMapping ? '#FEF3C7' : 'transparent'} stroke={hasUdfMapping ? '#534AB7' : hasSysMapping ? '#F59E0B' : 'transparent'} strokeWidth={hasSysMapping || hasUdfMapping ? 0.8 : 0} />
                    <g fill={hasUdfMapping ? '#534AB7' : hasSysMapping ? '#D97706' : '#9B9B9B'}><GearIcon /></g>
                  </g>
                )}
              </>
            )}
            {hasSysMapping ? (
              <circle cx={dx} cy={cy} r={DOT_R} fill="#E8E8E5" stroke="#D4D4D0" strokeWidth={1} style={{ cursor: 'not-allowed' }} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()} />
            ) : (
              <circle cx={dx} cy={cy} r={DOT_R} fill={dc} stroke={dc} strokeWidth={1.5} style={{ cursor: 'crosshair' }} onMouseDown={(e) => onDotDown(e, k, side)} onMouseUp={(e) => onDotUp(e, k, side)} onMouseEnter={(e) => e.target.setAttribute('r', String(DOT_R * 1.6))} onMouseLeave={(e) => e.target.setAttribute('r', String(DOT_R))} />
            )}
          </g>
        );
      })}
    </g>
  );
};

export default DragBoardTableCard;
