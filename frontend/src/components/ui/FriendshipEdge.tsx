import React, { useState } from 'react';
import { getBezierPath, BaseEdge } from '@xyflow/react';

interface FriendshipEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: any;
  markerEnd?: any;
}

export function FriendshipEdge({
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: FriendshipEdgeProps): React.ReactElement {
  const [hovered, setHovered] = useState<boolean>(false);

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const stroke      = hovered ? '#ef4444' : (style.stroke      ?? '#6366f1');
  const strokeWidth = hovered ? 3         : (style.strokeWidth ?? 2);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth,
          transition: 'stroke 0.18s, stroke-width 0.18s',
        }}
      />

      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
    </>
  );
}