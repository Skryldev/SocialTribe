interface NodePosition {
  id: string;
  position: {
    x: number;
    y: number;
  };
}

interface Handles {
  sourceHandle: string;
  targetHandle: string;
}

export function getBestHandles(sourceNode: NodePosition, targetNode: NodePosition): Handles {
  if (!sourceNode?.position || !targetNode?.position) {
    return { sourceHandle: 'bottom-src', targetHandle: 'top-tgt' };
  }

  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  let sourceHandle: string, targetHandle: string;

  if (absDx > absDy) {
    if (dx > 0) {
      sourceHandle = 'right-src';
      targetHandle = 'left-tgt';
    } else {
      sourceHandle = 'left-src';
      targetHandle = 'right-tgt';
    }
  } else {
    if (dy > 0) {
      sourceHandle = 'bottom-src';
      targetHandle = 'top-tgt';
    } else {
      sourceHandle = 'top-src';
      targetHandle = 'bottom-tgt';
    }
  }

  return { sourceHandle, targetHandle };
}

export function processBackendEdges(edges: any[], nodes: any[]): any[] {
  if (!edges?.length || !nodes?.length) return edges ?? [];

  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  return edges.map((edge: any) => {
    if (edge.sourceHandle && edge.targetHandle) return edge;

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) return edge;

    const handles = getBestHandles(sourceNode, targetNode);

    return {
      ...edge,
      sourceHandle: edge.sourceHandle || handles.sourceHandle,
      targetHandle: edge.targetHandle || handles.targetHandle,
    };
  });
}