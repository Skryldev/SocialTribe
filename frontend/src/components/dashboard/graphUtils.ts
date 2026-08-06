export function extractNodeIds(nodes: any[]): string[] {
  if (!nodes || nodes.length === 0) return [];
  return nodes.map((node: any) => node.id || node.data?.id || '');
}

export function extractNodeName(nodes: any[], nodeId: string): string {
  if (!nodes) return nodeId;
  const node = nodes.find((n: any) => (n.id || n.data?.id) === nodeId);
  return node?.name || node?.data?.name || nodeId;
}

function getUniqueEdges(edges: any[]): any[] {
  if (!edges || edges.length === 0) return [];
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const e of edges) {
    const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(e);
    }
  }
  return unique;
}

export function buildAdjacencyList(edges: any[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const unique = getUniqueEdges(edges);
  
  for (const edge of unique) {
    const { source, target } = edge;
    if (!source || !target) continue;
    
    if (!adj.has(source)) adj.set(source, new Set());
    if (!adj.has(target)) adj.set(target, new Set());
    adj.get(source)!.add(target);
    adj.get(target)!.add(source);
  }
  return adj;
}

export function buildAdjacencyWithDegree(nodes: any[], edges: any[]): { adj: Map<string, Set<string>>; degrees: Map<string, number> } {
  const adj = buildAdjacencyList(edges);
  const degrees = new Map<string, number>();
  const nodeIds = extractNodeIds(nodes);
  
  nodeIds.forEach((id: string) => {
    degrees.set(id, adj.has(id) ? adj.get(id)!.size : 0);
  });
  
  return { adj, degrees };
}

export function bfs(source: string, adj: Map<string, Set<string>>, maxDistance: number = Infinity): { distances: Map<string, number>; visited: Set<string> } {
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [source];
  
  distances.set(source, 0);
  visited.add(source);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;
    
    if (currentDist >= maxDistance) continue;
    
    const neighbors = adj.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }
  
  return { distances, visited };
}

export function findConnectedComponents(nodes: any[], adj: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  const nodeIds = extractNodeIds(nodes);
  
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId) && adj.has(nodeId)) {
      const { visited: componentVisited } = bfs(nodeId, adj);
      const component = Array.from(componentVisited);
      components.push(component);
      component.forEach((id: string) => visited.add(id));
    }
  }
  
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      components.push([nodeId]);
      visited.add(nodeId);
    }
  }
  
  return components;
}

export function countTriangles(_nodes: any[], edges: any[]): number {
  if (!edges || edges.length === 0) return 0;
  
  const adj = buildAdjacencyList(edges);
  let triangleCount = 0;
  
  const uniqueEdges = getUniqueEdges(edges);
  
  for (const edge of uniqueEdges) {
    const u = edge.source;
    const v = edge.target;
    
    const uNeighbors = adj.get(u) || new Set();
    const vNeighbors = adj.get(v) || new Set();
    
    for (const w of uNeighbors) {
      if (w !== v && vNeighbors.has(w)) {
        triangleCount++;
      }
    }
  }
  
  return Math.round(triangleCount / 3);
}

export function countConnectedTriples(nodes: any[], edges: any[]): number {
  const adj = buildAdjacencyList(edges);
  const nodeIds = extractNodeIds(nodes);
  let tripleCount = 0;
  
  for (const nodeId of nodeIds) {
    const degree = adj.has(nodeId) ? adj.get(nodeId)!.size : 0;
    if (degree >= 2) {
      tripleCount += (degree * (degree - 1)) / 2;
    }
  }
  
  return tripleCount;
}

export function localClusteringCoefficient(nodeId: string, adj: Map<string, Set<string>>): number {
  const neighbors = adj.get(nodeId);
  if (!neighbors || neighbors.size < 2) return 0;
  
  let connections = 0;
  const neighborArray = Array.from(neighbors);
  
  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      const neighborAdj = adj.get(neighborArray[i]);
      if (neighborAdj && neighborAdj.has(neighborArray[j])) {
        connections++;
      }
    }
  }
  
  const maxPossible = (neighbors.size * (neighbors.size - 1)) / 2;
  return maxPossible > 0 ? connections / maxPossible : 0;
}

export function calculateBetweennessCentrality(nodes: any[], edges: any[]): Map<string, number> {
  const adj = buildAdjacencyList(edges);
  const nodeIds = extractNodeIds(nodes);
  const n = nodeIds.length;
  const CB = new Map<string, number>();
  
  nodeIds.forEach((id: string) => CB.set(id, 0));
  if (n < 2) return CB;
  
  for (const s of nodeIds) {
    const S: string[] = [];
    const P = new Map<string, string[]>();
    nodeIds.forEach((id: string) => P.set(id, []));
    
    const sigma = new Map<string, number>();
    nodeIds.forEach((id: string) => sigma.set(id, 0));
    sigma.set(s, 1);
    
    const d = new Map<string, number>();
    nodeIds.forEach((id: string) => d.set(id, -1));
    d.set(s, 0);
    
    const Q = [s];
    
    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);
      
      const neighbors = adj.get(v) || new Set();
      for (const w of neighbors) {
        if (d.get(w)! < 0) {
          Q.push(w);
          d.set(w, d.get(v)! + 1);
        }
        if (d.get(w) === d.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }
    
    const delta = new Map<string, number>();
    nodeIds.forEach((id: string) => delta.set(id, 0));
    
    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P.get(w)!) {
        const ratio = sigma.get(w)! > 0 ? sigma.get(v)! / sigma.get(w)! : 0;
        delta.set(v, delta.get(v)! + ratio * (1 + delta.get(w)!));
      }
      if (w !== s) {
        CB.set(w, CB.get(w)! + delta.get(w)!);
      }
    }
  }
  
  if (n > 2) {
    const norm = 2 / ((n - 1) * (n - 2));
    for (const [node, value] of CB) {
      CB.set(node, value * norm);
    }
  }
  
  return CB;
}

export function calculateClosenessCentrality(nodes: any[], adj: Map<string, Set<string>>, components: string[][]): Map<string, number> {
  const nodeIds = extractNodeIds(nodes);
  const closeness = new Map<string, number>();
  
  nodeIds.forEach((nodeId: string) => {
    const { distances } = bfs(nodeId, adj);
    let sumDistances = 0;
    let reachable = 0;
    
    for (const [target, dist] of distances) {
      if (target !== nodeId && dist > 0 && dist !== Infinity) {
        sumDistances += dist;
        reachable++;
      }
    }
    
    if (sumDistances > 0 && reachable > 0) {
      const component = components.find((c: string[]) => c.includes(nodeId));
      const componentSize = component ? component.length : nodeIds.length;
      
      if (componentSize > 1) {
        const normalized = (reachable / (componentSize - 1)) * (reachable / sumDistances);
        closeness.set(nodeId, Math.min(1, normalized));
      } else {
        closeness.set(nodeId, 0);
      }
    } else {
      closeness.set(nodeId, 0);
    }
  });
  
  return closeness;
}

export function calculateEigenvectorCentrality(nodes: any[], edges: any[], iterations: number = 100): Map<string, number> {
  const adj = buildAdjacencyList(edges);
  const nodeIds = extractNodeIds(nodes);
  const n = nodeIds.length;
  
  if (n === 0) return new Map();
  
  let vector = new Map<string, number>();
  nodeIds.forEach((id: string) => vector.set(id, 1 / Math.sqrt(n)));
  
  for (let iter = 0; iter < iterations; iter++) {
    const newVector = new Map<string, number>();
    let norm = 0;
    
    nodeIds.forEach((nodeId: string) => {
      const neighbors = adj.get(nodeId) || new Set();
      let sum = 0;
      neighbors.forEach((neighbor: string) => {
        sum += vector.get(neighbor) || 0;
      });
      newVector.set(nodeId, sum);
      norm += sum * sum;
    });
    
    norm = Math.sqrt(norm);
    if (norm < 1e-10) break;
    
    nodeIds.forEach((nodeId: string) => {
      vector.set(nodeId, newVector.get(nodeId)! / norm);
    });
  }
  
  return vector;
}

export function calculateAssortativity(nodes: any[], edges: any[]): number {
  if (!edges || edges.length === 0) return 0;
  
  const adj = buildAdjacencyList(edges);
  const nodeIds = extractNodeIds(nodes);
  const degrees = new Map<string, number>();
  
  nodeIds.forEach((id: string) => {
    degrees.set(id, adj.has(id) ? adj.get(id)!.size : 0);
  });
  
  const uniqueEdges = getUniqueEdges(edges);
  if (uniqueEdges.length === 0) return 0;
  
  let sum1 = 0, sum2 = 0, sum3 = 0;
  const M = uniqueEdges.length;
  
  for (const edge of uniqueEdges) {
    const ku = degrees.get(edge.source) || 0;
    const kv = degrees.get(edge.target) || 0;
    sum1 += ku * kv;
    sum2 += ku + kv;
    sum3 += ku * ku + kv * kv;
  }
  
  const mean1 = sum1 / M;
  const mean2 = sum2 / (2 * M);
  const mean3 = sum3 / (2 * M);
  
  const numerator = mean1 - mean2 * mean2;
  const denominator = mean3 - mean2 * mean2;
  
  if (Math.abs(denominator) < 1e-10) return 0;
  return numerator / denominator;
}

export function calculateModularity(nodes: any[], edges: any[]): number {
  if (!edges || edges.length === 0) return 0;
  
  const adj = buildAdjacencyList(edges);
  const nodeIds = extractNodeIds(nodes);
  const uniqueEdges = getUniqueEdges(edges);
  const m = uniqueEdges.length;
  
  if (m === 0) return 0;
  
  const degrees = new Map<string, number>();
  nodeIds.forEach((id: string) => {
    degrees.set(id, adj.has(id) ? adj.get(id)!.size : 0);
  });
  
  const communities = new Map<string, number>();
  nodeIds.forEach((id: string, i: number) => communities.set(id, i));
  
  const calcQ = (comms: Map<string, number>): number => {
    let Q = 0;
    for (const u of nodeIds) {
      for (const v of nodeIds) {
        if (comms.get(u) === comms.get(v)) {
          const neighbors = adj.get(u) || new Set();
          const Auv = neighbors.has(v) ? 1 : 0;
          const ku = degrees.get(u) || 0;
          const kv = degrees.get(v) || 0;
          Q += Auv - (ku * kv) / (2 * m);
        }
      }
    }
    return Q / (2 * m);
  };
  
  let bestQ = calcQ(communities);
  let improved = true;
  let iter = 0;
  
  while (improved && iter < 15) {
    improved = false;
    iter++;
    
    for (const nodeId of nodeIds) {
      const currentComm = communities.get(nodeId)!;
      const neighbors = adj.get(nodeId) || new Set();
      const commWeights = new Map<number, number>();
      
      for (const nb of neighbors) {
        const nbComm = communities.get(nb);
        if (nbComm !== undefined) {
          commWeights.set(nbComm, (commWeights.get(nbComm) || 0) + 1);
        }
      }
      
      let bestComm = currentComm;
      let bestDelta = -Infinity;
      
      for (const [comm, ki_in] of commWeights) {
        if (comm === currentComm) continue;
        
        const ki = degrees.get(nodeId) || 0;
        let sigmaTot = 0;
        for (const id of nodeIds) {
          if (communities.get(id) === comm) sigmaTot += degrees.get(id) || 0;
        }
        
        const deltaQ = ki_in / m - (sigmaTot * ki) / (2 * m * m);
        
        if (deltaQ > bestDelta) {
          bestDelta = deltaQ;
          bestComm = comm;
        }
      }
      
      if (bestComm !== currentComm && bestDelta > 1e-10) {
        communities.set(nodeId, bestComm);
        improved = true;
      }
    }
    
    const currentQ = calcQ(communities);
    if (currentQ > bestQ) bestQ = currentQ;
  }
  
  return Math.max(0, Math.min(1, bestQ));
}

export function simulateRobustness(nodes: any[], edges: any[], removalPercentages: number[] = [0, 5, 10, 20]): any {
  const results: any = {
    removalPercentages,
    largestComponentPercents: [],
    removedNodes: []
  };
  
  if (!nodes || nodes.length === 0) {
    results.largestComponentPercents = removalPercentages.map(() => 100);
    return results;
  }
  
  const adj = buildAdjacencyList(edges);
  const originalSize = nodes.length;
  const nodeIds = extractNodeIds(nodes);
  
  const sortedNodes = [...nodeIds].sort((a: string, b: string) => {
    const degA = adj.has(a) ? adj.get(a)!.size : 0;
    const degB = adj.has(b) ? adj.get(b)!.size : 0;
    return degB - degA;
  });
  
  for (const pct of removalPercentages) {
    if (pct === 0) {
      results.largestComponentPercents.push(100);
      results.removedNodes.push([]);
      continue;
    }
    
    const removeCount = Math.min(Math.floor(originalSize * pct / 100), sortedNodes.length);
    const removedSet = new Set(sortedNodes.slice(0, removeCount));
    results.removedNodes.push(Array.from(removedSet));
    
    if (removedSet.size >= originalSize) {
      results.largestComponentPercents.push(0);
      continue;
    }
    
    const remainingNodes = nodes.filter((n: any) => !removedSet.has(n.id || n.data?.id));
    const remainingEdges = edges.filter((e: any) => !removedSet.has(e.source) && !removedSet.has(e.target));
    
    const newAdj = buildAdjacencyList(remainingEdges);
    const components = findConnectedComponents(remainingNodes, newAdj);
    const largestSize = Math.max(...components.map((c: string[]) => c.length), 0);
    
    results.largestComponentPercents.push(Math.round((largestSize / originalSize) * 10000) / 100);
  }
  
  return results;
}

export function getComponentSizeDistribution(nodes: any[], edges: any[]): { size: number; count: number }[] {
  const adj = buildAdjacencyList(edges);
  const components = findConnectedComponents(nodes, adj);
  
  const sizeCount = new Map<number, number>();
  components.forEach((comp: string[]) => {
    const size = comp.length;
    sizeCount.set(size, (sizeCount.get(size) || 0) + 1);
  });
  
  return Array.from(sizeCount.entries())
    .map(([size, count]: [number, number]) => ({ size, count }))
    .sort((a: { size: number }, b: { size: number }) => a.size - b.size);
}

export function fitPowerLawExponent(nodes: any[], edges: any[]): number | null {
  const adj = buildAdjacencyList(edges);
  const nodeIds = extractNodeIds(nodes);
  
  const degrees: number[] = [];
  nodeIds.forEach((id: string) => {
    const deg = adj.has(id) ? adj.get(id)!.size : 0;
    if (deg > 0) degrees.push(deg);
  });
  
  if (degrees.length < 6) {
    console.log(`Power-law: only ${degrees.length} nodes with degree>0, need ≥6`);
    return null;
  }
  
  const uniqueDegrees = [...new Set(degrees)];
  if (uniqueDegrees.length < 3) {
    console.log('Power-law: need ≥3 unique degree values');
    return null;
  }
  
  const k_min = Math.min(...uniqueDegrees);
  const filtered = degrees.filter((d: number) => d >= k_min);
  
  if (filtered.length < 6) {
    console.log(`Power-law: only ${filtered.length} degrees ≥ ${k_min}, need ≥6`);
    return null;
  }
  
  let sumLog = 0;
  for (const k of filtered) {
    sumLog += Math.log(k / (k_min - 0.5));
  }
  
  if (sumLog <= 0) {
    console.log('Power-law: sum of logs ≤ 0');
    return null;
  }
  
  const alpha = 1 + filtered.length / sumLog;
  
  if (alpha < 1.8 || alpha > 3.5) {
    console.log(`Power-law: α=${alpha.toFixed(3)} outside [1.8, 3.5], not power-law`);
    return null;
  }
  
  return alpha;
}