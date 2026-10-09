'use client';
import { useState } from 'react';
import { Box, Dialog, DialogContent, IconButton } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export default function ClickableImage({ src, alt = '', sx, ...props }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  const openViewer = (event) => {
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <Box
        component="img"
        src={src}
        alt={alt}
        role="button"
        tabIndex={0}
        onClick={openViewer}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openViewer(event);
          }
        }}
        sx={{ cursor: 'zoom-in', ...sx }}
        {...props}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen
        aria-label={alt || 'Full-screen image'}
        PaperProps={{ sx: { bgcolor: 'rgba(0, 0, 0, 0.96)' } }}
      >
        <DialogContent sx={{ p: 0, display: 'grid', placeItems: 'center', position: 'relative' }}>
          <IconButton
            aria-label="Close full-screen image"
            onClick={() => setOpen(false)}
            sx={{
              position: 'absolute',
              zIndex: 1,
              top: 'max(12px, env(safe-area-inset-top))',
              right: 'max(12px, env(safe-area-inset-right))',
              color: '#fff',
              bgcolor: 'rgba(0, 0, 0, 0.55)',
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
