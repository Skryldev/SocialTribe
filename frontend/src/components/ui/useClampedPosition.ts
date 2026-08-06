import { useLayoutEffect, useState, RefObject } from 'react';

interface Anchor {
  x: number;
  y: number;
}

export function useClampedPosition(
  anchor: Anchor | null,
  ref: RefObject<HTMLElement>,
  margin: number = 8
): Anchor | null {
  const [pos, setPos] = useState<Anchor | null>(anchor);

  useLayoutEffect(() => {
    if (!anchor) {
      setPos(null);
      return;
    }
    setPos(anchor);

    const clamp = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let { x, y } = anchor;

      if (x + rect.width + margin > vw) {
        x = Math.max(margin, vw - rect.width - margin);
      }
      if (y + rect.height + margin > vh) {
        y = Math.max(margin, vh - rect.height - margin);
      }
      x = Math.max(margin, x);
      y = Math.max(margin, y);

      setPos((prev: Anchor | null) => (prev && prev.x === x && prev.y === y ? prev : { x, y }));
    };

    const raf = requestAnimationFrame(clamp);
    window.addEventListener('resize', clamp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', clamp);
    };
  }, [anchor?.x, anchor?.y, ref]);

  return pos;
}