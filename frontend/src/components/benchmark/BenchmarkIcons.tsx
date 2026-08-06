import React from 'react';

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

interface SvgProps {
  size?: number;
  children?: React.ReactNode;
  [key: string]: any;
}

const Svg = ({ size = 16, children, ...rest }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...rest}>
    {children}
  </svg>
);

export const IconActivity = (p: any) => (
  <Svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>
);

export const IconAlertTriangle = (p: any) => (
  <Svg {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
);

export const IconCheckCircle = (p: any) => (
  <Svg {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Svg>
);

export const IconChevronRight = (p: any) => (
  <Svg {...p}><polyline points="9 18 15 12 9 6" /></Svg>
);

export const IconClock = (p: any) => (
  <Svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Svg>
);

export const IconCpu = (p: any) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
    <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" />
    <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" />
  </Svg>
);

export const IconDatabase = (p: any) => (
  <Svg {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </Svg>
);

export const IconGauge = (p: any) => (
  <Svg {...p}>
    <path d="M12 14 15.5 9" />
    <circle cx="12" cy="14" r="0.5" fill="currentColor" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </Svg>
);

export const IconHistory = (p: any) => (
  <Svg {...p}>
    <path d="M3 3v5h5" />
    <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
    <path d="M12 7v5l4 2" />
  </Svg>
);

export const IconInbox = (p: any) => (
  <Svg {...p}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </Svg>
);

export const IconLayers = (p: any) => (
  <Svg {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </Svg>
);

export const IconLoader = (p: any) => (
  <Svg {...p}><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </Svg>
);

export const IconPlay = (p: any) => (
  <Svg {...p}><polygon points="5 3 19 12 5 21 5 3" /></Svg>
);

export const IconPlug = (p: any) => (
  <Svg {...p}>
    <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" />
    <path d="M18 8v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
  </Svg>
);

export const IconRefresh = (p: any) => (
  <Svg {...p}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </Svg>
);

export const IconSettings = (p: any) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
);

export const IconSquareTerminal = (p: any) => (
  <Svg {...p}>
    <path d="M5 7l4 4-4 4" />
    <path d="M12 15h5" />
    <rect x="2" y="3" width="20" height="18" rx="2" />
  </Svg>
);

export const IconTrash = (p: any) => (
  <Svg {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
  </Svg>
);

export const IconTrendingUp = (p: any) => (
  <Svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Svg>
);

export const IconX = (p: any) => (
  <Svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
);

export const IconZap = (p: any) => (
  <Svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Svg>
);