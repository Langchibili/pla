import { NextResponse } from 'next/server';

export async function POST(request) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    let originUrl;
    try {
        originUrl = origin ? new URL(origin) : null;
    }
    catch {
        originUrl = null;
    }
    if (!originUrl || !['http:', 'https:'].includes(originUrl.protocol) || !host || originUrl.host !== host) {
        return NextResponse.json({ error: 'The PLA check must complete on this PLACO origin.' }, { status: 403 });
    }

    const response = NextResponse.json({ checked: true });
    response.cookies.set('placo_pla_check', '1', {
        httpOnly: true,
        secure: originUrl.protocol === 'https:',
        sameSite: 'lax',
        path: '/',
        maxAge: 30,
    });
    return response;
}
