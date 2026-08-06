import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { getFullNetwork } from "./getNodeApi";

interface NetworkContextType {
  users: any[];
  adjacencyList: any;
  loading: boolean;
  error: string | null;
  reloadData: () => Promise<void>;
  loadFromJSON: (jsonData: any) => void;
  getFriends: (userId: string) => string[];
  getUserById: (userId: string) => any;
  shortestPath: (userA: string, userB: string) => string[] | null;
  allDistancesFrom: (userId: string) => any;
  degreeDistribution: any[];
  distanceHistogram: any[];
  connectedComponents: string[][];
  getTopUsers: (limit?: number) => any[];
  stats: any;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [users, setUsers] = useState<any[]>([]);
  const [adjacencyList, setAdjacencyList] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const transformNode = useCallback((node: any) => {
    return {
      id: node.id,
      name: node.data?.name || node.id,
      nodeType: node.data?.nodeType || node.type,
      role: node.data?.role,
      friendCount: node.data?.friendCount || 0,
      avgDistance: node.data?.avgDistance || 0,
      centrality: node.data?.centrality || 0,
      type: node.type,
      position: node.position,
      originalData: node.data
    };
  }, []);

  const loadFromAPI = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const jsonData = await getFullNetwork();
      
      const rawNodes = jsonData.nodes || [];
      const rawEdges = jsonData.edges || [];
      
      const transformedUsers = rawNodes.map(transformNode);
      
      const adj: any = {};
      transformedUsers.forEach(({ id }: any) => {
        adj[id] = [];
      });
      
      rawEdges.forEach((edge: any) => {
        const source = edge.source;
        const target = edge.target;
        
        if (!adj.hasOwnProperty(source) || !adj.hasOwnProperty(target)) {
          console.warn(`Skipping edge: ${source} → ${target} (one or both nodes not found)`);
          return;
        }
        
        if (!adj[source].includes(target)) {
          adj[source].push(target);
        }
        if (!adj[target].includes(source)) {
          adj[target].push(source);
        }
      });
      
      setUsers(transformedUsers);
      setAdjacencyList(adj);
      setLoading(false);
      
    } catch (err: any) {
      console.error('Error loading network data:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [transformNode]);

  useEffect(() => {
    loadFromAPI();
  }, [loadFromAPI]);

  const reloadData = useCallback(() => {
    return loadFromAPI();
  }, [loadFromAPI]);

  const loadFromJSON = useCallback((jsonData: any) => {
    try {
      let rawUsers: any[] = [];
      let rawEdges: any[] = [];
      
      if (jsonData.nodes && jsonData.edges) {
        rawUsers = jsonData.nodes.map(transformNode);
        rawEdges = jsonData.edges;
      } else if (jsonData.users && jsonData.edges) {
        rawUsers = jsonData.users;
        rawEdges = jsonData.edges;
      } else if (jsonData.nodes && jsonData.links) {
        rawUsers = jsonData.nodes;
        rawEdges = jsonData.links.map((l: any) => [l.source, l.target]);
      } else {
        throw new Error("Unsupported JSON format");
      }
      
      const adj: any = {};
      rawUsers.forEach(({ id }: any) => {
        adj[id] = [];
      });
      
      const edgesArray = Array.isArray(rawEdges[0]) ? rawEdges : rawEdges.map((edge: any) => [edge.source, edge.target]);

      edgesArray.forEach(([a, b]: [string, string]) => {
        if (!adj.hasOwnProperty(a) || !adj.hasOwnProperty(b)) {
          console.warn(`Skipping edge: ${a} → ${b} (one or both nodes not found)`);
          return;
        }
        if (!adj[a].includes(b)) adj[a].push(b);
        if (!adj[b].includes(a)) adj[b].push(a);
      });
      
      setUsers(rawUsers);
      setAdjacencyList(adj);
      setError(null);
    } catch (err: any) {
      console.error('Error loading JSON:', err);
      setError(err.message);
    }
  }, [transformNode]);

  const getFriends = useCallback(
    (userId: string) => adjacencyList[userId] ?? [],
    [adjacencyList]
  );

  const getUserById = useCallback(
    (userId: string) => {
      return users.find((user: any) => user.id === userId);
    },
    [users]
  );

  const shortestPath = useCallback(
    (userA: string, userB: string) => {
      if (userA === userB) return [userA];
      if (!adjacencyList[userA] || !adjacencyList[userB]) return null;

      const visited = new Set<string>([userA]);
      const queue: [string, string[]][] = [[userA, [userA]]];

      while (queue.length) {
        const [current, path] = queue.shift()!;
        for (const neighbor of adjacencyList[current] ?? []) {
          if (neighbor === userB) return [...path, neighbor];
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push([neighbor, [...path, neighbor]]);
          }
        }
      }
      return null;
    },
    [adjacencyList]
  );

  const allDistancesFrom = useCallback(
    (userId: string) => {
      if (!adjacencyList[userId]) return {};
      const dist: any = { [userId]: 0 };
      const queue = [userId];

      while (queue.length) {
        const current = queue.shift()!;
        for (const neighbor of adjacencyList[current] ?? []) {
          if (!(neighbor in dist)) {
            dist[neighbor] = dist[current] + 1;
            queue.push(neighbor);
          }
        }
      }
      return dist;
    },
    [adjacencyList]
  );

  const degreeDistribution = useMemo(() => {
    const counts: any = {};
    users.forEach(({ id }: any) => {
      const deg = (adjacencyList[id] ?? []).length;
      counts[deg] = (counts[deg] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([degree, count]: [string, any]) => ({
        degree: Number(degree),
        count,
        percentage: users.length ? ((count / users.length) * 100).toFixed(1) : 0,
      }))
      .sort((a: any, b: any) => a.degree - b.degree);
  }, [users, adjacencyList]);

  const distanceHistogram = useMemo(() => {
    if (!users.length) return [];

    const MAX_SOURCES = Math.min(users.length, 100);
    const sources =
      users.length <= MAX_SOURCES
        ? users
        : users.filter((_: any, i: number) => i % Math.floor(users.length / MAX_SOURCES) === 0).slice(0, MAX_SOURCES);

    const freq: any = {};
    sources.forEach(({ id }: any) => {
      const dists: any = {};
      const visited = new Set<string>([id]);
      const queue = [id];
      dists[id] = 0;
      while (queue.length) {
        const cur = queue.shift()!;
        for (const nb of adjacencyList[cur] ?? []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            dists[nb] = dists[cur] + 1;
            queue.push(nb);
          }
        }
      }
      Object.values(dists).forEach((d: any) => {
        if (d > 0) freq[d] = (freq[d] ?? 0) + 1;
      });
    });

    return Object.entries(freq)
      .map(([length, count]: [string, any]) => ({ length: Number(length), count }))
      .sort((a: any, b: any) => a.length - b.length);
  }, [users, adjacencyList]);

  const connectedComponents = useMemo(() => {
    if (!users.length) return [];
    
    const parent: any = {};
    const rank: any = {};
    users.forEach(({ id }: any) => {
      parent[id] = id;
      rank[id] = 0;
    });

    function find(x: string): string {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }
    
    function union(x: string, y: string): void {
      const px = find(x);
      const py = find(y);
      if (px === py) return;
      if (rank[px] < rank[py]) parent[px] = py;
      else if (rank[px] > rank[py]) parent[py] = px;
      else { parent[py] = px; rank[px]++; }
    }

    users.forEach(({ id }: any) => {
      (adjacencyList[id] ?? []).forEach((nb: string) => union(id, nb));
    });

    const components: any = {};
    users.forEach(({ id }: any) => {
      const root = find(id);
      if (!components[root]) components[root] = [];
      components[root].push(id);
    });

    return Object.values(components).sort((a: any, b: any) => b.length - a.length);
  }, [users, adjacencyList]);

  const stats = useMemo(() => {
    const n = users.length;
    if (!n) return { totalUsers: 0, totalEdges: 0, avgDegree: 0, density: 0, diameter: 0 };

    const totalDegree = users.reduce((sum: number, { id }: any) => sum + (adjacencyList[id]?.length ?? 0), 0);
    const totalEdges = Math.round(totalDegree / 2);
    const avgDegree = totalDegree / n;
    const maxPossibleEdges = n > 1 ? (n * (n - 1)) / 2 : 1;
    const density = totalEdges / maxPossibleEdges;

    const maxDist = distanceHistogram.length
      ? distanceHistogram[distanceHistogram.length - 1].length
      : 0;

    return {
      totalUsers: n,
      totalEdges,
      avgDegree: avgDegree.toFixed(2),
      density: density.toFixed(2),
      diameter: maxDist,
    };
  }, [users, adjacencyList, distanceHistogram]);

  const getTopUsers = useCallback(
    (limit: number = 10) => {
      return [...users]
        .map((u: any) => ({
          ...u,
          degree: (adjacencyList[u.id] ?? []).length,
        }))
        .sort((a: any, b: any) => b.degree - a.degree)
        .slice(0, limit)
        .map((u: any, i: number) => ({
          ...u,
          rank: i + 1,
          percentage: users.length
            ? ((u.degree / users.length) * 100).toFixed(1)
            : 0,
        }));
    },
    [users, adjacencyList]
  );

  const value = useMemo(
    () => ({
      users,
      adjacencyList,
      loading,
      error,
      reloadData,
      loadFromJSON,
      getFriends,
      getUserById,
      shortestPath,
      allDistancesFrom,
      degreeDistribution,
      distanceHistogram,
      connectedComponents,
      getTopUsers,
      stats,
    }),
    [
      users,
      adjacencyList,
      loading,
      error,
      reloadData,
      loadFromJSON,
      getFriends,
      getUserById,
      shortestPath,
      allDistancesFrom,
      degreeDistribution,
      distanceHistogram,
      connectedComponents,
      getTopUsers,
      stats,
    ]
  );

  return (
    <NetworkContext.Provider value={value as any}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used inside <NetworkProvider>");
  return ctx;
}

export default NetworkContext;