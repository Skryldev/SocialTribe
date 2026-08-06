import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

type ShowSnackbarFn = (msg: string, sev?: string) => void;

const SnackbarContext = createContext<ShowSnackbarFn | null>(null);

export const useSnackbar = (): ShowSnackbarFn => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider = ({ children }: SnackbarProviderProps): React.ReactElement => {
  const [open, setOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [severity, setSeverity] = useState<string>('info');

  const showSnackbar = useCallback((msg: string, sev: string = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const handleClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={handleClose}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      >
        <Alert
          onClose={handleClose}
          severity={severity as any}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export default SnackbarContext;