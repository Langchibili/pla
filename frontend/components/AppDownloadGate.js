'use client';
import { Box, Button, Typography } from '@mui/material';
import KenteStripe from './KenteStripe';

export default function AppDownloadGate() {
  const androidUrl = process.env.NEXT_PUBLIC_ANDROID_APP_LINK;
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_LINK;

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', alignContent: 'center', gap: 2, px: 3, py: 6, maxWidth: 480, mx: 'auto' }}>
      <Typography variant="overline" color="secondary.main">ProLeague Africa</Typography>
      <Typography variant="h3" sx={{ lineHeight: 1.1 }}>Play your tournament in the app.</Typography>
      <KenteStripe height={6} sx={{ width: 128 }} />
      <Typography color="text.secondary">Download the app to create an account, enter tournaments, and manage your matches.</Typography>
      {androidUrl && <Button component="a" href={androidUrl} target="_blank" rel="noreferrer" variant="contained" color="secondary">Download for Android</Button>}
      {iosUrl && <Button component="a" href={iosUrl} target="_blank" rel="noreferrer" variant="outlined" color="secondary">Download for iPhone</Button>}
      {!androidUrl && !iosUrl && <Typography variant="body2" color="text.secondary">App download links are not configured yet.</Typography>}
    </Box>
  );
}
