'use client';
import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
const TYPES = ['player', 'manager', 'stadium', 'kit'];
export default function MarketPage() {
    const { refresh } = useAuth();
    const [offers, setOffers] = useState(null);
    const [tab, setTab] = useState('player');
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(null);
    useEffect(() => { api.catalog().then(setOffers).catch(e => setMsg({ ok: false, text: e.message })); }, []);
    async function buy(o) {
        setBusy(o.offer_code);
        setMsg(null);
        try {
            await api.buy(o.offer_code);
            setMsg({ ok: true, text: `Purchased ${o.offer_name}` });
            await refresh();
            setOffers(await api.catalog());
        }
        catch (e) {
            setMsg({ ok: false, text: e.message });
        }
        finally {
            setBusy(null);
        }
    }
    if (!offers)
        return <LinearProgress />;
    const list = offers.filter(o => o.offer_type === tab);
    return (<Stack spacing={2}>
      <Typography variant="h5" fontWeight={900}>Market</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        {TYPES.map(t => <Tab key={t} value={t} label={t} sx={{ textTransform: 'capitalize' }}/>)}
      </Tabs>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      {list.length === 0 && <Typography color="text.secondary">Nothing on sale here right now.</Typography>}
      {list.map(o => (<Card key={o.documentId}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <div style={{ flex: 1 }}>
              <Typography fontWeight={800}>{o.offer_name}</Typography>
              {o.player_template && (<Typography variant="caption" color="text.secondary">
                  P-{o.player_template.position_number} · OVR {o.player_template.overall_rating} · {o.player_template.premium_tier}
                </Typography>)}
              {o.stock_limit != null && <Chip size="small" sx={{ ml: 1 }} label={`${o.stock_limit - o.stock_sold} left`}/>}
            </div>
            <Button variant="contained" size="small" disabled={busy === o.offer_code} onClick={() => buy(o)}>
              {o.price_coins.toLocaleString()} {o.price_coin_type === 'diamond' ? '💎' : '🪙'}
            </Button>
          </CardContent>
        </Card>))}
    </Stack>);
}
