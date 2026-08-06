import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { createTheme, Theme } from '@mui/material/styles';
import { SnackbarProvider } from './SnackbarContext';
import CenterWorkspace from './CenterWorkspace';
import StatusBar from './StatusBar';
import './GraphStudio.css';

const createAppTheme = (): Theme => createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#f0a030',
      light: '#f5c45a',
      dark: '#c47d1a',
    },
    secondary: {
      main: '#6ab0e6',
      light: '#8fc9f0',
      dark: '#4a8fc4',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    background: {
      default: '#0a0b0d',
      paper: '#0f1117',
      card: '#161b24',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
      disabled: '#64748b',
    },
    divider: 'rgba(255, 255, 255, 0.06)',
    action: {
      hover: 'rgba(240, 160, 48, 0.06)',
      selected: 'rgba(240, 160, 48, 0.12)',
      active: 'rgba(240, 160, 48, 0.18)',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontSize: 13,
    h1: { 
      fontSize: '1.5rem', 
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h2: { 
      fontSize: '1.25rem', 
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h3: { 
      fontSize: '1.125rem', 
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: { 
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
    },
    body2: { 
      fontSize: '0.8125rem',
      letterSpacing: '0.01em',
    },
    caption: { 
      fontSize: '0.75rem',
      letterSpacing: '0.02em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: 'rgba(255,255,255,0.06) transparent',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(255,255,255,0.12)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0f1117',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 6,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
          fontWeight: 500,
          padding: '6px 16px',
          fontSize: '0.8125rem',
          transition: 'all 0.15s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(240, 160, 48, 0.25)',
          },
        },
        outlined: {
          borderColor: 'rgba(255,255,255,0.1)',
          '&:hover': {
            borderColor: '#f0a030',
            backgroundColor: 'rgba(240, 160, 48, 0.05)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#94a3b8',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: '#e2e8f0',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#161b24',
          color: '#e2e8f0',
          fontSize: '0.75rem',
          padding: '6px 12px',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
  },
} as any);

const Layout = (): React.ReactElement => {
  const [_isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <Box
      className="graph-studio-layout"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: 'background.default',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box
        className="graph-studio-main"
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <CenterWorkspace />
      </Box>

      <StatusBar />
    </Box>
  );
};

function GraphStudio(): React.ReactElement {
  const theme = createAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <Layout />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default GraphStudio;