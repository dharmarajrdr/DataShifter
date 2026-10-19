/**
 * Layout constants, colors, and helpers for DragMappingBoard (<= 100 lines).
 */
export const LINE_COLORS = [
  { stroke: '#534AB7', bg: '#EEEDFE', text: '#3C3489', key: 'purple' },
  { stroke: '#1D9E75', bg: '#E1F5EE', text: '#085041', key: 'teal' },
  { stroke: '#D85A30', bg: '#FAECE7', text: '#712B13', key: 'coral' },
  { stroke: '#D4537E', bg: '#FBEAF0', text: '#72243E', key: 'pink' },
  { stroke: '#378ADD', bg: '#E6F1FB', text: '#0C447C', key: 'blue' },
];

export const COL_ROW_H = 28;
export const TBL_HEADER_H = 32;
export const TBL_WIDTH = 260;
export const TBL_PAD = 4;
export const DOT_R = 5;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.5;
export const ZOOM_STEP = 0.15;
export const WHEEL_ZOOM_FACTOR = 0.01;

export const toKey = (t, c) => `${t}.${c}`;
export const splitTableCol = (k) => {
  if (!k || typeof k !== 'string') return ['', ''];
  const lastDot = k.lastIndexOf('.');
  return lastDot === -1 ? [k, ''] : [k.slice(0, lastDot), k.slice(lastDot + 1)];
};
export const getLC = (m) => LINE_COLORS.find((c) => c.key === m.color) || LINE_COLORS[0];

export const SYSTEM_VALUES = [
  { fn: 'CURRENT_TIMESTAMP', label: 'Current timestamp', desc: 'System time when row is migrated', icon: 'fa-regular fa-clock' },
  { fn: 'CURRENT_DATE', label: 'Current date', desc: "Today's date (no time)", icon: 'fa-regular fa-calendar' },
  { fn: 'STATIC_VALUE', label: 'Static value', desc: 'Same fixed value for every row (e.g., "STANDARD")', icon: 'fa-solid fa-thumbtack', needsArgs: true, argHint: 'Enter value' },
  { fn: 'UUID', label: 'Generate UUID', desc: 'Unique identifier (UUID v4)', icon: 'fa-solid fa-key' },
  { fn: 'ROW_NUMBER', label: 'Row number', desc: 'Sequential counter (1, 2, 3...)', icon: 'fa-solid fa-hashtag' },
];

export const organize = (src, tgt, w) => {
  const p = {};
  const lx = 40;
  const rx = Math.max(w - TBL_WIDTH - 40, TBL_WIDTH + 200);
  let ly = 40;
  (src || []).forEach((t) => {
    p[t.tableName] = { x: lx, y: ly };
    ly += TBL_HEADER_H + (t.columns?.length || 0) * COL_ROW_H + TBL_PAD * 2 + 24;
  });
  let ry = 40;
  (tgt || []).forEach((t) => {
    p[t.tableName] = { x: rx, y: ry };
    ry += TBL_HEADER_H + (t.columns?.length || 0) * COL_ROW_H + TBL_PAD * 2 + 24;
  });
  return p;
};
