import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppBar, Toolbar, Box, IconButton, Typography, Tooltip } from '@mui/material';
import { styled, alpha, keyframes } from '@mui/material/styles';
import { Minus, Square, Copy, X } from 'lucide-react';

const TOKENS = {
  barHeight: 36,
  ctrlWidth: 36,
  ctrlHeight: 28,
  iconSize: 16,
  iconStroke: 1.75,
  
  palette: {
    background: '#0B1121',
    accent: {
      primary: '#818CF8',
      secondary: '#38BDF8',
      muted: 'rgba(129, 140, 248, 0.08)',
      glow: 'rgba(129, 140, 248, 0.15)',
    },
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      disabled: '#64748B',
    },
    actions: {
      hover: 'rgba(255, 255, 255, 0.07)',
      close: '#F43F5E',
      closeHover: '#E11D48',
      closeGlow: 'rgba(244, 63, 94, 0.25)',
    },
    border: 'rgba(56, 189, 248, 0.06)',
  },
  
  typography: {
    font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    size: 12,
    weight: 600,
    spacing: '0.01em',
  },
  
  radius: { sm: 4, md: 6, lg: 8 },
  animation: {
    duration: '200ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

const driftRight = keyframes`
  0% { transform: translate(0, 0) scale(1); opacity: 0; }
  10% { opacity: 0.8; transform: scale(1.2); }
  30% { opacity: 0.6; transform: scale(1); }
  70% { opacity: 0.5; transform: scale(0.8); }
  100% { transform: translate(30px, -25px) scale(0.3); opacity: 0; }
`;

const driftLeft = keyframes`
  0% { transform: translate(0, 0) scale(1); opacity: 0; }
  10% { opacity: 0.75; transform: scale(1.1); }
  40% { opacity: 0.55; transform: scale(0.9); }
  80% { opacity: 0.4; }
  100% { transform: translate(-25px, -20px) scale(0.3); opacity: 0; }
`;

const floatVertical = keyframes`
  0% { transform: translateY(0) scale(0.8); opacity: 0; }
  15% { opacity: 0.85; transform: scale(1.2); }
  35% { opacity: 0.6; transform: scale(1); }
  65% { opacity: 0.45; transform: scale(0.9); }
  100% { transform: translateY(-30px) scale(0.5); opacity: 0; }
`;

const waveMotion = keyframes`
  0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
  20% { opacity: 0.8; transform: scale(1.3); }
  40% { transform: translate(12px, -12px) scale(1); }
  60% { transform: translate(-8px, -20px) scale(0.9); }
  80% { opacity: 0.4; transform: scale(0.7); }
  100% { transform: translate(4px, -28px) scale(0.3); opacity: 0; }
`;

const microOrbit = keyframes`
  0% { transform: translate(0, 0) rotate(0deg) scale(0.8); opacity: 0; }
  15% { opacity: 0.8; transform: scale(1.2); }
  35% { transform: translate(8px, -10px) rotate(120deg) scale(1); }
  55% { transform: translate(-6px, -18px) rotate(240deg) scale(0.9); }
  75% { opacity: 0.4; transform: scale(0.6); }
  100% { transform: translate(2px, -25px) rotate(360deg) scale(0.3); opacity: 0; }
`;

const zigzag = keyframes`
  0% { transform: translate(0, 0) scale(0.7); opacity: 0; }
  15% { opacity: 0.8; transform: scale(1.15); }
  30% { transform: translate(15px, -8px) scale(1); }
  50% { transform: translate(-10px, -16px) scale(0.95); }
  70% { transform: translate(8px, -22px) scale(0.8); }
  85% { opacity: 0.35; }
  100% { transform: translate(-4px, -30px) scale(0.3); opacity: 0; }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const logoPulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
`;

const animations = [driftRight, driftLeft, floatVertical, waveMotion, microOrbit, zigzag];
const colors = [TOKENS.palette.accent.primary, TOKENS.palette.accent.secondary];

interface ParticleConfig {
  size: number;
  color: string;
  startLeft: number;
  startBottom: number;
  animation: any;
  duration: number;
  delay: number;
  easing: string;
}

const Bar = styled(AppBar)({
  background: TOKENS.palette.background,
  borderBottom: `1px solid ${TOKENS.palette.border}`,
  boxShadow: 'none',
  position: 'relative',
  minHeight: `${TOKENS.barHeight}px !important`,
  height: TOKENS.barHeight,
  flexShrink: 0,
  zIndex: 1200,
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(
      135deg,
      transparent 0%,
      ${alpha('#818CF8', 0.04)} 25%,
      transparent 50%,
      ${alpha('#38BDF8', 0.04)} 75%,
      transparent 100%
    )`,
    backgroundSize: '400% 400%',
    animation: `${gradientShift} 8s ease infinite`,
    pointerEvents: 'none',
    zIndex: 0,
  },
});

const ParticlesContainer = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  zIndex: 0,
  overflow: 'hidden',
});

const Particle = styled(Box)<{ $config: ParticleConfig }>(({ $config }) => ({
  position: 'absolute',
  width: $config.size,
  height: $config.size,
  borderRadius: '50%',
  background: $config.color,
  boxShadow: `
    0 0 ${$config.size * 4}px ${$config.color},
    0 0 ${$config.size * 8}px ${alpha($config.color, 0.6)},
    0 0 ${$config.size * 12}px ${alpha($config.color, 0.3)}
  `,
  bottom: `${$config.startBottom}%`,
  left: `${$config.startLeft}%`,
  animation: `${$config.animation} ${$config.duration}s ${$config.easing || 'ease-in-out'} ${$config.delay}s infinite`,
  opacity: 0,
  filter: $config.size > 3 ? 'blur(0.5px)' : 'none',
}));

const Strip = styled(Toolbar)({
  minHeight: `${TOKENS.barHeight}px !important`,
  height: TOKENS.barHeight,
  padding: '0 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  position: 'relative',
  zIndex: 2,
});

const DragRegion = styled(Box)({
  flex: 1,
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'default',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitAppRegion: 'drag',
});

const LogoMark = styled(Box)({
  width: 22,
  height: 22,
  borderRadius: TOKENS.radius.md,
  background: `linear-gradient(135deg, ${TOKENS.palette.accent.muted} 0%, rgba(56, 189, 248, 0.05) 100%)`,
  border: `1px solid ${alpha(TOKENS.palette.accent.primary, 0.2)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `0 0 12px ${alpha(TOKENS.palette.accent.primary, 0.15)}`,
  
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: -1,
    borderRadius: TOKENS.radius.md,
    padding: 1,
    background: `linear-gradient(45deg, ${TOKENS.palette.accent.primary}, ${TOKENS.palette.accent.secondary}, ${TOKENS.palette.accent.primary})`,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    animation: `${logoPulse} 2s ease-in-out infinite`,
  },
});

const CtrlGroup = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  WebkitAppRegion: 'no-drag',
});

const CtrlButton = styled(IconButton)<{ variant?: string }>(({ variant = 'default' }) => ({
  width: TOKENS.ctrlWidth,
  height: TOKENS.ctrlHeight,
  borderRadius: TOKENS.radius.sm,
  color: TOKENS.palette.text.disabled,
  transition: `all ${TOKENS.animation.duration} ${TOKENS.animation.easing}`,
  
  '&:hover': {
    background: variant === 'close' ? TOKENS.palette.actions.close : TOKENS.palette.actions.hover,
    color: TOKENS.palette.text.primary,
    ...(variant === 'close' && {
      background: TOKENS.palette.actions.closeHover,
      boxShadow: `0 0 20px ${TOKENS.palette.actions.closeGlow}`,
    }),
  },
  
  '&:active': {
    transform: 'scale(0.92)',
  },
  
  '&:focus-visible': {
    outline: `1.5px solid ${TOKENS.palette.accent.primary}`,
    outlineOffset: 2,
    borderRadius: TOKENS.radius.sm,
  },
}));

const GraphIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <style>
      {`
        @keyframes nodePulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes edgeDash {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .node-anim { animation: nodePulse 2s ease-in-out infinite; }
        .node-anim:nth-child(1) { animation-delay: 0s; }
        .node-anim:nth-child(2) { animation-delay: 0.4s; }
        .node-anim:nth-child(3) { animation-delay: 0.8s; }
        .node-anim:nth-child(4) { animation-delay: 1.2s; }
        .node-anim:nth-child(5) { animation-delay: 1.6s; }
        .edge-anim {
          stroke-dasharray: 100;
          animation: edgeDash 3s linear infinite;
        }
      `}
    </style>
    <circle className="node-anim" cx="12" cy="12" r="3" fill={TOKENS.palette.accent.primary} opacity="0.9" />
    <circle className="node-anim" cx="5" cy="5" r="2" fill={TOKENS.palette.accent.secondary} opacity="0.8" />
    <circle className="node-anim" cx="19" cy="5" r="2" fill={TOKENS.palette.accent.secondary} opacity="0.8" />
    <circle className="node-anim" cx="19" cy="19" r="2" fill={TOKENS.palette.accent.secondary} opacity="0.8" />
    <circle className="node-anim" cx="5" cy="19" r="2" fill={TOKENS.palette.accent.secondary} opacity="0.8" />
    <path className="edge-anim" d="M7 6.5 Q9.5 9.5 10.5 10" stroke={TOKENS.palette.accent.primary} strokeWidth="1.2" opacity="0.6" fill="none" />
    <path className="edge-anim" d="M17 6.5 Q14.5 9.5 13.5 10" stroke={TOKENS.palette.accent.primary} strokeWidth="1.2" opacity="0.6" fill="none" />
    <path className="edge-anim" d="M17 17.5 Q14.5 14.5 13.5 14" stroke={TOKENS.palette.accent.primary} strokeWidth="1.2" opacity="0.6" fill="none" />
    <path className="edge-anim" d="M7 17.5 Q9.5 14.5 10.5 14" stroke={TOKENS.palette.accent.primary} strokeWidth="1.2" opacity="0.6" fill="none" />
  </svg>
);

interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const WindowControls = memo(function WindowControls({
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}: WindowControlsProps) {
  return (
    <CtrlGroup>
      <Tooltip title="Minimize" placement="bottom" arrow>
        <CtrlButton onClick={onMinimize} size="small" aria-label="Minimize window">
          <Minus size={TOKENS.iconSize} strokeWidth={TOKENS.iconStroke} />
        </CtrlButton>
      </Tooltip>

      <Tooltip title={isMaximized ? 'Restore Down' : 'Maximize'} placement="bottom" arrow>
        <CtrlButton onClick={onMaximize} size="small" aria-label={isMaximized ? 'Restore window' : 'Maximize window'}>
          {isMaximized ? (
            <Copy size={TOKENS.iconSize} strokeWidth={TOKENS.iconStroke} style={{ transform: 'rotate(180deg)' }} />
          ) : (
            <Square size={TOKENS.iconSize} strokeWidth={TOKENS.iconStroke} />
          )}
        </CtrlButton>
      </Tooltip>

      <Tooltip title="Close" placement="bottom" arrow>
        <CtrlButton
          onClick={onClose}
          size="small"
          variant="close"
          aria-label="Close window"
        >
          <X size={TOKENS.iconSize} strokeWidth={TOKENS.iconStroke} />
        </CtrlButton>
      </Tooltip>
    </CtrlGroup>
  );
});

interface ParticleData {
  id: string;
  size: number;
  color: string;
  startLeft: number;
  startBottom: number;
  animation: any;
  duration: number;
  delay: number;
  easing: string;
}

function generateParticles(): ParticleData[] {
  const easingFunctions = ['ease-in-out', 'ease', 'ease-in', 'ease-out', 'linear'];
  
  const coreNodes = Array.from({ length: 4 }, (_, i) => ({
    id: `core-${i}`,
    size: 4.5 + Math.random() * 2.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    startLeft: Math.random() * 100,
    startBottom: Math.random() * 100,
    animation: animations[Math.floor(Math.random() * animations.length)],
    duration: 8 + Math.random() * 6,
    delay: Math.random() * 4,
    easing: easingFunctions[Math.floor(Math.random() * easingFunctions.length)],
  }));

  const standardNodes = Array.from({ length: 10 }, (_, i) => ({
    id: `std-${i}`,
    size: 2.5 + Math.random() * 2.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    startLeft: Math.random() * 100,
    startBottom: Math.random() * 100,
    animation: animations[Math.floor(Math.random() * animations.length)],
    duration: 6 + Math.random() * 5,
    delay: Math.random() * 5,
    easing: easingFunctions[Math.floor(Math.random() * easingFunctions.length)],
  }));

  const edgeDust = Array.from({ length: 8 }, (_, i) => ({
    id: `dust-${i}`,
    size: 1.5 + Math.random() * 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    startLeft: Math.random() * 100,
    startBottom: Math.random() * 100,
    animation: animations[Math.floor(Math.random() * animations.length)],
    duration: 5 + Math.random() * 4,
    delay: Math.random() * 6,
    easing: easingFunctions[Math.floor(Math.random() * easingFunctions.length)],
  }));

  return [...coreNodes, ...standardNodes, ...edgeDust];
}

interface TitlebarProps {
  appName?: string;
}

export function Titlebar({ appName = 'GraphNet' }: TitlebarProps): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  
  const particles = useMemo(() => generateParticles(), []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlisten: any = null;

    async function init() {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
        setReady(true);
      } catch (err) {
        console.error('[Titlebar] Init failed:', err);
        setReady(true);
      }
    }

    async function attachListener() {
      try {
        unlisten = await appWindow.onResized(async () => {
          try {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
          } catch (err) {
            console.error('[Titlebar] Resize state failed:', err);
          }
        });
      } catch (err) {
        console.error('[Titlebar] Listener attach failed:', err);
      }
    }

    init();
    attachListener();
    return () => { unlisten?.(); };
  }, []);

  const handleMinimize = useCallback(async () => {
    try { await getCurrentWindow().minimize(); } catch (err) { console.error(err); }
  }, []);

  const handleMaximize = useCallback(async () => {
    try { await getCurrentWindow().toggleMaximize(); } catch (err) { console.error(err); }
  }, []);

  const handleClose = useCallback(async () => {
    try { await getCurrentWindow().close(); } catch (err) { console.error(err); }
  }, []);

  return (
    <Bar elevation={0} role="banner">
      <ParticlesContainer>
        {particles.map((particle: ParticleData) => (
          <Particle key={particle.id} $config={particle} />
        ))}
      </ParticlesContainer>
      
      <Strip>
        <DragRegion data-tauri-drag-region>
          <LogoMark aria-hidden="true">
            <GraphIcon />
          </LogoMark>
          
          <Typography
            component="span"
            sx={{
              fontFamily: TOKENS.typography.font,
              fontSize: TOKENS.typography.size,
              fontWeight: TOKENS.typography.weight,
              background: `linear-gradient(135deg, ${TOKENS.palette.text.primary} 0%, ${TOKENS.palette.text.secondary} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: TOKENS.typography.spacing,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {appName}
          </Typography>
        </DragRegion>

        {ready && (
          <WindowControls
            isMaximized={isMaximized}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
          />
        )}
      </Strip>
    </Bar>
  );
}

export default memo(Titlebar);