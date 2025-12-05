import { NextRequest, NextResponse } from 'next/server';

// CSRF защита и базовая безопасность (SEC-006)
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // CSRF защита для state-changing операций
  if (method !== 'GET' && method !== 'HEAD') {
    // Для API routes проверяем Origin header
    if (pathname.startsWith('/api/')) {
      // В продакшене проверяем Origin
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

        if (origin && !allowedOrigins.includes(origin) && origin !== baseUrl) {
          return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
        }
      }
    }
  }

  // Security headers уже добавлены в next.config.ts, но можно добавить дополнительные здесь

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
