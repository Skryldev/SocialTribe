import React, { memo, useEffect, useRef, ComponentType } from 'react';

const ANIMATION_CLASS = 'rf-node-enter';
const KEYFRAMES = `
@keyframes rfNodeEnter {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1);    }
}
.${ANIMATION_CLASS} {
  animation: rfNodeEnter 120ms ease-out forwards;
}
`;

let stylesInjected = false;
function ensureStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const tag = document.createElement('style');
  tag.setAttribute('data-rf-node-animation', '');
  tag.textContent = KEYFRAMES;
  document.head.appendChild(tag);
}

interface NodeProps {
  data?: {
    _isNew?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export function withAnimation(NodeComponent: ComponentType<any>): ComponentType<any> {
  ensureStyles();

  const AnimatedNode = memo(function AnimatedNode(props: NodeProps) {
    const isNew = props.data?._isNew ?? false;

    return <NodeComponent {...props} isNew={isNew} />;
  });

  AnimatedNode.displayName =
    `Animated(${NodeComponent.displayName || NodeComponent.name || 'Node'})`;

  return AnimatedNode;
}

export function nodeEnterClass(isNew: boolean): string | undefined {
  return isNew ? ANIMATION_CLASS : undefined;
}

export function useNodeEnterAnimation(ref: React.RefObject<any>, isNew: boolean): void {
  const hasAnimated = useRef<boolean>(false);

  useEffect(() => {
    if (!isNew || hasAnimated.current || !ref.current) return;
    hasAnimated.current = true;

    const el = ref.current;
    el.classList.add(ANIMATION_CLASS);

    const cleanup = () => el.classList.remove(ANIMATION_CLASS);
    el.addEventListener('animationend', cleanup, { once: true });
    return () => el.removeEventListener('animationend', cleanup);
  }, [isNew, ref]);
}