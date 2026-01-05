import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    const signInUrl = new URL("/login", request.nextUrl.origin);
    const callback = request.nextUrl.pathname + request.nextUrl.search;
    signInUrl.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
