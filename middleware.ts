import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const session = await auth()
  const pathname = request.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = ['/', '/login', '/signup']
  const isPublicPath = publicPaths.some(path => pathname === path) || 
                      pathname.startsWith('/api/auth') || 
                      pathname.startsWith('/auth/callback')

  // Redirect authenticated users away from login/signup
  if (session && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect unauthenticated users to login
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
} 