import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middlewareによるwwwからnon-wwwへのリダイレクト
 * Cloudflare Workers環境でも確実に動作する方式
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // www.sneaker-checker.com でアクセスされた場合、非wwwへリダイレクト
  if (hostname.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.hostname = hostname.replace(/^www\./, '');
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // すべてのページに対して実行 (APIやstaticファイルは除く)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)',
  ],
};
