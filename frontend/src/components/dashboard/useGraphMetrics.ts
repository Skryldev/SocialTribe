import { useMemo } from 'react';
import {
  buildAdjacencyList,
  countTriangles,
  countConnectedTriples,
  localClusteringCoefficient,
  calculateBetweennessCentrality,
  calculateClosenessCentrality,
  calculateEigenvectorCentrality,
  calculateAssortativity,
  calculateModularity,
  simulateRobustness,
  getComponentSizeDistribution,
  fitPowerLawExponent,
  findConnectedComponents
} from './graphUtils.js';

export function useClustering(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        globalClusteringCoefficient: 0,
        averageLocalClusteringCoefficient: 0,
        clusteringVsDegree: []
      };
    }

    const adj = buildAdjacencyList(edges);
    
    const triangles = countTriangles(nodes, edges);
    const triples = countConnectedTriples(nodes, edges);
    const globalCC = triples > 0 ? (3 * triangles) / triples : 0;
    
    let sumLocalCC = 0;
    const clusteringVsDegree: any[] = [];
    
    nodes.forEach((node: any) => {
      const lcc = localClusteringCoefficient(node.id, adj);
      const degree = adj.has(node.id) ? adj.get(node.id)!.size : 0;
      
      sumLocalCC += lcc;
      clusteringVsDegree.push({
        degree,
        clustering: lcc
      });
    });
    
    const averageLocalCC = nodes.length > 0 ? sumLocalCC / nodes.length : 0;
    
    return {
      globalClusteringCoefficient: globalCC,
      averageLocalClusteringCoefficient: averageLocalCC,
      clusteringVsDegree
    };
  }, [nodes, edges]);
}

export function useCentrality(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        betweenness: [],
        closeness: [],
        eigenvector: []
      };
    }

    const adj = buildAdjacencyList(edges);
    const components = findConnectedComponents(nodes, adj);
    
    const betweennessMap = calculateBetweennessCentrality(nodes, edges);
    const betweenness = Array.from(betweennessMap.entries())
      .map(([id, value]: [string, number]) => {
        const node = nodes.find((n: any) => n.id === id);
        return {
          id,
          name: node ? node.name : id,
          value
        };
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);
    
    const closenessMap = calculateClosenessCentrality(nodes, adj, components);
    const closeness = Array.from(closenessMap.entries())
      .map(([id, value]: [string, number]) => {
        const node = nodes.find((n: any) => n.id === id);
        return {
          id,
          name: node ? node.name : id,
          value
        };
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);
    
    const eigenvectorMap = calculateEigenvectorCentrality(nodes, edges);
    const eigenvector = Array.from(eigenvectorMap.entries())
      .map(([id, value]: [string, number]) => {
        const node = nodes.find((n: any) => n.id === id);
        return {
          id,
          name: node ? node.name : id,
          value
        };
      })
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 5);
    
    return { betweenness, closeness, eigenvector };
  }, [nodes, edges]);
}

export function useAssortativity(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        coefficient: 0,
        interpretation: 'Neutral (≈0)',
        type: 'neutral'
      };
    }

    const coefficient = calculateAssortativity(nodes, edges);
    
    let interpretation: string, type: string;
    if (coefficient > 0.05) {
      interpretation = 'Assortative (>0)';
      type = 'assortative';
    } else if (coefficient < -0.05) {
      interpretation = 'Disassortative (<0)';
      type = 'disassortative';
    } else {
      interpretation = 'Neutral (≈0)';
      type = 'neutral';
    }
    
    return { coefficient, interpretation, type };
  }, [nodes, edges]);
}

export function useModularity(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        modularity: 0,
        interpretation: 'Weak (<0.3)',
        strength: 'weak'
      };
    }

    const modularity = calculateModularity(nodes, edges);
    
    let interpretation: string, strength: string;
    if (modularity < 0.3) {
      interpretation = 'Weak (<0.3)';
      strength = 'weak';
    } else if (modularity <= 0.6) {
      interpretation = 'Moderate (0.3-0.6)';
      strength = 'moderate';
    } else {
      interpretation = 'Strong (>0.6)';
      strength = 'strong';
    }
    
    return { modularity, interpretation, strength };
  }, [nodes, edges]);
}

export function useRobustness(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return {
        removalPercentages: [0, 5, 10, 20],
        largestComponentPercents: [100, 100, 100, 100]
      };
    }

    const result = simulateRobustness(nodes, edges);
    return {
      removalPercentages: result.removalPercentages,
      largestComponentPercents: result.largestComponentPercents
    };
  }, [nodes, edges]);
}

export function useComponentDistribution(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return [];
    }

    return getComponentSizeDistribution(nodes, edges);
  }, [nodes, edges]);
}

export function usePowerLawExponent(nodes: any[], edges: any[]): any {
  return useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return null;
    }

    return fitPowerLawExponent(nodes, edges);
  }, [nodes, edges]);
}