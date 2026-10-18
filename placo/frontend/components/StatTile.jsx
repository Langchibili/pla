import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
export default function StatTile({ label, value }) {
    return (<Box sx={{ flex: 1, minWidth: 0, p: { xs: 1.2, sm: 1.5 }, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.035)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h6" fontWeight={900} sx={{ color: '#f4cb34', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.7, fontSize: 9 }}>{label}</Typography>
    </Box>);
}
