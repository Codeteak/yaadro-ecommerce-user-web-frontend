import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hard-block the component playground in production so it cannot be
 * reached even if a page were prerendered.
 */
export function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.pathname.startsWith("/playground")
  ) {
    return new NextResponse(null, { status: 404, statusText: "Not Found" });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/playground", "/playground/:path*"],
};
