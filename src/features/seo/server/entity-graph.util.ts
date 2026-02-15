/**
 * ============================================================================
 * MODULE  : seo/entity-graph.util.ts
 * PURPOSE : SEO entity knowledge-graph algorithms — DFS cycle detection,
 *           Tarjan's SCC, BFS shortest path, reachable-node analysis
 * PATTERN : Framework-agnostic, pure functions, no side-effects
 * ============================================================================
 */

import type {
  SeoEntityEdge,
  GraphAnalysis,
  ShortestPath,
} from '../types';

/* ========================================================================== */
/*  SECTION 1 — Adjacency List Builder                                        */
/* ========================================================================== */

export type AdjacencyList = Map<string, { target: string; weight: number }[]>;

/** Build a directed adjacency list from entity edges. */
export function buildAdjacencyList(edges: SeoEntityEdge[]): AdjacencyList {
  const adj: AdjacencyList = new Map();
  for (const edge of edges) {
    if (!adj.has(edge.fromId)) adj.set(edge.fromId, []);
    adj.get(edge.fromId)!.push({ target: edge.toId, weight: edge.weight });
    // Ensure target node exists in map even if it has no outgoing edges
    if (!adj.has(edge.toId)) adj.set(edge.toId, []);
  }
  return adj;
}

/** Collect all unique node IDs from edges. */
export function collectNodes(edges: SeoEntityEdge[]): Set<string> {
  const nodes = new Set<string>();
  for (const edge of edges) {
    nodes.add(edge.fromId);
    nodes.add(edge.toId);
  }
  return nodes;
}

/* ========================================================================== */
/*  SECTION 2 — DFS Cycle Detection                                           */
/* ========================================================================== */

/**
 * Detect all cycles in a directed graph using iterative DFS with a
 * recursion-stack colour scheme.
 *
 * WHITE = unvisited, GREY = in current DFS path, BLACK = fully explored.
 */
export function detectCycles(edges: SeoEntityEdge[]): string[][] {
  const adj = buildAdjacencyList(edges);
  const nodes = collectNodes(edges);

  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;

  const colour = new Map<string, number>();
  for (const node of nodes) colour.set(node, WHITE);

  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  for (const startNode of nodes) {
    if (colour.get(startNode) !== WHITE) continue;

    // Iterative DFS
    const stack: { node: string; neighbourIdx: number }[] = [
      { node: startNode, neighbourIdx: 0 },
    ];
    colour.set(startNode, GREY);
    parent.set(startNode, null);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbours = adj.get(top.node) ?? [];

      if (top.neighbourIdx < neighbours.length) {
        const neighbour = neighbours[top.neighbourIdx].target;
        top.neighbourIdx++;

        const nColour = colour.get(neighbour) ?? WHITE;
        if (nColour === WHITE) {
          colour.set(neighbour, GREY);
          parent.set(neighbour, top.node);
          stack.push({ node: neighbour, neighbourIdx: 0 });
        } else if (nColour === GREY) {
          // Back-edge found — extract cycle
          const cycle: string[] = [neighbour];
          let current = top.node;
          while (current !== neighbour) {
            cycle.push(current);
            current = parent.get(current)!;
          }
          cycle.push(neighbour);
          cycle.reverse();
          cycles.push(cycle);
        }
      } else {
        colour.set(top.node, BLACK);
        stack.pop();
      }
    }
  }

  return cycles;
}

/* ========================================================================== */
/*  SECTION 3 — Edge Validation (Cycle Prevention)                            */
/* ========================================================================== */

/**
 * Validate whether adding a new edge would create a cycle.
 * Returns `true` if the edge is safe (no cycle), `false` if it would cause one.
 */
export function validateEdgeCreation(
  existingEdges: SeoEntityEdge[],
  fromId: string,
  toId: string,
): boolean {
  // Self-loop is always a cycle
  if (fromId === toId) return false;

  // Build adjacency including the proposed edge
  const adj = buildAdjacencyList(existingEdges);
  if (!adj.has(fromId)) adj.set(fromId, []);
  adj.get(fromId)!.push({ target: toId, weight: 0 });
  if (!adj.has(toId)) adj.set(toId, []);

  // Check if toId can reach fromId (which would mean a cycle)
  const visited = new Set<string>();
  const queue: string[] = [toId];
  visited.add(toId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === fromId) return false; // cycle detected

    const neighbours = adj.get(current) ?? [];
    for (const { target } of neighbours) {
      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }

  return true;
}

/* ========================================================================== */
/*  SECTION 4 — BFS Shortest Path                                             */
/* ========================================================================== */

/** Find the shortest path (fewest hops) between two nodes using BFS. */
export function findShortestPath(
  edges: SeoEntityEdge[],
  fromId: string,
  toId: string,
): ShortestPath {
  if (fromId === toId) {
    return { path: [fromId], distance: 0, found: true };
  }

  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: string[] = [fromId];
  visited.add(fromId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbours = adj.get(current) ?? [];

    for (const { target } of neighbours) {
      if (visited.has(target)) continue;
      visited.add(target);
      parent.set(target, current);

      if (target === toId) {
        // Reconstruct path
        const path: string[] = [toId];
        let node = toId;
        while (parent.has(node)) {
          node = parent.get(node)!;
          path.push(node);
        }
        path.reverse();
        return { path, distance: path.length - 1, found: true };
      }

      queue.push(target);
    }
  }

  return { path: [], distance: -1, found: false };
}

/* ========================================================================== */
/*  SECTION 5 — Reachable Nodes                                               */
/* ========================================================================== */

/** Get all nodes reachable from a given start node (BFS). */
export function getReachableNodes(
  edges: SeoEntityEdge[],
  startId: string,
): Set<string> {
  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const queue: string[] = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbours = adj.get(current) ?? [];
    for (const { target } of neighbours) {
      if (!visited.has(target)) {
        visited.add(target);
        queue.push(target);
      }
    }
  }

  return visited;
}

/* ========================================================================== */
/*  SECTION 6 — Tarjan's Algorithm (Strongly Connected Components)            */
/* ========================================================================== */

/**
 * Find all Strongly Connected Components using Tarjan's algorithm (iterative).
 */
export function findStronglyConnectedComponents(
  edges: SeoEntityEdge[],
): string[][] {
  const adj = buildAdjacencyList(edges);
  const nodes = collectNodes(edges);

  let index = 0;
  const nodeIndex = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Iterative Tarjan's using an explicit call stack
  type Frame = {
    node: string;
    neighbourIdx: number;
    neighbours: string[];
  };

  for (const node of nodes) {
    if (nodeIndex.has(node)) continue;

    const callStack: Frame[] = [];

    // Initialize start node
    nodeIndex.set(node, index);
    lowLink.set(node, index);
    index++;
    onStack.add(node);
    stack.push(node);

    const startNeighbours = (adj.get(node) ?? []).map((n) => n.target);
    callStack.push({ node, neighbourIdx: 0, neighbours: startNeighbours });

    while (callStack.length > 0) {
      const frame = callStack[callStack.length - 1];

      if (frame.neighbourIdx < frame.neighbours.length) {
        const w = frame.neighbours[frame.neighbourIdx];
        frame.neighbourIdx++;

        if (!nodeIndex.has(w)) {
          // Not yet visited — "recurse"
          nodeIndex.set(w, index);
          lowLink.set(w, index);
          index++;
          onStack.add(w);
          stack.push(w);

          const wNeighbours = (adj.get(w) ?? []).map((n) => n.target);
          callStack.push({ node: w, neighbourIdx: 0, neighbours: wNeighbours });
        } else if (onStack.has(w)) {
          // Back edge
          lowLink.set(
            frame.node,
            Math.min(lowLink.get(frame.node)!, nodeIndex.get(w)!),
          );
        }
      } else {
        // All neighbours processed — check if this is an SCC root
        if (lowLink.get(frame.node) === nodeIndex.get(frame.node)) {
          const scc: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            scc.push(w);
          } while (w !== frame.node);
          sccs.push(scc);
        }

        // "Return" from recursion — propagate lowLink to parent
        callStack.pop();
        if (callStack.length > 0) {
          const parentFrame = callStack[callStack.length - 1];
          lowLink.set(
            parentFrame.node,
            Math.min(
              lowLink.get(parentFrame.node)!,
              lowLink.get(frame.node)!,
            ),
          );
        }
      }
    }
  }

  return sccs;
}

/* ========================================================================== */
/*  SECTION 7 — Full Graph Analysis                                           */
/* ========================================================================== */

/** Run comprehensive graph analysis: cycles, SCCs, stats. */
export function analyzeGraph(edges: SeoEntityEdge[]): GraphAnalysis {
  const cycles = detectCycles(edges);
  const sccs = findStronglyConnectedComponents(edges);
  const nodes = collectNodes(edges);

  return {
    hasCycles: cycles.length > 0,
    cycles,
    stronglyConnectedComponents: sccs.filter((scc) => scc.length > 1),
    nodeCount: nodes.size,
    edgeCount: edges.length,
  };
}

/* ========================================================================== */
/*  SECTION 8 — Weighted Shortest Path (Dijkstra)                             */
/* ========================================================================== */

/**
 * Find the shortest weighted path using Dijkstra's algorithm.
 * Uses edge weights for distance calculation.
 */
export function findWeightedShortestPath(
  edges: SeoEntityEdge[],
  fromId: string,
  toId: string,
): ShortestPath {
  if (fromId === toId) {
    return { path: [fromId], distance: 0, found: true };
  }

  const adj = buildAdjacencyList(edges);
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  // Initialize distances
  const nodes = collectNodes(edges);
  for (const node of nodes) dist.set(node, Infinity);
  dist.set(fromId, 0);

  // Simple priority queue via sorted array (sufficient for SEO-scale graphs)
  const pq: { node: string; dist: number }[] = [{ node: fromId, dist: 0 }];

  while (pq.length > 0) {
    // Extract min
    pq.sort((a, b) => a.dist - b.dist);
    const { node: current, dist: currentDist } = pq.shift()!;

    if (visited.has(current)) continue;
    visited.add(current);

    if (current === toId) {
      // Reconstruct path
      const path: string[] = [toId];
      let node = toId;
      while (prev.has(node)) {
        node = prev.get(node)!;
        path.push(node);
      }
      path.reverse();
      return { path, distance: currentDist, found: true };
    }

    const neighbours = adj.get(current) ?? [];
    for (const { target, weight } of neighbours) {
      const newDist = currentDist + weight;
      if (newDist < (dist.get(target) ?? Infinity)) {
        dist.set(target, newDist);
        prev.set(target, current);
        pq.push({ node: target, dist: newDist });
      }
    }
  }

  return { path: [], distance: -1, found: false };
}

/* ========================================================================== */
/*  SECTION 9 — Node Degree Analysis                                          */
/* ========================================================================== */

/** Calculate in-degree and out-degree for all nodes. */
export function computeNodeDegrees(
  edges: SeoEntityEdge[],
): Map<string, { inDegree: number; outDegree: number }> {
  const degrees = new Map<string, { inDegree: number; outDegree: number }>();
  const nodes = collectNodes(edges);

  for (const node of nodes) {
    degrees.set(node, { inDegree: 0, outDegree: 0 });
  }

  for (const edge of edges) {
    degrees.get(edge.fromId)!.outDegree++;
    degrees.get(edge.toId)!.inDegree++;
  }

  return degrees;
}

/** Find hub nodes (high out-degree) and authority nodes (high in-degree). */
export function findHubsAndAuthorities(
  edges: SeoEntityEdge[],
  topN: number = 10,
): { hubs: { id: string; outDegree: number }[]; authorities: { id: string; inDegree: number }[] } {
  const degrees = computeNodeDegrees(edges);

  const hubs = Array.from(degrees.entries())
    .map(([id, d]) => ({ id, outDegree: d.outDegree }))
    .sort((a, b) => b.outDegree - a.outDegree)
    .slice(0, topN);

  const authorities = Array.from(degrees.entries())
    .map(([id, d]) => ({ id, inDegree: d.inDegree }))
    .sort((a, b) => b.inDegree - a.inDegree)
    .slice(0, topN);

  return { hubs, authorities };
}
