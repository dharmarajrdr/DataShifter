import React from 'react';
import { getLC, splitTableCol } from './DragBoardConstants';

const bz = (x1, y1, x2, y2) => {
  const d = Math.abs(x2 - x1) * 0.4;
  return `M${x1},${y1} C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`;
};

/**
 * SVG wires layer rendering bezier curves and transform pill badges (<= 100 lines).
 */
export const DragBoardSvgWires = ({
  mappings = [],
  sourceTables = [],
  targetTables = [],
  dotP,
  sel,
  setSel,
  onMappingClick,
  dLine,
}) => (
  <>
    {mappings.map((m, i) => {
      if (m.targetOnly || !m.source) return null;
      const [sT, sC] = splitTableCol(m.source);
      const [tT, tC] = splitTableCol(m.target);
      const st = sourceTables.find((t) => t.tableName === sT);
      const tt = targetTables.find((t) => t.tableName === tT);
      const si = st?.columns?.findIndex((c) => c.name === sC) ?? -1;
      const ti = tt?.columns?.findIndex((c) => c.name === tC) ?? -1;
      const sp = dotP(sT, si, 'source');
      const tP = dotP(tT, ti, 'target');
      if (!sp || !tP) return null;
      const lc = getLC(m);
      const isSel = sel === i;
      const curve = bz(sp.x, sp.y, tP.x, tP.y);

      return (
        <g key={`${m.source}-${m.target}`}>
          <path d={curve} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} onClick={() => setSel(isSel ? null : i)} />
          <path d={curve} fill="none" stroke={lc.stroke} strokeWidth={isSel ? 2.5 : 1.5} strokeDasharray={isSel ? 'none' : '5 3'} opacity={isSel ? 1 : 0.45} />
          {m.transforms?.length > 0 && (() => {
            const mx = (sp.x + tP.x) / 2;
            const my = (sp.y + tP.y) / 2;
            const lb = m.transforms.map((t) => {
              if (t.fn === 'UDF') {
                try {
                  const u = typeof t.args === 'string' ? JSON.parse(t.args) : t.args;
                  return `${u.methodName || 'UDF'} (v${u.version || '1.0'})`;
                } catch { return 'UDF'; }
              }
              return t.fn;
            }).join('→');
            const tw = Math.min(lb.length * 6 + 14, 120);
            return (
              <g style={{ cursor: 'pointer' }} onClick={() => { setSel(i); if (onMappingClick) onMappingClick(m, i); }}>
                <rect x={mx - tw / 2} y={my - 7} width={tw} height={14} rx={3} fill={lc.bg} stroke={lc.stroke} strokeWidth={0.5} />
                <text x={mx} y={my + 3} textAnchor="middle" fill={lc.text} fontSize="7" fontFamily="monospace" fontWeight="500">
                  {lb.length > 20 ? `${lb.slice(0, 19)}…` : lb}
                </text>
              </g>
            );
          })()}
        </g>
      );
    })}
    {dLine && <path d={bz(dLine.sx, dLine.sy, dLine.cx, dLine.cy)} fill="none" stroke="#534AB7" strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />}
  </>
);

export default DragBoardSvgWires;
