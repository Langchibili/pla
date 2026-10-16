import crypto from 'node:crypto';
/**
 * Signs the engine result with MATCH_ENGINE_HMAC_SECRET and forwards it to Strapi.
 * The secret lives only here (server side). The canonical string must match
 * Strapi's signatureFor(): `${timestamp}.${METHOD}.${path}.${JSON.stringify(body)}`.
 *
 * SECURITY NOTE: until the simulation also runs server-side (or is replayed/verified
 * there), a modified client can submit a fabricated score for its own match. This route
 * only proves the caller is a participant of an in-progress match. Do not enable cash
 * tournaments (cash_tournaments_enabled) on top of this without server-side verification.
 */
const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1344/api').replace(/\/$/, '');
export async function POST(req) {
    const secret = process.env.MATCH_ENGINE_HMAC_SECRET?.trim();
    if (!secret)
        return Response.json({ error: 'Result signing is not configured' }, { status: 503 });
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer '))
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let body;
    try {
        body = await req.json();
    }
    catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const matchId = String(body?.match_document_id ?? '');
    if (!matchId)
        return Response.json({ error: 'match_document_id required' }, { status: 400 });
    // Participant check using the caller's own JWT
    const mine = await fetch(`${STRAPI}/me/matches?limit=50`, { headers: { authorization: auth }, cache: 'no-store' });
    if (!mine.ok) {
        const status = mine.status === 401 || mine.status === 403 ? 401 : 502;
        return Response.json({ error: status === 401 ? 'Unauthorized' : 'Could not verify match ownership' }, { status });
    }
    let mineBody;
    try {
        mineBody = await mine.json();
    }
    catch {
        return Response.json({ error: 'Backend returned invalid JSON while checking match ownership' }, { status: 502 });
    }
    const list = mineBody?.data;
    if (!Array.isArray(list))
        return Response.json({ error: 'Backend returned an invalid match list' }, { status: 502 });
    const match = list.find(m => m.documentId === matchId);
    if (!match)
        return Response.json({ error: 'Not your match' }, { status: 403 });
    if (!['in_progress', 'awaiting_verification', 'verified'].includes(match.match_status))
        return Response.json({ error: `Match is ${match.match_status}` }, { status: 409 });
    const payload = { ...body, result_submission_id: `sub:${matchId}`, signature_key_id: 'next-bridge-v1' };
    const url = new URL(STRAPI);
    const path = `${url.pathname.replace(/\/$/, '')}/matches/engine-finalise`; // e.g. /api/matches/engine-finalise
    const ts = String(Date.now());
    const signature = crypto.createHmac('sha256', secret)
        .update(`${ts}.POST.${path}.${JSON.stringify(payload)}`).digest('hex');
    const res = await fetch(`${STRAPI}/matches/engine-finalise`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-placo-timestamp': ts, 'x-placo-signature': signature },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });
    let out;
    try {
        out = await res.json();
    }
    catch {
        return Response.json({ error: 'Backend returned invalid JSON while finalising the match' }, { status: 502 });
    }
    return Response.json(out, { status: res.status });
}
