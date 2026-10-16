'use client';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import DiamondIcon from '@mui/icons-material/Diamond';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useAuth } from '@/lib/auth';
export default function WalletChips() {
    const { profile } = useAuth();
    const w = profile?.wallet;
    if (!w)
        return null;
    return (<Stack direction="row" spacing={1}>
      <Chip size="small" icon={<MonetizationOnIcon sx={{ color: '#cd7f32 !important' }}/>} label={w.bronze_balance.toLocaleString()}/>
      <Chip size="small" icon={<DiamondIcon sx={{ color: '#5ad1ff !important' }}/>} label={w.diamond_balance.toLocaleString()}/>
    </Stack>);
}
