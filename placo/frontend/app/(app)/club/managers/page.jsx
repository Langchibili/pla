'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import StarIcon from '@mui/icons-material/Star';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const label = value => value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
const messageOf = error => error instanceof Error ? error.message : 'The request failed.';

export default function ManagersPage() {
    const { clubId } = useAuth();
    const [managers, setManagers] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [message, setMessage] = useState(null);
    const [busy, setBusy] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setManagers(await api.managers());
            setLoadError(null);
            return true;
        }
        catch (error) {
            setManagers(null);
            setLoadError(messageOf(error));
            return false;
        }
        finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;
        queueMicrotask(() => {
            if (active)
                void load();
        });
        return () => {
            active = false;
        };
    }, [load]);

    async function select(manager) {
        setBusy(manager.documentId);
        setMessage(null);
        try {
            await api.chooseManager(clubId, manager.documentId);
            if (await load())
                setMessage({ ok: true, text: `${manager.name} is now your manager.` });
        }
        catch (error) {
            setMessage({ ok: false, text: messageOf(error) });
        }
        finally {
            setBusy(null);
        }
    }

    if (!clubId)
        return <Alert severity="info">Club not found.</Alert>;
    if (loading && managers === null && !loadError)
        return <LinearProgress />;

    return (
        <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={900}>Managers</Typography>
                <Button component={Link} href="/club" size="small">Back</Button>
            </Stack>
            {loading && <LinearProgress />}
            {loadError && (
                <Alert
                    severity="error"
                    action={<Button color="inherit" size="small" onClick={() => { setLoading(true); void load(); }}>Retry</Button>}
                >
                    {loadError}
                </Alert>
            )}
            {message && (
                <Alert severity={message.ok ? 'success' : 'error'} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}
            {managers?.length === 0 && !loadError && (
                <Typography color="text.secondary">No managers yet. Buy one in the Market.</Typography>
            )}
            {managers?.map(manager => (
                <Card key={manager.documentId} variant="outlined" sx={manager.is_selected ? { borderColor: 'primary.main' } : undefined}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight={800} flex={1}>{manager.name}</Typography>
                            {manager.premium_tier !== 'standard' && <StarIcon fontSize="small" color="secondary" />}
                            {manager.is_selected && <Chip size="small" color="primary" label="Selected" />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            {manager.archetype ? label(manager.archetype) : 'balanced'} · level {manager.experience_level}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} mt={1}>
                            {Object.entries(manager.modifiers ?? {}).map(([key, value]) => (
                                <Chip key={key} size="small" variant="outlined" label={`${label(key)} ${value}`} />
                            ))}
                        </Stack>
                        {!manager.is_selected && (
                            <Button
                                fullWidth
                                variant="contained"
                                size="small"
                                sx={{ mt: 1.5 }}
                                disabled={busy !== null}
                                onClick={() => select(manager)}
                            >
                                {busy === manager.documentId ? 'Selecting…' : 'Select'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ))}
            <Typography variant="caption" color="text.secondary">
                Manager modifiers are shown for now; the match simulation does not yet apply them.
            </Typography>
        </Stack>
    );
}
