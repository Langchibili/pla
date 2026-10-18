import { NextResponse } from 'next/server';

const CHECK_COOKIE = 'placo_pla_check';

function plaStatusUrl(request) {
    const configured = process.env.NEXT_PUBLIC_PLA_FRONTEND_URL?.trim();
    if (!configured) {
        return NextResponse.json(
            { error: 'NEXT_PUBLIC_PLA_FRONTEND_URL is not configured.' },
            { status: 503 },
        );
    }

    let base;
    try {
        base = new URL(configured);
    }
    catch {
        return NextResponse.json(
            { error: 'NEXT_PUBLIC_PLA_FRONTEND_URL is not a valid URL.' },
            { status: 503 },
        );
    }
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
        return NextResponse.json(
            { error: 'NEXT_PUBLIC_PLA_FRONTEND_URL must be an HTTP(S) origin.' },
            { status: 503 },
        );
    }

    const target = new URL('/check-login-status', base.origin);
    target.searchParams.set('redirectTo', 'placo');
    target.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(target);
}

export function proxy(request) {
    if (request.method !== 'GET'
        || request.headers.has('rsc')
        || request.headers.has('next-router-prefetch')
        || request.nextUrl.pathname === '/login'
        || request.nextUrl.pathname === '/logout'
        || request.nextUrl.pathname === '/auth/pla/callback') {
        return NextResponse.next();
    }

    if (request.cookies.has(CHECK_COOKIE)) {
        const response = NextResponse.next();
        response.cookies.delete(CHECK_COOKIE);
        return response;
    }

    return plaStatusUrl(request);
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
};
