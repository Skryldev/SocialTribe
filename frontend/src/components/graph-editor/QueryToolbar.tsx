import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow,
  FormatAlignLeft,
  MoreVert,
  AccountTree,
  Pending,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface QueryStatusIndicatorProps {
  status: 'success' | 'error' | 'running' | 'idle';
  duration?: string;
}

const QueryStatusIndicator = ({ status, duration }: QueryStatusIndicatorProps): React.ReactElement => {
  const theme = useTheme();
  
  const statusConfig: any = {
    success: { icon: <CheckCircle sx={{ fontSize: 14 }} />, color: theme.palette.success.main, label: 'Success' },
    error: { icon: <ErrorIcon sx={{ fontSize: 14 }} />, color: theme.palette.error.main, label: 'Error' },
    running: { icon: <Pending sx={{ fontSize: 14 }} />, color: theme.palette.warning.main, label: 'Running' },
  };
  
  const config = statusConfig[status] || { icon: null, color: theme.palette.text.secondary, label: 'Ready' };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {config.icon && (
        <Box sx={{ color: config.color, display: 'flex', alignItems: 'center' }}>
          {config.icon}
        </Box>
      )}
      <Chip
        label={config.label}
        size="small"
        sx={{
          height: 20,
          fontSize: 10,
          bgcolor: alpha(config.color, 0.1),
          color: config.color,
          fontWeight: 500,
        }}
      />
      {duration && (
        <Chip
          label={`${duration}s`}
          size="small"
          sx={{ height: 18, fontSize: 10, bgcolor: 'action.hover' }}
        />
      )}
    </Box>
  );
};

interface QueryToolbarProps {
  isExecuting: boolean;
  wasmReady: boolean;
  wasmVersion: string;
  queryCount: number;
  isExecuteDisabled: boolean;
  hasActiveQuery: boolean;
  onExecute: () => void;
  onExplain: () => void;
  onFormat: () => void;
  onTabMenuOpen: (e: React.MouseEvent<HTMLElement>, tabId: string | undefined) => void;
  activeTabId: string | undefined;
}

const QueryToolbar = ({
  isExecuting,
  wasmReady,
  wasmVersion,
  queryCount,
  isExecuteDisabled,
  hasActiveQuery,
  onExecute,
  onExplain,
  onFormat,
  onTabMenuOpen,
  activeTabId,
}: QueryToolbarProps): React.ReactElement => {
  const theme = useTheme();
  
  const buttonStyle = {
    fontSize: 12,
    textTransform: 'none' as const,
    borderColor: alpha(theme.palette.warning.main, 0.3),
    color: theme.palette.warning.main,
    '&:hover': {
      borderColor: theme.palette.warning.main,
      bgcolor: alpha(theme.palette.warning.main, 0.05),
    },
  };
  
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75,
      borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper',
      flexShrink: 0, minHeight: 44,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={isExecuteDisabled ? 'No query to execute or WASM not ready' : 'Execute Query (Ctrl+Enter)'}>
          <span>
            <Button
              variant="contained"
              size="small"
              startIcon={isExecuting ? (
                <Pending sx={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <PlayArrow />
              )}
              onClick={onExecute}
              disabled={isExecuteDisabled}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                px: 2,
                textTransform: 'none',
                bgcolor: theme.palette.warning.main,
                '&:hover': {
                  bgcolor: theme.palette.warning.dark,
                  transform: 'scale(1.02)',
                },
                transition: 'transform 0.1s ease',
              }}
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          </span>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        
        <Tooltip title="Format Query (Ctrl+Shift+F)">
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FormatAlignLeft />}
              onClick={onFormat}
              disabled={!hasActiveQuery}
              sx={buttonStyle}
            >
              Format
            </Button>
          </span>
        </Tooltip>
        
        <Tooltip title="Explain Query Plan">
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AccountTree />}
              onClick={onExplain}
              disabled={!hasActiveQuery || !wasmReady}
              sx={buttonStyle}
            >
              Explain
            </Button>
          </span>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      </Box>
      
      <Box sx={{ flex: 1 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <QueryStatusIndicator
          status={isExecuting ? 'running' : wasmReady ? 'success' : 'idle'}
        />
        
        {!wasmReady && (
          <Chip
            label="Loading WASM..."
            size="small"
            sx={{
              height: 20,
              fontSize: 10,
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              color: theme.palette.warning.main,
            }}
          />
        )}
        
        {wasmReady && wasmVersion && (
          <Chip
            label={`v${wasmVersion}`}
            size="small"
            sx={{
              height: 20,
              fontSize: 9,
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
            }}
          />
        )}
        
        <Chip
          label={`${queryCount} tab${queryCount > 1 ? 's' : ''}`}
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: 10,
            borderColor: alpha(theme.palette.warning.main, 0.2),
            color: theme.palette.warning.main,
          }}
        />
        
        <Tooltip title="More actions">
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent<HTMLElement>) => onTabMenuOpen(e, activeTabId)}
            sx={{ p: 0.25, color: 'text.secondary' }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default QueryToolbar;