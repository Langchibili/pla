'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  Fab,
  IconButton,
  LinearProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import CachedRoundedIcon from '@mui/icons-material/CachedRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { haptic } from '@/lib/haptics';
import { mediaUrl } from '@/lib/api';
import ClickableImage from './ClickableImage';

async function compressLandscapeScreenshot(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image screenshot.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.height > bitmap.width) throw new Error('Upload the original landscape screenshot.');
    const scale = Math.min(1, 1920 / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this screenshot.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let compressed = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    while (compressed && compressed.size > 2 * 1024 * 1024 && quality > 0.4) {
      quality -= 0.1;
      compressed = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    }
    if (!compressed) throw new Error('Could not compress this screenshot.');
    return new File([compressed], 'match-result.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close?.();
  }
}

export default function DocumentUploadCard({ onUpload, uploadedFile = null, disabled = false }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [file, setFile] = useState(uploadedFile);
  const [previewUrl, setPreviewUrl] = useState(() => uploadedFile?.url ? mediaUrl(uploadedFile) : null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState('');
  const [dragging, setDragging] = useState(false);
  const visibleFile = file || uploadedFile;
  const visiblePreview = previewUrl || (uploadedFile?.url ? mediaUrl(uploadedFile) : null);

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let disposed = false;
    Promise.resolve().then(() => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is unavailable on this device.');
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
    }).then((stream) => {
      if (disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setCameraReady(false);
      setCameraError('');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    }).catch((cameraFailure) => {
      setCameraError(cameraFailure?.name === 'NotAllowedError'
        ? 'Camera permission was denied.'
        : 'Camera is unavailable on this device.');
    });
    return () => {
      disposed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen, facingMode]);

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const processFile = async (selectedFile) => {
    setBusy(true);
    setProgress(8);
    setError('');
    const timer = setInterval(() => setProgress((current) => Math.min(92, current + 9)), 180);
    try {
      const prepared = await compressLandscapeScreenshot(selectedFile);
      const localPreview = URL.createObjectURL(prepared);
      setPreviewUrl((previous) => {
        if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
        return localPreview;
      });
      setFile(prepared);
      await onUpload(prepared);
      setProgress(100);
      haptic('success');
    } catch (uploadError) {
      setError(uploadError?.message || 'Screenshot upload failed.');
      setFile(null);
      setPreviewUrl((previous) => {
        if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
        return null;
      });
    } finally {
      clearInterval(timer);
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !cameraReady) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return;
    setCameraOpen(false);
    await processFile(new File([blob], 'camera-result.jpg', { type: 'image/jpeg' }));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) void processFile(droppedFile);
  };

  return (
    <Box>
      <Dialog open={cameraOpen} onClose={() => setCameraOpen(false)} fullScreen PaperProps={{ sx: { bgcolor: '#000' } }}>
        <DialogContent sx={{ p: 0, position: 'relative', display: 'grid', placeItems: 'center' }}>
          <IconButton aria-label="Close camera" onClick={() => setCameraOpen(false)} sx={{ position: 'absolute', top: 2, right: 2, zIndex: 3, color: 'white' }}>
            <CloseRoundedIcon />
          </IconButton>
          {cameraError ? <Typography color="white" sx={{ p: 3 }}>{cameraError}</Typography> : <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: cameraReady ? 1 : 0.3 }} />}
          {cameraReady && <Box sx={{ position: 'absolute', bottom: 'max(28px, env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Tooltip title="Flip camera"><span><IconButton aria-label="Flip camera" onClick={() => setFacingMode((mode) => mode === 'environment' ? 'user' : 'environment')} sx={{ color: 'white' }}><CachedRoundedIcon /></IconButton></span></Tooltip>
            <Fab aria-label="Capture screenshot" onClick={capturePhoto} sx={{ bgcolor: 'white', color: 'secondary.main' }}><CameraAltRoundedIcon /></Fab>
          </Box>}
        </DialogContent>
      </Dialog>

      {visiblePreview && <ClickableImage src={visiblePreview} alt="Match screenshot preview" sx={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 2, mb: 1.5, bgcolor: 'black' }} />}
      <Box onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        sx={{ border: '1px dashed', borderColor: dragging ? 'secondary.main' : 'divider', borderRadius: 2, p: 2, textAlign: 'center' }}>
        <Typography fontWeight={700}>{visibleFile ? 'Screenshot ready' : 'Add your full-time result'}</Typography>
        <Typography variant="caption" color="text.secondary">Landscape image · JPEG, PNG, or WebP · up to 10 MB</Typography>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void processFile(selected); }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
          <Button fullWidth variant="contained" color="secondary" disabled={disabled || busy} startIcon={<CloudUploadRoundedIcon />} onClick={() => fileInputRef.current?.click()}>
            {busy ? 'Uploading…' : file ? 'Upload another' : 'Choose screenshot'}
          </Button>
          <Tooltip title="Take a screenshot photo"><span><IconButton aria-label="Open camera" disabled={disabled || busy} onClick={() => setCameraOpen(true)}><CameraAltRoundedIcon /></IconButton></span></Tooltip>
        </Box>
      </Box>
      {busy && <LinearProgress variant="determinate" value={progress} color="secondary" sx={{ mt: 1, borderRadius: 1 }} />}
      {file && !busy && <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}><CheckCircleOutlineRoundedIcon fontSize="inherit" /> Screenshot uploaded</Typography>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
}
