import { Box, Skeleton } from '@mui/material';
export default function SkeletonList({ count = 3, height = 150 }) {
  return <Box sx={{ display: 'grid', gap: 2 }}>{Array.from({ length: count }, (_, i) => <Skeleton key={i} variant="rounded" height={height} sx={{ borderRadius: 6, bgcolor: 'rgba(255,255,255,.06)' }} animation="wave" />)}</Box>;
}
