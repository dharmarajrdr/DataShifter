import { computeClientTopology } from './workflowTopology';

export const CARD_WIDTH = 310;
export const CARD_HEIGHT = 56;
export const TRIGGER_X = 360;
export const TRIGGER_Y = 44;
export const CANVAS_PAD_X = 480;
export const CANVAS_PAD_Y = 320;
export const BASE_SCALE = 0.8;
export const STAGE_X_GAP = 360;
export const STAGE_Y_START = 165;
export const STAGE_Y_GAP = 155;

export function createsCycle(edges = [], sourceId, targetId) {
  if (sourceId === targetId) return true;
  const adj = new Map();
  edges.forEach((e) => {
    if (!adj.has(e.sourcePipelineId)) adj.set(e.sourcePipelineId, []);
    adj.get(e.sourcePipelineId).push(e.targetPipelineId);
  });
  if (!adj.has(sourceId)) adj.set(sourceId, []);
  adj.get(sourceId).push(targetId);
  const visited = new Set();
  const stack = [targetId];
  while (stack.length > 0) {
    const curr = stack.pop();
    if (curr === sourceId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    (adj.get(curr) || []).forEach((nxt) => stack.push(nxt));
  }
  return false;
}

export function layoutDagNodes(nodes = [], edges = []) {
  const topo = computeClientTopology(nodes, edges);
  const levelGroups = new Map();
  const incomingMap = new Map();
  topo.orderedNodes.forEach((n) => {
    const lvl = n.stageLevel ?? 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl).push(n);
    incomingMap.set(n.pipelineId, []);
  });
  (edges || []).forEach((e) => {
    if (incomingMap.has(e.targetPipelineId)) incomingMap.get(e.targetPipelineId).push(e.sourcePipelineId);
  });
  const maxInLvl = Math.max(1, ...Array.from(levelGroups.values()).map((g) => g.length));
  const centerX = Math.max(TRIGGER_X, Math.round(((maxInLvl - 1) * STAGE_X_GAP) / 2) + 60);
  const posMap = new Map();
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((lvl) => {
    const group = levelGroups.get(lvl) || [];
    if (lvl === 0) {
      const count = group.length;
      const startX = centerX - ((count - 1) * STAGE_X_GAP) / 2;
      group.forEach((n, i) => posMap.set(n.pipelineId, {
        positionX: Math.round(startX + i * STAGE_X_GAP),
        positionY: STAGE_Y_START + lvl * STAGE_Y_GAP,
      }));
      return;
    }
    const buckets = new Map();
    group.forEach((n) => {
      const parents = (incomingMap.get(n.pipelineId) || []).filter((p) => posMap.has(p)).sort();
      const sig = parents.length > 0 ? parents.join('|') : `__root_${n.pipelineId}`;
      if (!buckets.has(sig)) buckets.set(sig, { parents, items: [] });
      buckets.get(sig).items.push(n);
    });
    const coords = [];
    buckets.forEach(({ parents, items }) => {
      const anchorX = parents.length > 0
        ? parents.reduce((sum, p) => sum + (posMap.get(p)?.positionX ?? centerX), 0) / parents.length
        : centerX;
      const startX = anchorX - ((items.length - 1) * STAGE_X_GAP) / 2;
      items.forEach((n, idx) => coords.push({ node: n, x: startX + idx * STAGE_X_GAP }));
    });
    coords.sort((a, b) => a.x - b.x);
    for (let i = 1; i < coords.length; i += 1) {
      if (coords[i].x - coords[i - 1].x < STAGE_X_GAP) coords[i].x = coords[i - 1].x + STAGE_X_GAP;
    }
    coords.forEach(({ node, x }) => posMap.set(node.pipelineId, {
      positionX: Math.round(x),
      positionY: STAGE_Y_START + lvl * STAGE_Y_GAP,
    }));
  });
  const allX = Array.from(posMap.values()).map((p) => p.positionX);
  const shiftX = allX.length > 0 && Math.min(...allX) < 32 ? 32 - Math.min(...allX) : 0;
  return topo.orderedNodes.map((n) => {
    const coords = posMap.get(n.pipelineId) || { positionX: TRIGGER_X, positionY: STAGE_Y_START };
    return { ...n, positionX: coords.positionX + shiftX, positionY: coords.positionY };
  });
}
