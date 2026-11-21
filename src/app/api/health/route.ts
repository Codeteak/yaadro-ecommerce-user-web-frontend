import { NextResponse } from "next/server";

/**
 * Lightweight liveness for Docker/ALB. Does not touch Postgres or the shop API.
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, service: "customer-web", ts: Date.now() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
