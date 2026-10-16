'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

export default function GlobalError({ reset }) {
    return (
        <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}>
            <Stack spacing={2} alignItems="center" textAlign="center">
                <Typography variant="h5" fontWeight={900}>Something went wrong</Typography>
                <Typography color="text.secondary" variant="body2">
                    The page could not be displayed. Please try again.
                </Typography>
                <Button variant="contained" onClick={reset}>Try again</Button>
            </Stack>
        </Box>
    );
}
