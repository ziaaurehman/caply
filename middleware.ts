import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const pathname = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/signup", "/invite", ""];
  const isPublicPath =
    publicPaths.some((path) => pathname === path) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/verify-email") || // ✅ ADD THIS
    pathname.startsWith("/demo");

  // Redirect authenticated users away from login/signup to dashboard
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
