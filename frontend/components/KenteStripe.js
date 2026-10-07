import { Box } from '@mui/material';
import { kente } from '@/lib/theme';
export default function KenteStripe({ height = 4, sx }) { return <Box sx={{ height, background: kente, borderRadius: 99, ...sx }} />; }
