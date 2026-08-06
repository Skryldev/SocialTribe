import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Root, Portal, Overlay, Content, Title, Description, Close } from '@radix-ui/react-dialog';
import { Root as LabelRoot } from '@radix-ui/react-label';
import { styled, keyframes } from '@mui/material/styles';
import { Box, Button, Typography, TextField } from '@mui/material';
import { Edit, X } from 'lucide-react';

// Animations
const overlayShow = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const contentShow = keyframes`
  from { 
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to { 
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
`;

const slideUpAndFade = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Styled Components
const StyledOverlay = styled(Overlay)({
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
  position: 'fixed',
  inset: 0,
  animation: `${overlayShow} 200ms cubic-bezier(0.16, 1, 0.3, 1)`,
  zIndex: 1400,
});

const StyledContent = styled(Content)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2e' : '#ffffff',
  borderRadius: 16,
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: 440,
  maxHeight: '85vh',
  animation: `${contentShow} 300ms cubic-bezier(0.16, 1, 0.3, 1)`,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  padding: 24,
  zIndex: 1401,
  border: `1px solid ${theme.palette.divider}`,
  '&:focus': { outline: 'none' },
}));

const StyledTitle = styled(Title)(({ theme }) => ({
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: theme.palette.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}));

const StyledDescription = styled(Description)(({ theme }) => ({
  margin: 0,
  color: theme.palette.text.secondary,
  fontSize: 14,
  lineHeight: 1.5,
}));

const InputContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  animation: `${slideUpAndFade} 250ms cubic-bezier(0.16, 1, 0.3, 1)`,
  animationDelay: '100ms',
  animationFillMode: 'both',
});

const ActionContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  marginTop: 8,
});

const StyledCloseButton = styled(Close)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  right: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 'none',
  backgroundColor: 'transparent',
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 10,
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
    transition: 'all 200ms ease',
    '& fieldset': {
      borderColor: theme.palette.divider,
      transition: 'all 200ms ease',
    },
    '&:hover fieldset': {
      borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.warning.main,
      borderWidth: 2,
    },
  },
  '& .MuiInputBase-input': {
    padding: '12px 14px',
    fontSize: 15,
    fontFamily: '"Inter", -apple-system, sans-serif',
    '&::placeholder': {
      color: theme.palette.text.disabled,
      opacity: 0.7,
    },
  },
}));

const StyledButton = styled(Button)({
  borderRadius: 10,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: 14,
  padding: '8px 20px',
  transition: 'all 200ms ease',
  height: 40,
});

interface TabTitleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onRename: (newTitle: string) => void;
}

const RenameTabDialog = ({ isOpen, onClose, currentTitle, onRename }: TabTitleEditorProps) => {
  const [title, setTitle] = useState(currentTitle);
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setIsValid(true);
      // Small delay for animation, then focus input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentTitle]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    setIsValid(value.trim().length > 0);
  }, []);

  const handleSubmit = useCallback(() => {
    if (title.trim().length > 0) {
      onRename(title.trim());
      onClose();
    } else {
      setIsValid(false);
      inputRef.current?.focus();
    }
  }, [title, onRename, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSubmit, onClose]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  return (
    <Root open={isOpen} onOpenChange={handleOpenChange}>
      <Portal>
        <StyledOverlay />
        <StyledContent>
          <StyledTitle>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(255, 193, 7, 0.1)' 
                    : 'rgba(255, 193, 7, 0.08)',
                color: 'warning.main',
              }}
            >
              <Edit size={18} />
            </Box>
            Rename Tab
          </StyledTitle>

          <StyledDescription>
            Choose a descriptive name for your query tab. This will help you identify it later.
          </StyledDescription>

          <InputContainer>
            <LabelRoot htmlFor="tab-name" style={{ 
              fontSize: 13, 
              fontWeight: 500, 
              color: 'var(--mui-palette-text-secondary)' 
            }}>
              Tab Name
            </LabelRoot>
            <StyledTextField
              id="tab-name"
              inputRef={inputRef}
              value={title}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter tab name..."
              fullWidth
              autoComplete="off"
              error={!isValid}
              helperText={!isValid ? 'Tab name cannot be empty' : ' '}
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                  'aria-label': 'Tab name',
                  'aria-describedby': 'tab-name-description',
                }
              }}
            />
            <Typography 
              variant="caption" 
              color="text.disabled" 
              sx={{ 
                textAlign: 'right',
                fontSize: 11,
                mt: -0.5
              }}
            >
              {title.length}/50 characters
            </Typography>
          </InputContainer>

          <ActionContainer>
            <StyledButton
              onClick={onClose}
              variant="outlined"
              color="inherit"
              sx={{
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'text.disabled',
                  bgcolor: 'action.hover',
                },
              }}
            >
              Cancel
            </StyledButton>
            <StyledButton
              onClick={handleSubmit}
              variant="contained"
              disabled={!isValid}
              sx={{
                bgcolor: 'warning.main',
                color: '#000',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(255, 193, 7, 0.25)',
                '&:hover': {
                  bgcolor: 'warning.dark',
                  boxShadow: '0 4px 12px rgba(255, 193, 7, 0.35)',
                },
                '&:disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                  boxShadow: 'none',
                },
              }}
            >
              <Edit size={16} style={{ marginRight: 6 }} />
              Rename
            </StyledButton>
          </ActionContainer>

          <StyledCloseButton onClick={onClose} aria-label="Close">
            <X size={18} />
          </StyledCloseButton>
        </StyledContent>
      </Portal>
    </Root>
  );
};

export default RenameTabDialog;