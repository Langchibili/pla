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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import StarIcon from '@mui/icons-material/Star';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const average = attributes => {
    const values = Object.values(attributes ?? {}).filter(value => typeof value === 'number');
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
};

const messageOf = error => error instanceof Error ? error.message : 'The request failed.';

export default function ClubPage() {
    const { clubId, refresh } = useAuth();
    const [squad, setSquad] = useState(null);
    const [formations, setFormations] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [attribute, setAttribute] = useState('');
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        if (!clubId)
            return;
        try {
            const [nextSquad, nextFormations] = await Promise.all([api.squad(clubId), api.formations()]);
            setSquad(nextSquad);
            setFormations(nextFormations);
            setError(null);
        }
        catch (requestError) {
            setError(messageOf(requestError));
        }
        finally {
            setLoading(false);
        }
    }, [clubId]);

    useEffect(() => {
        void load();
    }, [load]);

    if (!clubId)
        return <Alert severity="info">Club not found.</Alert>;
    if (loading && !squad)
        return <LinearProgress />;

    async function setFormation(code) {
        setBusy(true);
        setError(null);
        try {
            await api.chooseFormation(clubId, code);
            await load();
        }
        catch (requestError) {
            setError(messageOf(requestError));
        }
        finally {
            setBusy(false);
        }
    }

    async function upgradePlayer() {
        if (!selectedPlayer || !attribute)
            return;
        setBusy(true);
        setError(null);
        try {
            await api.upgradePlayer(selectedPlayer.documentId, attribute, 'bronze');
            setSelectedPlayer(null);
            await Promise.all([load(), refresh()]);
        }
        catch (requestError) {
            setError(messageOf(requestError));
        }
        finally {
            setBusy(false);
        }
    }

    if (!squad)
        return (
            <Stack spacing={2}>
                <Alert severity="error">The club squad could not be loaded. {error}</Alert>
                <Button onClick={() => { setLoading(true); void load(); }}>Try again</Button>
            </Stack>
        );

    const players = [...squad.players].sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));

    return (
        <Stack spacing={2}>
            <Typography variant="h5" fontWeight={900}>{squad.club.club_name}</Typography>
            <Stack direction="row" spacing={1}>
                <Button component={Link} href="/club/customise" size="small" variant="outlined">Stadium &amp; kit</Button>
                <Button component={Link} href="/club/managers" size="small" variant="outlined">Managers</Button>
            </Stack>
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
            {busy && <LinearProgress />}

            <Typography variant="subtitle2" color="text.secondary">Formation</Typography>
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                {formations.map(formation => (
                    <Chip
                        key={formation.documentId}
                        label={formation.formation_name ?? formation.formation_code}
                        clickable
                        color={squad.formation?.formation_code === formation.formation_code ? 'primary' : 'default'}
                        onClick={() => setFormation(formation.formation_code)}
                        disabled={busy}
                    />
                ))}
            </Stack>

            <Typography variant="subtitle2" color="text.secondary">Squad</Typography>
            <Stack spacing={1}>
                {players.map(player => (
                    <Card key={player.documentId}>
                        <CardActionArea
                            disabled={busy}
                            onClick={() => {
                                setSelectedPlayer(player);
                                setAttribute(Object.keys(player.attributes ?? {})[0] ?? '');
                            }}
                        >
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                                <Chip size="small" label={player.slot} color="primary" variant="outlined" />
                                <div style={{ flex: 1 }}>
                                    <Typography fontWeight={700}>{player.template?.display_name ?? player.slot}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {player.position} · {player.squad_role}
                                    </Typography>
                                </div>
                                {player.is_premium && <StarIcon fontSize="small" color="secondary" />}
                                <Typography variant="h6" fontWeight={900}>
                                    {player.template?.overall_rating ?? average(player.attributes)}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Stack>

            <Dialog open={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} fullWidth>
                <DialogTitle>{selectedPlayer?.template?.display_name ?? selectedPlayer?.slot}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1} mt={1}>
                        {selectedPlayer && Object.entries(selectedPlayer.attributes ?? {}).map(([key, value]) => (
                            <Stack key={key} direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">{key.replace(/_/g, ' ')}</Typography>
                                <Typography variant="body2" fontWeight={700}>{value}</Typography>
                            </Stack>
                        ))}
                        <Typography variant="caption" color="text.secondary" mt={1}>Develop (bronze coins)</Typography>
                        <Select size="small" value={attribute} onChange={event => setAttribute(event.target.value)}>
                            {selectedPlayer && Object.keys(selectedPlayer.attributes ?? {}).map(key => (
                                <MenuItem key={key} value={key}>{key.replace(/_/g, ' ')}</MenuItem>
                            ))}
                        </Select>
                        <Button variant="contained" onClick={upgradePlayer} disabled={busy || !attribute}>Upgrade</Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
