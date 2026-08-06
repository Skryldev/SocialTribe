import React from 'react';
import {
  Box,
  Menu,
  MenuItem,
  IconButton,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { Close, History, Schedule } from '@mui/icons-material';

interface HistoryItem {
  id?: string | number;
  query: string;
  timestamp: string | number;
  duration?: number;
  rowCount?: number;
}

interface HistoryPanelProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  history: HistoryItem[];
  onItemClick: (query: string) => void;
}

export const HistoryPanel = ({ open, anchorEl, onClose, history, onItemClick }: HistoryPanelProps): React.ReactElement => {
  const theme = useTheme();
  
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 420, maxHeight: 350, bgcolor: 'background.paper',
            border: '1px solid', borderColor: 'divider', borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Query History
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <Close sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
      
      <Box sx={{ maxHeight: 280, overflow: 'auto', p: 0.5 }}>
        {history && history.length > 0 ? (
          history.slice(0, 20).map((item: HistoryItem, index: number) => (
            <MenuItem
              key={item.id || index}
              onClick={() => onItemClick(item.query)}
              dense
              sx={{
                py: 1, px: 1.5, borderRadius: 1,
                '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08) },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', fontSize: 11, fontFamily: 'monospace',
                    color: 'text.primary',
                  }}
                >
                  {item.query}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                    <Schedule sx={{ fontSize: 10, mr: 0.5, verticalAlign: 'middle' }} />
                    {new Date(item.timestamp).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                    ⚡ {item.duration}s
                  </Typography>
                  <Chip
                    label={`${item.rowCount || 0} rows`}
                    size="small"
                    sx={{
                      height: 16, fontSize: 8,
                      bgcolor: alpha(theme.palette.warning.main, 0.08),
                      color: theme.palette.warning.main,
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                </Box>
              </Box>
            </MenuItem>
          ))
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <History sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.3, mb: 1 }} />
            <Typography variant="caption" color="text.secondary">
              No query history yet
            </Typography>
          </Box>
        )}
      </Box>
    </Menu>
  );
};