import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  alpha,
  useTheme,
  Popover,
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Refresh,
  Storage,
  Memory,
  Speed,
  People,
  BarChart,
  Circle,
} from '@mui/icons-material';
import { useExplorerStore } from './explorerStore';

interface ConnectionStatusProps {
  status: string;
  host: string;
  port: string;
}

const ConnectionStatus = ({ status, host, port }: ConnectionStatusProps): React.ReactElement => {
  const theme = useTheme();
  
  const getStatusConfig = (): any => {
    switch (status) {
      case 'connected':
        return {
          color: theme.palette.success.main,
          icon: <Wifi sx={{ fontSize: 12 }} />,
          label: 'Connected',
          bgcolor: alpha(theme.palette.success.main, 0.12),
        };
      case 'connecting':
        return {
          color: theme.palette.warning.main,
          icon: <Refresh sx={{ fontSize: 12, animation: 'spin 1s linear infinite' }} />,
          label: 'Connecting...',
          bgcolor: alpha(theme.palette.warning.main, 0.12),
        };
      case 'error':
        return {
          color: theme.palette.error.main,
          icon: <WifiOff sx={{ fontSize: 12 }} />,
          label: 'Disconnected',
          bgcolor: alpha(theme.palette.error.main, 0.12),
        };
      default:
        return {
          color: theme.palette.text.secondary,
          icon: <WifiOff sx={{ fontSize: 12 }} />,
          label: 'Unknown',
          bgcolor: 'transparent',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      icon={config.icon}
      label={
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500 }}>
            {config.label}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
            {host}:{port}
          </Typography>
        </Stack>
      }
      size="small"
      sx={{
        height: 22,
        bgcolor: config.bgcolor,
        border: `1px solid ${config.color}`,
        color: config.color,
        '& .MuiChip-icon': { 
          ml: 0.75,
          color: config.color,
        },
        '& .MuiChip-label': {
          px: 0.75,
        },
      }}
    />
  );
};

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tooltip?: string;
  color?: string;
  onClick?: () => void;
}

const MetricItem = ({ icon, label, value, tooltip, color, onClick }: MetricItemProps): React.ReactElement => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    if (onClick) onClick();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={tooltip || label}>
        <Box
          onClick={handleClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: onClick ? 'pointer' : 'default',
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            '&:hover': onClick ? {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            } : {},
            transition: 'all 0.15s ease',
          }}
        >
          <Box sx={{ color: color || 'text.secondary', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500, color: 'text.primary' }}>
            {value}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', ml: 0.25 }}>
            {label}
          </Typography>
        </Box>
      </Tooltip>

      <Popover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              minWidth: 180,
              maxWidth: 280,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            },
          },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: 'text.primary' }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: color || 'text.primary' }}>
          {value}
        </Typography>
        {tooltip && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {tooltip}
          </Typography>
        )}
      </Popover>
    </>
  );
};

interface DatabaseBadgeProps {
  type: string;
}

const DatabaseBadge = ({ type }: DatabaseBadgeProps): React.ReactElement => {
  const theme = useTheme();
  
  const getConfig = (): any => {
    switch (type) {
      case 'neo4j':
        return { color: '#00bfff', label: 'Neo4j' };
      case 'mysql':
        return { color: '#00758f', label: 'MySQL' };
      case 'postgres':
        return { color: '#336791', label: 'PostgreSQL' };
      default:
        return { color: theme.palette.primary.main, label: 'Graph DB' };
    }
  };

  const config = getConfig();

  return (
    <Chip
      icon={<Storage sx={{ fontSize: 12 }} />}
      label={config.label}
      size="small"
      sx={{
        height: 20,
        fontSize: 9,
        fontWeight: 600,
        bgcolor: alpha(config.color, 0.12),
        border: `1px solid ${alpha(config.color, 0.2)}`,
        color: config.color,
        '& .MuiChip-icon': { 
          ml: 0.5,
          color: config.color,
        },
        '& .MuiChip-label': {
          px: 0.75,
        },
      }}
    />
  );
};

interface Metrics {
  nodes: number;
  edges: number;
  queriesPerSecond: number;
  cacheHitRate: number;
  activeConnections: number;
  systemLoad: number;
}

const StatusBar = (): React.ReactElement => {
  const theme = useTheme();
  const { treeData } = useExplorerStore() as any;
  
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [metrics, setMetrics] = useState<Metrics>({
    nodes: 0,
    edges: 0,
    queriesPerSecond: 0,
    cacheHitRate: 0.75,
    activeConnections: 1,
    systemLoad: 15,
  });

  const graphStats = useMemo(() => {
    if (!treeData) {
      return { nodes: 0, edges: 0 };
    }

    const countNodes = (node: any): number => {
      if (!node) return 0;
      let count = 1;
      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
          count += countNodes(child);
        });
      }
      return count;
    };

    const nodes = countNodes(treeData) - 1;
    const edges = treeData.edgeCount || 0;

    return { nodes, edges };
  }, [treeData]);

  useEffect(() => {
    setMetrics((prev: Metrics) => ({
      ...prev,
      nodes: graphStats.nodes,
      edges: graphStats.edges,
    }));
  }, [graphStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses = ['connected', 'connected', 'connected', 'connecting'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setConnectionStatus(randomStatus);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefreshMetrics = useCallback(() => {
    setMetrics((prev: Metrics) => ({
      ...prev,
      queriesPerSecond: Math.floor(Math.random() * 20),
      cacheHitRate: 0.6 + Math.random() * 0.35,
      activeConnections: Math.floor(Math.random() * 10) + 1,
      systemLoad: Math.floor(Math.random() * 50) + 5,
    }));
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 0.5,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        minHeight: 32,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <DatabaseBadge type="neo4j" />
        <ConnectionStatus status={connectionStatus} host="localhost" port="8080" />
        <Divider orientation="vertical" flexItem sx={{ height: 20 }} />
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Circle sx={{ fontSize: 10, color: theme.palette.info.main }} />
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: 'text.primary' }}>
              {graphStats.nodes}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
              nodes
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Storage sx={{ fontSize: 10, color: theme.palette.success.main }} />
            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: 'text.primary' }}>
              {graphStats.edges}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
              edges
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ flex: 1 }} />
      </Stack>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <MetricItem
            icon={<Speed sx={{ fontSize: 14 }} />}
            label="q/s"
            value={metrics.queriesPerSecond || 0}
            tooltip="Queries per second"
            color={metrics.queriesPerSecond > 10 ? theme.palette.warning.main : theme.palette.info.main}
          />

          <Divider orientation="vertical" flexItem sx={{ height: 16 }} />

          <MetricItem
            icon={<Memory sx={{ fontSize: 14 }} />}
            label="cache"
            value={`${(metrics.cacheHitRate * 100).toFixed(0)}%`}
            tooltip="Cache hit rate"
            color={metrics.cacheHitRate > 0.8 ? theme.palette.success.main : theme.palette.warning.main}
          />

          <Divider orientation="vertical" flexItem sx={{ height: 16 }} />

          <MetricItem
            icon={<People sx={{ fontSize: 14 }} />}
            label="conn"
            value={metrics.activeConnections || 0}
            tooltip="Active connections"
            color={metrics.activeConnections > 20 ? theme.palette.warning.main : theme.palette.info.main}
          />

          <Divider orientation="vertical" flexItem sx={{ height: 16 }} />

          <MetricItem
            icon={<BarChart sx={{ fontSize: 14 }} />}
            label="load"
            value={`${metrics.systemLoad.toFixed(1)}%`}
            tooltip="System load"
            color={metrics.systemLoad > 70 ? theme.palette.error.main : theme.palette.success.main}
          />
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Refresh metrics">
            <IconButton
              size="small"
              onClick={handleRefreshMetrics}
              sx={{ p: 0.25, color: 'text.secondary' }}
            >
              <Refresh sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box
        component="style"
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `,
        }}
      />
    </Box>
  );
};

export default React.memo(StatusBar);