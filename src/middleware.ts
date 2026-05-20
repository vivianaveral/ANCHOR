import { NextRequest, NextResponse } from 'next/server';

/**
 * HTTP Basic Auth middleware — protects the entire app.
 *
 * Set APP_USERNAME and APP_PASSWORD in your environment variables.
 * The /api/sync route is exempted because it uses its own CRON_SECRET auth.
 */
export function middleware(request: NextRequest) {
  // Let the cron sync route handle its own auth
  if (request.nextUrl.pathname === '/api/sync') {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    const encoded = authHeader.slice('Basic '.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    const username = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    const validUsername = process.env.APP_USERNAME ?? 'bruntwork';
    const validPassword = process.env.APP_PASSWORD ?? '';

    if (validPassword && username === validUsername && password === validPassword) {
      return NextResponse.next();
    }
  }

  // No valid credentials — trigger browser login dialog
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="ANCHOR Coaching Intelligence", charset="UTF-8"',
    },
  });
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
