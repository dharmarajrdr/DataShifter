/**
 * Graph topology analysis for DataShifter DAG workflows.
 */
export function computeClientTopology(nodes = [], edges = []) {
  if (!nodes || nodes.length === 0) {
    return {
      orderedNodes: [],
      chainCount: 0,
      singleChainReady: false,
      validationErrors: ['Workflow must contain at least one pipeline.'],
    };
  }
  const nodeMap = new Map(nodes.map((n) => [n.pipelineId, n]));
  const outgoingMap = new Map();
  const inDegree = new Map();
  nodes.forEach((n) => { outgoingMap.set(n.pipelineId, []); inDegree.set(n.pipelineId, 0); });
  const seenEdges = new Set();
  (edges || []).forEach((e) => {
    const key = `${e.sourcePipelineId}->${e.targetPipelineId}`;
    if (!seenEdges.has(key) && nodeMap.has(e.sourcePipelineId) && nodeMap.has(e.targetPipelineId)) {
      seenEdges.add(key);
      outgoingMap.get(e.sourcePipelineId).push(e.targetPipelineId);
      inDegree.set(e.targetPipelineId, (inDegree.get(e.targetPipelineId) || 0) + 1);
    }
  });
  const nodeCmp = (a, b) => ((a.positionY ?? 0) - (b.positionY ?? 0)) ||
    ((a.positionX ?? 0) - (b.positionX ?? 0)) || String(a.pipelineId).localeCompare(String(b.pipelineId));
  const heads = nodes.filter((n) => (inDegree.get(n.pipelineId) || 0) === 0).sort(nodeCmp);
  const stageLevelMap = new Map();
  heads.forEach((h) => stageLevelMap.set(h.pipelineId, 0));
  const queue = heads.map((h) => h.pipelineId);
  const visited = new Set();
  const rawOrdered = [];

  while (queue.length > 0) {
    const currId = queue.shift();
    if (visited.has(currId)) continue;
    visited.add(currId);
    if (nodeMap.get(currId)) rawOrdered.push(nodeMap.get(currId));
    const currLevel = stageLevelMap.get(currId) ?? 0;
    const neighbors = [...(outgoingMap.get(currId) || [])].sort((a, b) =>
      nodeCmp(nodeMap.get(a) || {}, nodeMap.get(b) || {})
    );
    neighbors.forEach((nbrId) => {
      stageLevelMap.set(nbrId, Math.max(stageLevelMap.get(nbrId) ?? 0, currLevel + 1));
      const deg = (inDegree.get(nbrId) || 1) - 1;
      inDegree.set(nbrId, deg);
      if (deg <= 0 && !visited.has(nbrId)) queue.push(nbrId);
    });
  }

  let extraChains = 0;
  nodes.filter((n) => !visited.has(n.pipelineId)).sort(nodeCmp).forEach((n) => {
    if (!visited.has(n.pipelineId)) {
      extraChains += 1;
      const bfs = [n.pipelineId];
      while (bfs.length > 0) {
        const cid = bfs.shift();
        if (visited.has(cid)) continue;
        visited.add(cid);
        if (!stageLevelMap.has(cid)) stageLevelMap.set(cid, 0);
        if (nodeMap.get(cid)) rawOrdered.push(nodeMap.get(cid));
        (outgoingMap.get(cid) || []).forEach((nbr) => {
          if (!visited.has(nbr)) {
            stageLevelMap.set(nbr, (stageLevelMap.get(cid) ?? 0) + 1);
            bfs.push(nbr);
          }
        });
      }
    }
  });

  const levelGroups = new Map();
  rawOrdered.forEach((n) => {
    const lvl = stageLevelMap.get(n.pipelineId) ?? 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl).push(n);
  });
  levelGroups.forEach((group) => group.sort((a, b) => (a.positionX ?? 0) - (b.positionX ?? 0)));

  const orderedNodes = rawOrdered.map((n, idx) => {
    const lvl = stageLevelMap.get(n.pipelineId) ?? 0;
    const grp = levelGroups.get(lvl) || [n];
    const bIdx = grp.findIndex((item) => item.pipelineId === n.pipelineId);
    const stepLabel = grp.length > 1 ? `${lvl + 1}.${bIdx + 1}` : `${lvl + 1}`;
    return { ...n, stageLevel: lvl, parallelCount: grp.length, parallelIndex: bIdx, stepNumber: stepLabel, topoIndex: idx + 1 };
  });

  const chainCount = heads.length + extraChains;
  const validationErrors = [];
  if (chainCount > 1) validationErrors.push(`Workflow has ${chainCount} disconnected chains.`);
  orderedNodes.forEach((n) => {
    if (['DRAFT', 'NOT_VALIDATED', 'INVALID'].includes(n.pipelineStatus)) {
      validationErrors.push(`Pipeline '${n.pipelineName}' must be VALIDATED${n.validationErrors?.[0] ? `: ${n.validationErrors[0]}` : '.'}`);
    }
  });
  const singleChainReady = nodes.length >= 1 && chainCount === 1 && validationErrors.length === 0;
  return { orderedNodes, chainCount, singleChainReady, validationErrors };
}
