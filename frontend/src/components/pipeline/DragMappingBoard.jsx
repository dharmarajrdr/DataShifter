import React, { useState, useRef, useCallback, useEffect } from 'react';
import { COLORS, FONT, SPACING, BORDER_RADIUS } from '../../constants/design';
import UdfPickerModal from './UdfPickerModal';

const LINE_COLORS = [
  { stroke: '#534AB7', bg: '#EEEDFE', text: '#3C3489', key: 'purple' },
  { stroke: '#1D9E75', bg: '#E1F5EE', text: '#085041', key: 'teal' },
  { stroke: '#D85A30', bg: '#FAECE7', text: '#712B13', key: 'coral' },
  { stroke: '#D4537E', bg: '#FBEAF0', text: '#72243E', key: 'pink' },
  { stroke: '#378ADD', bg: '#E6F1FB', text: '#0C447C', key: 'blue' },
];
const COL_ROW_H = 28, TBL_HEADER_H = 32, TBL_WIDTH = 260, TBL_PAD = 4, DOT_R = 5;
const toKey = (t, c) => `${t}.${c}`;
const getLC = (m) => LINE_COLORS.find(c => c.key === m.color) || LINE_COLORS[0];

const SYSTEM_VALUES = [
  { fn: 'CURRENT_TIMESTAMP', label: 'Current timestamp', desc: 'System time when row is migrated', icon: '🕐' },
  { fn: 'CURRENT_DATE', label: 'Current date', desc: 'Today\'s date (no time)', icon: '📅' },
  { fn: 'STATIC_VALUE', label: 'Static value', desc: 'Same fixed value for every row (e.g., "STANDARD")', icon: '📌', needsArgs: true, argHint: 'Enter value' },
  { fn: 'UUID', label: 'Generate UUID', desc: 'Unique identifier (UUID v4)', icon: '🔑' },
  { fn: 'ROW_NUMBER', label: 'Row number', desc: 'Sequential counter (1, 2, 3...)', icon: '#️⃣' },
];

const organize = (src, tgt, w) => {
  const p = {}; const lx = 40, rx = Math.max(w - TBL_WIDTH - 40, TBL_WIDTH + 200);
  let ly = 40; (src || []).forEach(t => { p[t.tableName] = { x: lx, y: ly }; ly += TBL_HEADER_H + (t.columns?.length || 0) * COL_ROW_H + TBL_PAD * 2 + 24; });
  let ry = 40; (tgt || []).forEach(t => { p[t.tableName] = { x: rx, y: ry }; ry += TBL_HEADER_H + (t.columns?.length || 0) * COL_ROW_H + TBL_PAD * 2 + 24; });
  return p;
};

const OrganizeIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="4" height="3" rx=".8" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="6" width="4" height="3" rx=".8" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="3.5" width="4" height="3" rx=".8" stroke="currentColor" strokeWidth="1.2"/><path d="M5 2.5h3M5 7.5h2.5M8.5 5H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>;
const ResetIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 2.5v3.5h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2.8 6C3.4 3.8 5.3 2.2 7.5 2.2c2.8 0 5 2.2 5 5s-2.2 5-5 5c-1.8 0-3.3-.9-4.2-2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const GearIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth=".8"/><path d="M5 1v1M5 8v1M1 5h1M8 5h1M2.2 2.2l.7.7M7.1 7.1l.7.7M7.8 2.2l-.7.7M2.9 7.1l-.7.7" stroke="currentColor" strokeWidth=".8" strokeLinecap="round"/></svg>;

/* ================================================================
   TARGET COLUMN CONFIG MODAL (System Value or Java UDF)
   ================================================================ */
const TargetConfigModal = ({ colName, sourceTables, onSelectSystem, onSelectUdf, onClose }) => {
  const [mode, setMode] = useState('system');
  const [selectedFn, setSelectedFn] = useState(null);
  const [args, setArgs] = useState('');

  if (mode === 'udf') {
    return (
      <UdfPickerModal
        targetColumn={colName}
        sourceTables={sourceTables}
        onApply={(config, primaryCol) => onSelectUdf(config, primaryCol)}
        onClose={onClose}
      />
    );
  }

  const handleApply = () => {
    if (!selectedFn) return;
    onSelectSystem(selectedFn, args);
    onClose();
  };

  const selected = SYSTEM_VALUES.find(s => s.fn === selectedFn);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.2)', zIndex: 100 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,.12)', width: '400px', overflow: 'hidden' }}>
        {/* Header with Mode Tabs */}
        <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #E8E8E5', background: '#FAFAF9' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}>Target Column Configuration</div>
          <div style={{ fontSize: '12px', color: '#9B9B9B', marginTop: '2px', marginBottom: '12px' }}>
            Configure generation for <span style={{ color: '#534AB7', fontWeight: 600 }}>{colName}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('system')}
              style={{
                flex: 1, padding: '8px 12px', border: 'none', background: 'transparent',
                borderBottom: mode === 'system' ? '2px solid #534AB7' : '2px solid transparent',
                color: mode === 'system' ? '#534AB7' : '#6B6B6B', fontWeight: mode === 'system' ? 600 : 400,
                fontSize: '12px', cursor: 'pointer'
              }}
            >
              ⚙ System Value
            </button>
            <button
              onClick={() => setMode('udf')}
              style={{
                flex: 1, padding: '8px 12px', border: 'none', background: 'transparent',
                borderBottom: mode === 'udf' ? '2px solid #534AB7' : '2px solid transparent',
                color: mode === 'udf' ? '#534AB7' : '#6B6B6B', fontWeight: mode === 'udf' ? 600 : 400,
                fontSize: '12px', cursor: 'pointer'
              }}
            >
              ☕ Java UDF
            </button>
          </div>
        </div>

        {/* Options list */}
        <div style={{ padding: '8px', maxHeight: '320px', overflowY: 'auto' }}>
          {SYSTEM_VALUES.map(sv => {
            const isSel = selectedFn === sv.fn;
            return (
              <div key={sv.fn} onClick={() => { setSelectedFn(sv.fn); setArgs(''); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px',
                  borderRadius: '8px', cursor: 'pointer',
                  background: isSel ? '#EEEDFE' : 'transparent',
                  border: isSel ? '1.5px solid #534AB7' : '1.5px solid transparent',
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F7F7F5'; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize: '16px', marginTop: '1px' }}>{sv.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#1A1A1A' }}>{sv.label}</div>
                  <div style={{ fontSize: '11px', color: '#9B9B9B', marginTop: '1px' }}>{sv.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Args input for functions that need it */}
        {selected?.needsArgs && (
          <div style={{ padding: '0 20px 12px' }}>
            <input value={args} onChange={e => setArgs(e.target.value)} placeholder={selected.argHint || 'Enter value'}
              autoFocus
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #E8E8E5', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E8E8E5', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #E8E8E5', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#6B6B6B' }}>Cancel</button>
          <button onClick={handleApply} disabled={!selectedFn || (selected?.needsArgs && !args.trim())}
            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: selectedFn ? '#534AB7' : '#D4D4D0', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: selectedFn ? 'pointer' : 'not-allowed' }}>Apply</button>
        </div>
      </div>
    </>
  );
};

/* ================================================================
   MAIN BOARD
   ================================================================ */
const DragMappingBoard = ({ sourceTables, targetTables, mappings, onMappingsChange, onMappingClick, onAddSystemValue, onAddUdf }) => {
  const cRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPan, setIsPan] = useState(false);
  const ps = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [tp, setTp] = useState({});
  const [dTbl, setDTbl] = useState(null);
  const dOff = useRef({ x: 0, y: 0 });
  const [dLine, setDLine] = useState(null);
  const [sel, setSel] = useState(null);
  const [sysTarget, setSysTarget] = useState(null); // { table, col } for system value picker

  useEffect(() => { const w = cRef.current?.offsetWidth || 800; setTp(organize(sourceTables, targetTables, w)); }, [sourceTables?.length, targetTables?.length]);

  const doOrg = useCallback(() => { const w = cRef.current?.offsetWidth || 800; setTp(organize(sourceTables, targetTables, w)); setZoom(1); setPan({ x: 0, y: 0 }); }, [sourceTables, targetTables]);
  const zBy = useCallback(d => setZoom(p => Math.max(0.25, Math.min(2.5, p + d))), []);
  const toC = useCallback((cx, cy) => { const r = cRef.current.getBoundingClientRect(); return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom }; }, [pan, zoom]);
  const dotP = useCallback((tn, ci, s) => { const t = tp[tn]; if (!t || ci < 0) return null; return { x: s === 'source' ? t.x + TBL_WIDTH - DOT_R - 4 : t.x + DOT_R + 4, y: t.y + TBL_HEADER_H + TBL_PAD + ci * COL_ROW_H + COL_ROW_H / 2 }; }, [tp]);

  const onCD = useCallback(e => { if (e.button === 1 || (e.button === 0 && e.altKey)) { e.preventDefault(); setIsPan(true); ps.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; } if (e.button === 0 && !e.altKey && e.target === e.currentTarget) setSel(null); }, [pan]);
  const onCM = useCallback(e => {
    if (isPan) setPan({ x: ps.current.px + (e.clientX - ps.current.x), y: ps.current.py + (e.clientY - ps.current.y) });
    if (dTbl) { const c = toC(e.clientX, e.clientY); setTp(p => ({ ...p, [dTbl]: { x: c.x - dOff.current.x, y: c.y - dOff.current.y } })); }
    if (dLine) { const c = toC(e.clientX, e.clientY); setDLine(p => ({ ...p, cx: c.x, cy: c.y })); }
  }, [isPan, dTbl, dLine, toC]);
  const onCU = useCallback(() => { setIsPan(false); setDTbl(null); setDLine(null); }, []);
  const onTD = useCallback((e, n) => { e.stopPropagation(); const c = toC(e.clientX, e.clientY); const t = tp[n] || { x: 0, y: 0 }; dOff.current = { x: c.x - t.x, y: c.y - t.y }; setDTbl(n); }, [tp, toC]);

  const onDD = useCallback((e, k, s) => {
    e.stopPropagation(); e.preventDefault();
    const [tn, cn] = k.split('.'); const tbls = s === 'source' ? sourceTables : targetTables;
    const tbl = tbls.find(t => t.tableName === tn); const ci = tbl?.columns?.findIndex(c => c.name === cn) ?? -1;
    const p = dotP(tn, ci, s); if (!p) return;
    setDLine({ fk: k, fs: s, sx: p.x, sy: p.y, cx: p.x, cy: p.y }); setSel(null);
  }, [sourceTables, targetTables, dotP]);
  const toMap = {};
  const onDU = useCallback((e, k, s) => {
    if (!dLine) return; e.stopPropagation();
    // Block mapping to a target column that has a system value
    if (s === 'target' && toMap[k]) { setDLine(null); return; }
    let src, tgt;
    if (dLine.fs === 'source' && s === 'target') { src = dLine.fk; tgt = k; } else if (dLine.fs === 'target' && s === 'source') { src = k; tgt = dLine.fk; } else { setDLine(null); return; }
    if (!mappings.some(m => m.source === src && m.target === tgt)) onMappingsChange([...mappings, { source: src, target: tgt, color: LINE_COLORS[mappings.length % LINE_COLORS.length].key, transforms: [] }]);
    setDLine(null);
  }, [dLine, mappings, onMappingsChange, toMap]);

  const delS = useCallback(() => { if (sel === null) return; onMappingsChange(mappings.filter((_, i) => i !== sel)); setSel(null); }, [sel, mappings, onMappingsChange]);
  useEffect(() => { const h = e => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel !== null) { e.preventDefault(); delS(); } if (e.key === 'Escape') { setSel(null); setSysTarget(null); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [delS, sel]);

  const bz = (x1, y1, x2, y2) => { const d = Math.abs(x2 - x1) * 0.4; return `M${x1},${y1} C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`; };
  const mS = new Set(mappings.filter(m => m.source).map(m => m.source)), mT = new Set(mappings.map(m => m.target));

  mappings.forEach((m, i) => { if (m.targetOnly || !m.source) toMap[m.target] = { mapping: m, idx: i }; });

  const rTbl = (table, side) => {
    const t = tp[table.tableName] || { x: 0, y: 0 }; const iS = side === 'source';
    const hBg = iS ? '#EEEDFE' : '#E1F5EE', hC = iS ? '#3C3489' : '#085041';
    const h = TBL_HEADER_H + TBL_PAD * 2 + (table.columns?.length || 0) * COL_ROW_H;
    return (
      <g key={table.tableName} transform={`translate(${t.x},${t.y})`}>
        <rect width={TBL_WIDTH} height={h} rx={8} fill="#fff" stroke="#E8E8E5" strokeWidth={1} />
        <rect width={TBL_WIDTH} height={TBL_HEADER_H} rx={8} fill={hBg} /><rect y={TBL_HEADER_H - 8} width={TBL_WIDTH} height={8} fill={hBg} />
        <rect width={TBL_WIDTH} height={TBL_HEADER_H} fill="transparent" style={{ cursor: 'grab' }} onMouseDown={e => onTD(e, table.tableName)} />
        <text x={12} y={TBL_HEADER_H / 2 + 4} fill={hC} fontSize="11" fontWeight="500" fontFamily="system-ui">{table.tableName}</text>
        <text x={TBL_WIDTH - 8} y={TBL_HEADER_H / 2 + 4} fill={hC} fontSize="9" textAnchor="end" opacity=".6" fontFamily="system-ui">{table.columns?.length} cols</text>
        {(table.columns || []).map((col, ci) => {
          const k = toKey(table.tableName, col.name);
          const hasRegularMapping = iS ? mS.has(k) : (mT.has(k) && !toMap[k]);
          const hasSysMapping = !iS && toMap[k];
          const hasUdfMapping = !iS && toMap[k]?.mapping?.transforms?.some(t => t.fn === 'UDF');
          const im = hasRegularMapping || hasSysMapping;
          const mp = iS ? mappings.find(m => m.source === k) : mappings.find(m => m.target === k && m.source);
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
                  {/* ⚙ icon — states: default (gray), system active (amber), udf active (purple) */}
                  {!col.primaryKey && !hasRegularMapping && (
                    <g transform={`translate(${TBL_WIDTH - 16},${cy - 5})`}
                      style={{ cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation();
                        if (hasSysMapping) {
                          setSel(toMap[k].idx);
                        } else {
                          setSysTarget({ table: table.tableName, col: col.name });
                        }
                      }}>
                      <rect x={-3} y={-3} width={16} height={16} rx={4}
                        fill={hasUdfMapping ? '#EEEDFE' : hasSysMapping ? '#FEF3C7' : 'transparent'}
                        stroke={hasUdfMapping ? '#534AB7' : hasSysMapping ? '#F59E0B' : 'transparent'} strokeWidth={hasSysMapping || hasUdfMapping ? .8 : 0} />
                      <g fill={hasUdfMapping ? '#534AB7' : hasSysMapping ? '#D97706' : '#9B9B9B'}>
                        <GearIcon />
                      </g>
                    </g>
                  )}
                </>
              )}
              {/* Mapping dot — disabled (dimmed, no interaction) when system value is active */}
              {hasSysMapping ? (
                <circle cx={dx} cy={cy} r={DOT_R} fill="#E8E8E5" stroke="#D4D4D0" strokeWidth={1} style={{ cursor: 'not-allowed' }}
                  onMouseDown={e => { e.stopPropagation(); /* show alert */ }}
                  onMouseUp={e => e.stopPropagation()} />
              ) : (
                <circle cx={dx} cy={cy} r={DOT_R} fill={dc} stroke={dc} strokeWidth={1.5} style={{ cursor: 'crosshair' }}
                  onMouseDown={e => onDD(e, k, side)} onMouseUp={e => onDU(e, k, side)}
                  onMouseEnter={e => e.target.setAttribute('r', String(DOT_R * 1.6))} onMouseLeave={e => e.target.setAttribute('r', String(DOT_R))} />
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const ap = Object.values(tp); const cW = Math.max(1000, ...ap.map(p => (p.x || 0) + TBL_WIDTH + 100)), cH = Math.max(700, ...ap.map(p => (p.y || 0) + 400));

  return (
    <div style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#fff', border: '1px solid #E8E8E5', borderRadius: '8px', padding: '3px 6px' }}>
        <button onClick={() => zBy(0.15)} style={bS} title="Zoom in">+</button>
        <span style={{ color: '#6B6B6B', minWidth: 36, textAlign: 'center', fontSize: '10px' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => zBy(-0.15)} style={bS} title="Zoom out">−</button>
        <span style={{ color: '#E8E8E5', padding: '0 2px' }}>|</span>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={bS} title="Reset view"><ResetIcon /></button>
        <button onClick={doOrg} style={{ ...bS, color: '#534AB7' }} title="Organize"><OrganizeIcon /></button>
      </div>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, fontSize: '10px', color: '#9B9B9B', background: '#fff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #E8E8E5' }}>Alt+drag pan · Ctrl+scroll zoom · Drag headers to move</div>

      {/* Canvas */}
      <div ref={cRef} onMouseDown={onCD} onMouseMove={onCM} onMouseUp={onCU} onWheel={e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zBy(e.deltaY > 0 ? -0.08 : 0.08); } }}
        style={{ width: '100%', height: '70vh', overflow: 'hidden', position: 'relative', border: '1px solid #E8E8E5', borderRadius: '12px', background: '#F7F7F5', cursor: isPan ? 'grabbing' : dTbl ? 'grabbing' : 'default' }}>
        <svg width="100%" height="100%">
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r=".6" fill="#D4D4D0" /></pattern></defs>
            <rect width={cW} height={cH} fill="url(#grid)" />
            {/* Mapping lines — skip target-only */}
            {mappings.map((m, i) => {
              if (m.targetOnly || !m.source) return null;
              const [sT, sC] = m.source.split('.'), [tT, tC] = m.target.split('.'); const st = sourceTables.find(t => t.tableName === sT), tt = targetTables.find(t => t.tableName === tT); const si = st?.columns?.findIndex(c => c.name === sC) ?? -1, ti = tt?.columns?.findIndex(c => c.name === tC) ?? -1; const sp = dotP(sT, si, 'source'), tP = dotP(tT, ti, 'target'); if (!sp || !tP) return null; const lc = getLC(m), isSel = sel === i;
              return (<g key={`${m.source}-${m.target}`}><path d={bz(sp.x, sp.y, tP.x, tP.y)} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} onClick={() => setSel(isSel ? null : i)} /><path d={bz(sp.x, sp.y, tP.x, tP.y)} fill="none" stroke={lc.stroke} strokeWidth={isSel ? 2.5 : 1.5} strokeDasharray={isSel ? 'none' : '5 3'} opacity={isSel ? 1 : 0.45} />{m.transforms?.length > 0 && (() => { const mx = (sp.x + tP.x) / 2, my = (sp.y + tP.y) / 2; const lb = m.transforms.map(t => { if (t.fn === 'UDF') { try { const u = typeof t.args === 'string' ? JSON.parse(t.args) : t.args; return `${u.methodName || 'UDF'} (v${u.version || '1.0'})`; } catch { return 'UDF'; } } return t.fn; }).join('→'); const tw = Math.min(lb.length * 6 + 14, 120); return (<g style={{ cursor: 'pointer' }} onClick={() => { setSel(i); if (onMappingClick) onMappingClick(m, i); }}><rect x={mx - tw / 2} y={my - 7} width={tw} height={14} rx={3} fill={lc.bg} stroke={lc.stroke} strokeWidth={.5} /><text x={mx} y={my + 3} textAnchor="middle" fill={lc.text} fontSize="7" fontFamily="monospace" fontWeight="500">{lb.length > 20 ? lb.slice(0, 19) + '…' : lb}</text></g>); })()}</g>); })}
            {dLine && <path d={bz(dLine.sx, dLine.sy, dLine.cx, dLine.cy)} fill="none" stroke="#534AB7" strokeWidth={2} strokeDasharray="6 4" opacity={.7} />}
            {(sourceTables || []).map(t => rTbl(t, 'source'))}
            {(targetTables || []).map(t => rTbl(t, 'target'))}
          </g>
        </svg>
      </div>

      {/* Selected mapping action bar */}
      {sel !== null && mappings[sel] && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #E8E8E5', padding: '6px 16px', borderRadius: '99px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', fontSize: '12px', zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#6B6B6B' }}>{mappings[sel].targetOnly ? `⚙ ${mappings[sel].target}` : `${mappings[sel].source} → ${mappings[sel].target}`}</span>
          {mappings[sel].transforms?.some(t => t.fn === 'UDF') ? (
            <span style={{ background: '#EEEDFE', color: '#534AB7', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>☕ UDF Pinned</span>
          ) : mappings[sel].targetOnly ? (
            <span style={{ background: '#FEF3C7', color: '#854F0B', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 500 }}>System</span>
          ) : null}
          <span style={{ color: '#D4D4D0' }}>|</span>
          {onMappingClick && <><span style={{ cursor: 'pointer', color: '#534AB7', fontWeight: 500 }} onClick={() => onMappingClick(mappings[sel], sel)}>Transform</span><span style={{ color: '#D4D4D0' }}>|</span></>}
          <span style={{ cursor: 'pointer', color: '#A32D2D', fontWeight: 500 }} onClick={delS}>Remove</span>
          <span style={{ color: '#9B9B9B', fontSize: '10px' }}>(⌫)</span>
        </div>
      )}

      {/* Target column config modal (System value or Java UDF) */}
      {sysTarget && (
        <TargetConfigModal
          colName={sysTarget.col}
          sourceTables={sourceTables}
          onSelectSystem={(fn, args) => {
            if (onAddSystemValue) onAddSystemValue(sysTarget.table, sysTarget.col, fn, args);
          }}
          onSelectUdf={(config, primaryCol) => {
            if (onAddUdf) onAddUdf(sysTarget.table, sysTarget.col, config, primaryCol);
          }}
          onClose={() => setSysTarget(null)}
        />
      )}
    </div>
  );
};

const bS = { background: 'none', border: '1px solid #E8E8E5', borderRadius: '4px', width: 26, height: 26, cursor: 'pointer', fontSize: '14px', color: '#6B6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center' };
export default DragMappingBoard;