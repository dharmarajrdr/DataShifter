import { useCallback, useEffect, useRef, useState } from 'react';
import { COL_ROW_H, DOT_R, LINE_COLORS, MAX_ZOOM, MIN_ZOOM, organize, splitTableCol, TBL_HEADER_H, TBL_PAD, TBL_WIDTH, WHEEL_ZOOM_FACTOR, ZOOM_STEP } from './mapping/DragBoardConstants';
import DragBoardSvgWires from './mapping/DragBoardSvgWires';
import DragBoardTableCard from './mapping/DragBoardTableCard';
import DragBoardToolbar from './mapping/DragBoardToolbar';
import TargetConfigModal from './mapping/TargetConfigModal';

export const DragMappingBoard = ({
  sourceTables = [], targetTables = [], mappings = [],
  onMappingsChange, onMappingClick, onAddSystemValue, onAddUdf,
}) => {
  const cRef = useRef(null);
  const [zoom, setZoom] = useState(1); const [pan, setPan] = useState({ x: 0, y: 0 }); const [isPan, setIsPan] = useState(false);
  const ps = useRef({ x: 0, y: 0, px: 0, py: 0 }); const [tp, setTp] = useState({}); const [dTbl, setDTbl] = useState(null);
  const dOff = useRef({ x: 0, y: 0 }); const [dLine, setDLine] = useState(null); const [sel, setSel] = useState(null); const [sysTarget, setSysTarget] = useState(null);

  useEffect(() => { const w = cRef.current?.offsetWidth || 800; setTp(organize(sourceTables, targetTables, w)); }, [sourceTables?.length, targetTables?.length]);
  useEffect(() => {
    const el = cRef.current; if (!el) return;
    const onW = (e) => {
      e.preventDefault();
      if (e.ctrlKey) setZoom((p) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, p - e.deltaY * WHEEL_ZOOM_FACTOR)));
      else setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    };
    el.addEventListener('wheel', onW, { passive: false });
    return () => el.removeEventListener('wheel', onW);
  }, []);

  const doOrg = useCallback(() => { const w = cRef.current?.offsetWidth || 800; setTp(organize(sourceTables, targetTables, w)); setZoom(1); setPan({ x: 0, y: 0 }); }, [sourceTables, targetTables]);
  const zBy = useCallback((d) => setZoom((p) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, p + d))), []);
  const toC = useCallback((cx, cy) => { const r = cRef.current.getBoundingClientRect(); return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom }; }, [pan, zoom]);
  const dotP = useCallback((tn, ci, s) => {
    const t = tp[tn]; if (!t || ci < 0) return null;
    return { x: s === 'source' ? t.x + TBL_WIDTH - DOT_R - 4 : t.x + DOT_R + 4, y: t.y + TBL_HEADER_H + TBL_PAD + ci * COL_ROW_H + COL_ROW_H / 2 };
  }, [tp]);

  const onCD = useCallback((e) => {
    const isBg = e.target === cRef.current || e.target?.tagName === 'svg';
    if (e.button === 1 || (e.button === 0 && (e.altKey || isBg))) { e.preventDefault(); setIsPan(true); ps.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; }
    if (e.button === 0 && isBg) setSel(null);
  }, [pan]);
  const onCM = useCallback((e) => {
    if (isPan) setPan({ x: ps.current.px + (e.clientX - ps.current.x), y: ps.current.py + (e.clientY - ps.current.y) });
    if (dTbl) { const c = toC(e.clientX, e.clientY); setTp((p) => ({ ...p, [dTbl]: { x: c.x - dOff.current.x, y: c.y - dOff.current.y } })); }
    if (dLine) { const c = toC(e.clientX, e.clientY); setDLine((p) => ({ ...p, cx: c.x, cy: c.y })); }
  }, [isPan, dTbl, dLine, toC]);
  const onCU = useCallback(() => { setIsPan(false); setDTbl(null); setDLine(null); }, []);
  const onTD = useCallback((e, n) => { e.stopPropagation(); const c = toC(e.clientX, e.clientY); const t = tp[n] || { x: 0, y: 0 }; dOff.current = { x: c.x - t.x, y: c.y - t.y }; setDTbl(n); }, [tp, toC]);

  const toMap = {}; mappings.forEach((m, i) => { if (m.targetOnly || !m.source) toMap[m.target] = { mapping: m, idx: i }; });
  const mS = new Set(mappings.filter((m) => m.source).map((m) => m.source)); const mT = new Set(mappings.map((m) => m.target));

  const onDD = useCallback((e, k, s) => {
    e.stopPropagation(); e.preventDefault();
    const [tn, cn] = splitTableCol(k); const tbls = s === 'source' ? sourceTables : targetTables;
    const tbl = tbls.find((t) => t.tableName === tn); const ci = tbl?.columns?.findIndex((c) => c.name === cn) ?? -1;
    const p = dotP(tn, ci, s); if (!p) return;
    setDLine({ fk: k, fs: s, sx: p.x, sy: p.y, cx: p.x, cy: p.y }); setSel(null);
  }, [sourceTables, targetTables, dotP]);

  const onDU = useCallback((e, k, s) => {
    if (!dLine) return; e.stopPropagation();
    if (s === 'target' && toMap[k]) { setDLine(null); return; }
    let src, tgt;
    if (dLine.fs === 'source' && s === 'target') { src = dLine.fk; tgt = k; } else if (dLine.fs === 'target' && s === 'source') { src = k; tgt = dLine.fk; } else { setDLine(null); return; }
    if (!mappings.some((m) => m.source === src && m.target === tgt)) {
      onMappingsChange([...mappings, { source: src, target: tgt, color: LINE_COLORS[mappings.length % LINE_COLORS.length].key, transforms: [] }]);
    }
    setDLine(null);
  }, [dLine, mappings, onMappingsChange, toMap]);

  return (
    <div className="relative">
      <DragBoardToolbar zoom={zoom} onZoomIn={() => zBy(ZOOM_STEP)} onZoomOut={() => zBy(-ZOOM_STEP)} onResetView={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} onOrganize={doOrg} />
      <div id="column-mapping-board-canvas" ref={cRef} onMouseDown={onCD} onMouseMove={onCM} onMouseUp={onCU} style={{ width: '100%', height: '70vh', overflow: 'hidden', position: 'relative', border: '1px solid #E8E8E5', borderRadius: '12px', background: '#F7F7F5', touchAction: 'none', overscrollBehavior: 'contain', cursor: isPan ? 'grabbing' : 'default' }}>
        <svg width="100%" height="100%">
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            <DragBoardSvgWires mappings={mappings} sourceTables={sourceTables} targetTables={targetTables} dotP={dotP} sel={sel} setSel={setSel} onMappingClick={onMappingClick} dLine={dLine} />
            {(sourceTables || []).map((t) => <DragBoardTableCard key={t.tableName} table={t} side="source" tp={tp} onTableDragStart={onTD} onDotDown={onDD} onDotUp={onDU} mappings={mappings} toMap={toMap} mS={mS} mT={mT} onSelectMapping={setSel} onOpenSysTarget={(table, col) => setSysTarget({ table, col })} />)}
            {(targetTables || []).map((t) => <DragBoardTableCard key={t.tableName} table={t} side="target" tp={tp} onTableDragStart={onTD} onDotDown={onDD} onDotUp={onDU} mappings={mappings} toMap={toMap} mS={mS} mT={mT} onSelectMapping={setSel} onOpenSysTarget={(table, col) => setSysTarget({ table, col })} />)}
          </g>
        </svg>
      </div>
      {sel !== null && mappings[sel] && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #E8E8E5', padding: '6px 16px', borderRadius: '99px', fontSize: '12px', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{mappings[sel].targetOnly ? mappings[sel].target : `${mappings[sel].source} → ${mappings[sel].target}`}</span>
          {onMappingClick && <span style={{ cursor: 'pointer', color: '#534AB7', fontWeight: 500 }} onClick={() => onMappingClick(mappings[sel], sel)}>Transform</span>}
          <span style={{ cursor: 'pointer', color: '#A32D2D', fontWeight: 500 }} onClick={() => { onMappingsChange(mappings.filter((_, i) => i !== sel)); setSel(null); }}>Remove</span>
        </div>
      )}
      {sysTarget && <TargetConfigModal colName={sysTarget.col} sourceTables={sourceTables} onSelectSystem={(fn, args) => onAddSystemValue?.(sysTarget.table, sysTarget.col, fn, args)} onSelectUdf={(cfg, pCol) => onAddUdf?.(sysTarget.table, sysTarget.col, cfg, pCol)} onClose={() => setSysTarget(null)} />}
    </div>
  );
};

export default DragMappingBoard;