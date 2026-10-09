'use client';
import { useState } from 'react';
import { Box, Button, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DocumentUploadCard from './DocumentUploadCard';
import { mediaUrl } from '@/lib/api';
import ClickableImage from './ClickableImage';

export default function ScreenshotUpload({ onUpload, disabled, example }) {
  const [exampleOpen, setExampleOpen] = useState(false);
  const exampleUrl = mediaUrl(example);
  return (
    <Box>
      <DocumentUploadCard onUpload={onUpload} disabled={disabled} />
      {exampleUrl && (
        <>
          <Button sx={{ mt: 1 }} onClick={() => setExampleOpen(true)}>See screenshot example</Button>
          <Dialog open={exampleOpen} onClose={() => setExampleOpen(false)} fullWidth maxWidth="md" aria-labelledby="screenshot-example-title">
            <DialogContent sx={{ position: 'relative', pt: 4 }}>
              <IconButton aria-label="Close screenshot example" onClick={() => setExampleOpen(false)} sx={{ position: 'absolute', top: 4, right: 4 }}>
                <CloseRoundedIcon />
              </IconButton>
              <Typography id="screenshot-example-title" variant="h6" sx={{ mb: 1.5 }}>Screenshot example</Typography>
              <ClickableImage src={exampleUrl} alt={example.alternativeText || 'Example of an acceptable match screenshot'} sx={{ display: 'block', width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 2, mx: 'auto' }} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </Box>
  );
}
