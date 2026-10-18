import { NextResponse } from 'next/server';

export async function POST(request) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    let originHost;
    try {
        originHost = origin ? new URL(origin).host : null;
    }
    catch {
        originHost = null;
    }
    if (!originHost || !host || originHost !== host) {
        return NextResponse.json({ error: 'The PLA check must complete on this PLACO origin.' }, { status: 403 });
    }

    const response = NextResponse.json({ checked: true });
    response.cookies.set('placo_pla_check', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30,
    });
    return response;
}
