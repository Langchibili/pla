import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
export default function StatTile({ label, value }) {
    return (<Box sx={{ flex: 1, p: 1.5, borderRadius: 3, bgcolor: 'background.paper', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Typography variant="h6" fontWeight={800}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>);
}
