import React, { useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import {
  ClearAll,
  ContentCopy,
  Stop,
  PlayArrow,
} from '@mui/icons-material';
import { useConsoleStore } from './consoleStore';
import { useSnackbar } from './SnackbarContext';

const LOG_LEVELS: any = {
  INFO: { color: '#4fc3f7', label: 'INFO' },
  WARN: { color: '#ffa726', label: 'WARN' },
  ERROR: { color: '#ef5350', label: 'ERROR' },
  DEBUG: { color: '#8b949e', label: 'DEBUG' },
};

interface LogEntry {
  id: string;
  timestamp: number;
  level: string;
  source: string;
  message: string;
}

const BottomConsole = (): React.ReactElement => {
  const {
    consoleLogs,
    filterLevel,
    isAutoScroll,
    toggleAutoScroll,
    clearLogs,
    setFilter,
  } = useConsoleStore() as any;

  const showSnackbar = useSnackbar() as any;
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = consoleLogs.filter(
    (log: LogEntry) => filterLevel === 'all' || log.level === filterLevel
  );

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, isAutoScroll]);

  const handleCopyLogs = (): void => {
    if (filteredLogs.length === 0) return;
    
    const text = filteredLogs
      .map(
        (log: LogEntry) =>
          `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level}] [${log.source}] ${log.message}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    showSnackbar('Logs copied to clipboard', 'success');
  };

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 0.5,
          px: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Console
        </Typography>
        <Chip
          label={`${consoleLogs.length}`}
          size="small"
          sx={{ height: 20, fontSize: 10 }}
        />
        
        <ToggleButtonGroup
          value={filterLevel}
          exclusive
          onChange={(_e: React.MouseEvent<HTMLElement>, value: string) => value && setFilter(value)}
          size="small"
          sx={{ gap: 0.5 }}
        >
          <ToggleButton value="all" sx={{ py: 0, px: 1, fontSize: 10, textTransform: 'none' }}>
            ALL
          </ToggleButton>
          <ToggleButton value="INFO" sx={{ py: 0, px: 1, fontSize: 10, textTransform: 'none' }}>
            INFO
          </ToggleButton>
          <ToggleButton value="WARN" sx={{ py: 0, px: 1, fontSize: 10, textTransform: 'none' }}>
            WARN
          </ToggleButton>
          <ToggleButton value="ERROR" sx={{ py: 0, px: 1, fontSize: 10, textTransform: 'none' }}>
            ERROR
          </ToggleButton>
          <ToggleButton value="DEBUG" sx={{ py: 0, px: 1, fontSize: 10, textTransform: 'none' }}>
            DEBUG
          </ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <Tooltip title={isAutoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}>
          <IconButton size="small" onClick={toggleAutoScroll}>
            {isAutoScroll ? (
              <Stop fontSize="small" />
            ) : (
              <PlayArrow fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Copy All">
          <IconButton size="small" onClick={handleCopyLogs}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear">
          <IconButton size="small" onClick={clearLogs}>
            <ClearAll fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        {filteredLogs.map((log: LogEntry) => (
          <Box
            key={log.id}
            sx={{
              display: 'flex',
              gap: 1,
              px: 1.5,
              py: 0.25,
              '&:hover': {
                bgcolor: 'action.hover',
              },
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                minWidth: 80,
                fontSize: 10,
              }}
            >
              {new Date(log.timestamp).toLocaleTimeString()}
            </Typography>
            <Chip
              label={log.level}
              size="small"
              sx={{
                height: 16,
                fontSize: 9,
                bgcolor: LOG_LEVELS[log.level]?.color + '33',
                color: LOG_LEVELS[log.level]?.color,
                fontWeight: 600,
                minWidth: 45,
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, fontSize: 10 }}>
              [{log.source}]
            </Typography>
            <Typography
              variant="caption"
              sx={{
                wordBreak: 'break-all',
                flex: 1,
                fontSize: 10,
                color:
                  log.level === 'ERROR'
                    ? 'error.light'
                    : log.level === 'WARN'
                    ? 'warning.light'
                    : 'text.primary',
              }}
            >
              {log.message}
            </Typography>
          </Box>
        ))}
        {filteredLogs.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {consoleLogs.length === 0
                ? 'No log entries'
                : 'No entries matching current filter'}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default BottomConsole;