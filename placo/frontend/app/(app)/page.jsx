'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import StatTile from '@/components/StatTile';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const messageOf = error => error instanceof Error ? error.message : 'The request failed.';

export default function HomePage() {
    const { profile, logout } = useAuth();
    const [matches, setMatches] = useState([]);
    const [matchesError, setMatchesError] = useState(null);

    useEffect(() => {
        let active = true;
        api.myMatches()
            .then(records => {
                if (active)
                    setMatches(records);
            })
            .catch(error => {
                if (active)
                    setMatchesError(messageOf(error));
            });
        return () => {
            active = false;
        };
    }, []);

    if (!profile)
        return null;

    return (
        <Stack spacing={2.25} sx={{ pb: 2 }}>
            <Box sx={{
                position: 'relative', overflow: 'hidden', minHeight: 208, p: { xs: 2.5, sm: 3.5 },
                display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: 4,
                border: '1px solid rgba(244,203,52,0.28)',
                background: 'linear-gradient(118deg, rgba(11,70,41,0.98), rgba(7,24,17,0.98) 72%)',
                boxShadow: '0 18px 42px rgba(0,0,0,0.22)',
            }}>
                <Box component="svg" viewBox="0 0 240 140" aria-hidden="true" sx={{ position: 'absolute', width: '45%', maxWidth: 250, right: '-2%', top: '50%', transform: 'translateY(-50%)', opacity: 0.24, color: '#eaf5ee' }}>
                    <rect x="8" y="8" width="224" height="124" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M120 8v124M8 42h30v56H8m224-56h-30v56h30" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="120" cy="70" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="120" cy="70" r="2" fill="currentColor" />
                </Box>
                <Typography variant="overline" fontWeight={900} letterSpacing={2} color="#f4cb34">PRO LEAGUE AFRICA · CLUB OWNERS</Typography>
                <Typography variant="h4" fontWeight={950} sx={{ maxWidth: 420, mt: 0.4, lineHeight: 1.05 }}>
                    {profile.public_handle}
                </Typography>
                <Typography color="rgba(234,245,238,0.72)" variant="body2" sx={{ mt: 0.8 }}>
                    Build your club. Make every match count.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.7 }}>
                    <Chip size="small" label={profile.country?.name ?? 'Africa'} sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700 }} />
                    <Chip size="small" label={`${profile.app_xp.toLocaleString()} XP`} sx={{ bgcolor: 'rgba(244,203,52,0.16)', color: '#f4cb34', fontWeight: 800 }} />
                </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
                <StatTile label="Played" value={profile.matches_played} />
                <StatTile label="Wins" value={profile.wins} />
                <StatTile label="Draws" value={profile.draws} />
                <StatTile label="Losses" value={profile.losses} />
            </Stack>
            <Button
                component={Link}
                href="/play"
                variant="contained"
                size="large"
                startIcon={<SportsSoccerIcon />}
                sx={{ py: 1.7, px: 2.5, fontSize: 16, fontWeight: 900, borderRadius: 3, justifyContent: 'flex-start', boxShadow: '0 8px 22px rgba(15,107,58,0.25)' }}
            >
                Kick off a match
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={900}>Recent matches</Typography>
                <Typography variant="caption" color="text.secondary">YOUR SEASON</Typography>
            </Box>
            {matchesError && <Alert severity="error">{matchesError}</Alert>}
            <Stack spacing={1}>
                {matches.length === 0 && !matchesError && (
                    <Card sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(120deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))' }}>
                        <CardContent sx={{ py: '18px !important' }}>
                            <Typography fontWeight={800}>Your season starts here</Typography>
                            <Typography color="text.secondary" variant="body2">Play a training match to record your first result.</Typography>
                        </CardContent>
                    </Card>
                )}
                {matches.map(match => (
                    <Card key={match.documentId} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)' }}>
                        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '12px !important' }}>
                            <Box>
                                <Typography fontWeight={900} fontSize={18}>{match.home_score ?? '–'} : {match.away_score ?? '–'}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {match.match_mode} · {match.match_code}
                                </Typography>
                            </Box>
                            <Chip size="small" label={match.match_status.replace('_', ' ')} sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                        </CardContent>
                    </Card>
                ))}
            </Stack>
            <Button color="inherit" onClick={logout} sx={{ alignSelf: 'flex-start', opacity: 0.62, textTransform: 'none' }}>Sign out</Button>
        </Stack>
    );
}
