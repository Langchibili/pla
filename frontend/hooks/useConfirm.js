'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmationProvider({ children }) {
  const resolver = useRef(null);
  const [options, setOptions] = useState(null);

  const close = useCallback((accepted) => {
    resolver.current?.(accepted);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions({
      title: nextOptions.title,
      message: nextOptions.message,
      confirmText: nextOptions.confirmText || 'Confirm',
      cancelText: nextOptions.cancelText || 'Cancel',
      destructive: Boolean(nextOptions.destructive),
    });
  }), []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={Boolean(options)}
        onClose={() => close(false)}
        aria-labelledby="pla-confirm-title"
        aria-describedby="pla-confirm-message"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="pla-confirm-title">{options?.title}</DialogTitle>
        <DialogContent>
          <Typography id="pla-confirm-message" color="text.secondary">{options?.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => close(false)}>{options?.cancelText}</Button>
          <Button
            variant="contained"
            color={options?.destructive ? 'error' : 'secondary'}
            onClick={() => close(true)}
            autoFocus
          >
            {options?.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
