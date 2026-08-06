import React, { memo, useEffect, useState } from 'react';

const HIDE_DELAY_MS = 400;

const BAR_STYLE: React.CSSProperties = {
  position:        'absolute',
  top:             0,
  left:            0,
  right:           0,
  height:          2,
  zIndex:          1000,
  pointerEvents:   'none',
  overflow:        'hidden',
};

const FILL_STYLE = (visible: boolean): React.CSSProperties => ({
  position:         'absolute',
  top:              0,
  left:             0,
  height:           '100%',
  width:            '100%',
  background:       'linear-gradient(90deg, #3b9eff 0%, #63dcb4 50%, #a78bfa 100%)',
  backgroundSize:   '200% 100%',
  animation:        visible
    ? 'vg-progress-slide 1.4s linear infinite'
    : 'none',
  opacity:          visible ? 1 : 0,
  transition:       `opacity ${HIDE_DELAY_MS}ms ease`,
  boxShadow:        visible ? '0 0 8px rgba(99,220,180,0.5)' : 'none',
});

const KEYFRAMES = `
@keyframes vg-progress-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

let keyframesInjected = false;
function ensureKeyframes(): void {
  if (keyframesInjected) return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

interface FetchingIndicatorProps {
  active: boolean;
}

export const FetchingIndicator = memo(function FetchingIndicator({ active }: FetchingIndicatorProps): React.ReactElement {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <div style={BAR_STYLE}>
      <div style={FILL_STYLE(visible)} />
    </div>
  );
});