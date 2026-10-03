// Layout only: positions never create, remove or imply research relationships.
export const NODE_W = 244, NODE_H = 94, COL = 336, ROW = 120;

export function studiesForComponent(studies, componentId) {
  return studies.filter(s => s.component_id === componentId || s.component_ids?.includes(componentId));
}

export function selectStudy(studies, componentId, requestedId) {
  const choices = studiesForComponent(studies, componentId);
  return choices.find(s => s.id === requestedId) || choices[0];
}

export function selectOperation(operations, edges, componentId, requestedId) {
  const requested = operations.find(o => o.id === requestedId);
  if (requested) return requested;
  const matching = operations.filter(o => o.component_id === componentId || o.component_ids?.includes(componentId));
  const choices = matching.length ? matching : operations;
  return choices.find(o => edges.some(e => e.from === o.id) && !edges.some(e => e.to === o.id)) || choices[0] || null;
}

export function componentLayout(focus, nodes, edges) {
  const parents = edges.filter(e => e.to === focus);
  const children = edges.filter(e => e.from === focus);
  const ids = new Set([focus, ...parents.map(e => e.from), ...children.map(e => e.to)]);
  // A wide first layer fans out on both sides of the product, keeping the full
  // rack readable. Subsequent neighborhoods retain a left-to-right hierarchy.
  if (!parents.length && children.length > 6) {
    const half = Math.ceil(children.length / 2), height = half * ROW;
    const positions = new Map([[focus, {x: COL + 50, y: height / 2 - NODE_H / 2}]]);
    children.forEach((e, i) => positions.set(e.to, {x: i < half ? 50 : COL * 2 + 50, y: (i % half) * ROW + 13}));
    return {nodes: [...ids].map(id => ({...nodes.get(id), ...positions.get(id)})),
            edges: children.map((e,i) => ({...e, mirrored: i < half})), width: COL * 2 + NODE_W + 120, height: height + 26};
  }
  const x = parents.length ? COL + 50 : 50;
  const height = Math.max(parents.length, children.length, 1) * ROW;
  const positions = new Map([[focus, {x, y: height / 2 - NODE_H / 2}]]);
  parents.forEach((e, i) => positions.set(e.from, {x: 50, y: (height - parents.length * ROW) / 2 + i * ROW + 13}));
  children.forEach((e, i) => positions.set(e.to, {x: x + COL, y: (height - children.length * ROW) / 2 + i * ROW + 13}));
  return {nodes: [...ids].map(id => ({...nodes.get(id), ...positions.get(id)})).filter(n => n.id),
          edges: [...parents, ...children], width: x + COL + NODE_W + 70, height: height + 26};
}

export function processLayout(operations, recordedEdges) {
  const byId = new Map(operations.map(o => [o.id, o]));
  const edges = recordedEdges.filter(e => byId.has(e.from) && byId.has(e.to));
  const adjacency = new Map(operations.map(o => [o.id, []]));
  edges.forEach(e => adjacency.get(e.from).push(e.to));
  // Condense strongly connected components so repair loops do not break ranking.
  let nextIndex = 0; const indices = new Map(), low = new Map(), stack = [], onStack = new Set(), groups = [];
  function visit(id) {
    indices.set(id, nextIndex); low.set(id, nextIndex++); stack.push(id); onStack.add(id);
    for (const to of adjacency.get(id)) {
      if (!indices.has(to)) { visit(to); low.set(id, Math.min(low.get(id), low.get(to))); }
      else if (onStack.has(to)) low.set(id, Math.min(low.get(id), indices.get(to)));
    }
    if (low.get(id) === indices.get(id)) {
      const group = []; let item;
      do { item = stack.pop(); onStack.delete(item); group.push(item); } while (item !== id);
      groups.push(group.reverse());
    }
  }
  operations.forEach(o => { if (!indices.has(o.id)) visit(o.id); });
  const groupOf = new Map(); groups.forEach((g, i) => g.forEach(id => groupOf.set(id, i)));
  const successors = groups.map(() => new Set()), degree = groups.map(() => 0), rank = groups.map(() => 0);
  for (const e of edges) { const a = groupOf.get(e.from), b = groupOf.get(e.to); if (a !== b && !successors[a].has(b)) {successors[a].add(b); degree[b]++;} }
  const queue = degree.flatMap((d, i) => d ? [] : [i]);
  for (let k = 0; k < queue.length; k++) for (const b of successors[queue[k]]) {rank[b] = Math.max(rank[b], rank[queue[k]] + 1); if (!--degree[b]) queue.push(b);}
  const connected = new Set(edges.flatMap(e => [e.from, e.to]));
  const columns = new Map();
  operations.filter(o => connected.has(o.id)).forEach(o => {const r = rank[groupOf.get(o.id)]; if (!columns.has(r)) columns.set(r, []); columns.get(r).push(o);});
  const positions = [], connectedHeight = Math.max(0, ...[...columns.values()].map(c => c.length * ROW));
  for (const [r, list] of columns) list.forEach((o, i) => positions.push({...o, x: 50 + r * COL, y: 60 + i * ROW}));
  const loose = operations.filter(o => !connected.has(o.id));
  const looseY = connectedHeight ? connectedHeight + 170 : 75;
  loose.forEach((o, i) => positions.push({...o, x: 50 + (i % 3) * COL, y: looseY + Math.floor(i / 3) * ROW}));
  return {nodes: positions, edges, labels: loose.length ? [{x: 50, y: looseY - 34, text: 'Order not established · these records have no asserted connections'}] : [],
          width: Math.max(700, ...positions.map(p => p.x + NODE_W + 80)),
          height: Math.max(350, ...positions.map(p => p.y + NODE_H + 70))};
}

export function edgePath(a, b, index = 0, mirrored = false) {
  if (mirrored) {
    const x1 = a.x, y1 = a.y + NODE_H / 2, x2 = b.x + NODE_W, y2 = b.y + NODE_H / 2, mid = (x1+x2)/2;
    return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
  }
  const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2, x2 = b.x, y2 = b.y + NODE_H / 2;
  if (x2 > x1) return `M${x1},${y1} C${x1 + (x2 - x1) / 2},${y1} ${x2 - (x2 - x1) / 2},${y2} ${x2},${y2}`;
  const loopY = Math.max(a.y, b.y) + NODE_H + 24 + (index % 4) * 12;
  return `M${x1},${y1} C${x1+30},${y1} ${x1+30},${loopY} ${x1},${loopY} L${x2-24},${loopY} Q${x2-40},${loopY} ${x2-40},${y2} L${x2},${y2}`;
}
