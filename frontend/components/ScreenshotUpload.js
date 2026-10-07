'use client';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import { useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/hooks/useToast';

// Compress in-browser (low-data), enforce landscape, then hand the File back
async function prepare(file) {
  const bmp = await createImageBitmap(file);
  if (bmp.height > bmp.width) throw new Error('Upload the original landscape screenshot.');
  const scale = Math.min(1, 1920 / bmp.width);
  const c = document.createElement('canvas'); c.width = bmp.width * scale; c.height = bmp.height * scale;
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  return new File([blob], 'result.jpg', { type: 'image/jpeg' });
}

export default function ScreenshotUpload({ onUpload, disabled }) {
  const ref = useRef(); const toast = useToast();
  const [busy, setBusy] = useState(false); const [preview, setPreview] = useState(null);
  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { const p = await prepare(f); setPreview(URL.createObjectURL(p)); await onUpload(p); haptic('success'); }
    catch (err) { toast(err.message, 'error'); setPreview(null); }
    finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <Box>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      {preview && <Box component="img" src={preview} alt="Your screenshot" sx={{ width: '100%', borderRadius: 4, mb: 1.5, boxShadow: 10 }} />}
      {busy && <LinearProgress color="secondary" sx={{ mb: 1.5, borderRadius: 9 }} />}
      <Button fullWidth size="large" variant="contained" color="secondary" disabled={disabled || busy} startIcon={<CloudUploadRoundedIcon />} onClick={() => { haptic('medium'); ref.current.click(); }}>Upload full-time screenshot</Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>Landscape only. The score must be in the area your game shows at full time.</Typography>
    </Box>
  );
}
