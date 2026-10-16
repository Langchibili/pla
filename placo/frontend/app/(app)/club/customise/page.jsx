'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const messageOf = error => error instanceof Error ? error.message : 'The request failed.';

export default function CustomisePage() {
    const { clubId } = useAuth();
    const [squad, setSquad] = useState(null);
    const [stadiums, setStadiums] = useState([]);
    const [kits, setKits] = useState([]);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    const load = useCallback(async () => {
        if (!clubId)
            return false;
        try {
            const [nextSquad, nextStadiums, nextKits] = await Promise.all([
                api.squad(clubId),
                api.stadiums(),
                api.kits(),
            ]);
            setSquad(nextSquad);
            setStadiums(nextStadiums);
            setKits(nextKits);
            setMessage(null);
            return true;
        }
        catch (error) {
            setMessage({ ok: false, text: messageOf(error) });
            return false;
        }
        finally {
            setLoading(false);
        }
    }, [clubId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function choose(fn, successMessage) {
        setBusy(true);
        setMessage(null);
        try {
            await fn();
            if (await load())
                setMessage({ ok: true, text: successMessage });
        }
        catch (error) {
            setMessage({ ok: false, text: messageOf(error) });
        }
        finally {
            setBusy(false);
        }
    }

    if (!clubId)
        return <Alert severity="info">Club not found.</Alert>;
    if (loading && !squad)
        return <LinearProgress />;
    if (!squad)
        return (
            <Stack spacing={2}>
                <Alert severity="error">{message?.text ?? 'Club customisation could not be loaded.'}</Alert>
                <Button onClick={() => { setLoading(true); void load(); }}>Try again</Button>
            </Stack>
        );

    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={900}>Customise</Typography>
                <Stack direction="row" spacing={1}>
                    <Button component={Link} href="/market" size="small">Market</Button>
                    <Button component={Link} href="/club" size="small">Back</Button>
                </Stack>
            </Stack>
            {busy && <LinearProgress />}
            {message && (
                <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            <Typography variant="subtitle2" color="text.secondary">Stadium</Typography>
            {stadiums.map(stadium => {
                const active = squad.stadium === stadium.stadium_code;
                const price = Number(stadium.unlock_price_coins) || 0;
                return (
                    <Card key={stadium.documentId} variant="outlined" sx={active ? { borderColor: 'primary.main' } : undefined}>
                        <CardActionArea
                            disabled={busy}
                            onClick={() => choose(
                                () => api.chooseStadium(clubId, stadium.stadium_code),
                                `${stadium.stadium_name} selected`,
                            )}
                        >
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight={700}>{stadium.stadium_name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {stadium.stadium_code}
                                        {stadium.unlock_currency !== 'none' && price > 0
                                            ? ` · ${price} ${stadium.unlock_currency} · may require unlock`
                                            : ''}
                                    </Typography>
                                </Box>
                                {active && <Chip size="small" color="primary" label="Active" />}
                            </CardContent>
                        </CardActionArea>
                    </Card>
                );
            })}

            <Typography variant="subtitle2" color="text.secondary">Kit</Typography>
            {kits.map(kit => {
                const active = squad.kit === kit.kit_code;
                return (
                    <Card key={kit.documentId} variant="outlined" sx={active ? { borderColor: 'primary.main' } : undefined}>
                        <CardActionArea
                            disabled={busy}
                            onClick={() => choose(
                                () => api.chooseKit(clubId, kit.kit_code),
                                `${kit.kit_name} selected`,
                            )}
                        >
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    aria-hidden="true"
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        border: '3px solid',
                                        borderColor: kit.trim_color || 'primary.main',
                                        background: `linear-gradient(135deg, ${kit.primary_color || '#176b3a'} 50%, ${kit.secondary_color || '#ffffff'} 50%)`,
                                    }}
                                />
                                <Typography fontWeight={700} flex={1}>{kit.kit_name}</Typography>
                                {active && <Chip size="small" color="primary" label="Active" />}
                            </CardContent>
                        </CardActionArea>
                    </Card>
                );
            })}
            <Typography variant="caption" color="text.secondary">
                Items with an unlock price may need to be purchased in the Market before they can be selected.
            </Typography>
        </Stack>
    );
}
