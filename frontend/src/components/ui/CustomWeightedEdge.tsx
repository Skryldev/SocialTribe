import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { getBezierPath } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";

export const WEIGHT_CONFIG: any = {
  thin: {
    range:     [0, 25],
    width:     1.5,
    color:     "#cbd5e1",
    glowColor: "rgba(203,213,225,0)",
    label:     "Weak",
    curvature: 0.55,
  },
  medium: {
    range:     [25, 55],
    width:     2.5,
    color:     "#f59e0b",
    glowColor: "rgba(245,158,11,0.2)",
    label:     "Medium",
    curvature: 0.4,
  },
  thick: {
    range:     [55, 80],
    width:     3.5,
    color:     "#d97706",
    glowColor: "rgba(217,119,6,0.3)",
    label:     "Strong",
    curvature: 0.25,
  },
  veryThick: {
    range:     [80, 100],
    width:     5,
    color:     "#b45309",
    glowColor: "rgba(180,83,9,0.4)",
    label:     "Very Strong",
    curvature: 0.1,
  },
};

export const EdgeConfig = { showWeightBadge: true };

function getWeightTier(weight: number): any {
  if (weight <= 20) return WEIGHT_CONFIG.thin;
  if (weight <= 50) return WEIGHT_CONFIG.medium;
  if (weight <= 80) return WEIGHT_CONFIG.thick;
  return WEIGHT_CONFIG.veryThick;
}

function getEdgeFilter(weight: number, tier: any): string {
  if (weight > 80) return `drop-shadow(0 0 8px ${tier.glowColor})`;
  if (weight > 50) return `drop-shadow(0 0 4px ${tier.glowColor})`;
  return "none";
}

interface FlowParticleProps {
  pathId: string;
  color: string;
  delay?: number;
  duration?: number;
}

function FlowParticle({ pathId, color, delay = 0, duration = 2 }: FlowParticleProps): React.ReactElement {
  return (
    <motion.circle
      r={3}
      fill={color}
      filter={`drop-shadow(0 0 3px ${color})`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <animateMotion
        dur={`${duration}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        calcMode="spline"
        keySplines="0.4 0 0.6 1"
      >
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </motion.circle>
  );
}

interface EdgeTooltipProps {
  visible: boolean;
  weight: number;
  source: string;
  target: string;
  label: string;
  color: string;
  x: number;
  y: number;
}

function EdgeTooltip({ visible, weight, source, target, label, color, x, y }: EdgeTooltipProps): React.ReactElement {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position:          "fixed",
            left:              x,
            top:               y - 72,
            transform:         "translateX(-50%)",
            pointerEvents:     "none",
            zIndex:            9999,
            background:        "rgba(255,255,255,0.88)",
            backdropFilter:    "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border:            `1px solid ${color}55`,
            borderRadius:      10,
            padding:           "7px 12px",
            boxShadow:         `0 4px 24px rgba(0,0,0,0.10), 0 0 0 1px ${color}22`,
            minWidth:          142,
            fontFamily:        "system-ui, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: color, boxShadow: `0 0 6px ${color}`,
              display: "inline-block",
            }} />
            <span style={{ fontWeight: 700, fontSize: 12, color, letterSpacing: 0.3 }}>
              {label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#374151", display: "flex", flexDirection: "column", gap: 2 }}>
            <span><b>Weight:</b> {weight.toFixed(1)}%</span>
            <span style={{ color: "#6b7280" }}>{source} → {target}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface WeightBadgeProps {
  cx: number;
  cy: number;
  weight: number;
  color: string;
  visible: boolean;
}

function WeightBadge({ cx, cy, weight, color, visible }: WeightBadgeProps): React.ReactElement {
  return (
    <AnimatePresence>
      {visible && (
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.2 }}
          pointerEvents="none"
        >
          <rect
            x={cx - 18} y={cy - 10} width={36} height={20} rx={10}
            fill={color} opacity={0.93}
            filter="drop-shadow(0 1px 4px rgba(0,0,0,0.15))"
          />
          <text
            x={cx} y={cy + 4}
            textAnchor="middle" fill="white"
            fontSize={10} fontWeight="700"
            fontFamily="system-ui, sans-serif"
            letterSpacing="0.3"
          >
            {Math.round(weight)}%
          </text>
        </motion.g>
      )}
    </AnimatePresence>
  );
}

interface SparkleEffectProps {
  x: number;
  y: number;
  color: string;
  show: boolean;
}

function SparkleEffect({ x, y, color, show }: SparkleEffectProps): React.ReactElement {
  const sparks = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      len:   8 + Math.random() * 6,
      delay: i * 0.05,
    })),
    []
  );

  return (
    <AnimatePresence>
      {show && sparks.map((s: any, i: number) => (
        <motion.line
          key={i}
          x1={x} y1={y}
          x2={x + Math.cos(s.angle) * s.len}
          y2={y + Math.sin(s.angle) * s.len}
          stroke={color} strokeWidth={2} strokeLinecap="round"
          initial={{ opacity: 1, pathLength: 0 }}
          animate={{ opacity: [1, 0], pathLength: [0, 1] }}
          transition={{ duration: 0.5, delay: s.delay, ease: "easeOut" }}
        />
      ))}
    </AnimatePresence>
  );
}

const EDGE_CSS = `
  @keyframes edgeGlowPulse {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(219,39,119,0.4)); }
    50%       { filter: drop-shadow(0 0 13px rgba(219,39,119,0.95)); }
  }
  @keyframes edgeSelectedDash {
    to { stroke-dashoffset: -12; }
  }
  .rf-edge-glow-pulse   { animation: edgeGlowPulse 2s ease-in-out infinite; }
  .rf-edge-sel-dash     { stroke-dasharray: 7 5; animation: edgeSelectedDash 0.55s linear infinite; }
`;

let cssInjected = false;
function injectCSS(): void {
  if (cssInjected) return;
  const tag = document.createElement("style");
  tag.textContent = EDGE_CSS;
  document.head.appendChild(tag);
  cssInjected = true;
}

interface CustomWeightedEdgeProps {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  selected?: boolean;
  data?: any;
}

export function CustomWeightedEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data = {},
}: CustomWeightedEdgeProps): React.ReactElement {
  injectCSS();

  const weight     = typeof data.Weight === "number" ? data.Weight : 30;
  const showBadge  = data.showWeightBadge ?? EdgeConfig.showWeightBadge;

  const [isHovered,      setIsHovered]      = useState<boolean>(false);
  const [mousePos,       setMousePos]       = useState({ x: 0, y: 0 });
  const [isMounted,      setIsMounted]      = useState<boolean>(false);
  const [sparkleVisible, setSparkleVisible] = useState<boolean>(true);

  useEffect(() => {
    const t1 = setTimeout(() => setIsMounted(true), 40);
    const t2 = setTimeout(() => setSparkleVisible(false), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const tier        = useMemo(() => getWeightTier(weight), [weight]);
  const strokeWidth = useMemo(() => tier.width * (isHovered ? 1.5 : 1), [tier, isHovered]);
  const filter      = useMemo(() => getEdgeFilter(weight, tier), [weight, tier]);
  const isVeryThick = weight > 80;
  const drawDuration = Math.max(0.3, 1.2 - weight / 100);
  const particleDuration = Math.max(2.5, 4 - weight / 50);

  const [edgePath, labelX, labelY] = useMemo(
    () => getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      curvature: tier.curvature,
    }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, tier.curvature]
  );

  const pathId = `edge-path-${id}`;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <>
      <g
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(strokeWidth + 14, 20)}
          style={{ cursor: "pointer" }}
        />

        {isVeryThick && (
          <path
            d={edgePath} fill="none"
            stroke="white" strokeWidth={strokeWidth + 4} strokeLinecap="round"
          />
        )}

        {selected && (
          <path
            d={edgePath} fill="none"
            stroke={tier.color} strokeWidth={strokeWidth + 4}
            strokeLinecap="round" opacity={0.32}
            className="rf-edge-sel-dash"
          />
        )}

        <path
          id={pathId}
          d={edgePath}
          fill="none"
          stroke={tier.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={isMounted ? undefined : 600}
          strokeDashoffset={isMounted ? undefined : 600}
          style={{
            filter,
            transition: `stroke-dashoffset ${drawDuration}s ease-out,
                         stroke-width 0.2s ease,
                         filter 0.3s ease`,
          }}
          className={isVeryThick ? "rf-edge-glow-pulse" : undefined}
        />

        {weight > 70 && isMounted && (
          <>
            <FlowParticle pathId={pathId} color={tier.color} delay={0}                       duration={particleDuration} />
            <FlowParticle pathId={pathId} color={tier.color} delay={particleDuration / 3}    duration={particleDuration} />
            <FlowParticle pathId={pathId} color={tier.color} delay={particleDuration * 2/3}  duration={particleDuration} />
          </>
        )}

        {sparkleVisible && isMounted && (
          <SparkleEffect x={targetX} y={targetY} color={tier.color} show />
        )}

        <WeightBadge
          cx={labelX}
          cy={isHovered && showBadge ? labelY + 18 : labelY}
          weight={weight}
          color={tier.color}
          visible={showBadge}
        />
      </g>

      <EdgeTooltip
        visible={isHovered}
        weight={weight}
        source={source}
        target={target}
        label={tier.label}
        color={tier.color}
        x={mousePos.x}
        y={mousePos.y}
      />
    </>
  );
}