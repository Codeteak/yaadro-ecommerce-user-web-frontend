export async function POST(request) {
  try {
    const body = await request.json();
    const method = body?.method || 'GET';
    const url = body?.url || '';
    const status = body?.status;
    const ms = body?.ms;
    const line = `[API:client] ${method} ${url} -> ${status}${ms != null ? ` (${ms}ms)` : ''}`;
    // This prints in the Next dev terminal (server-side).
    // eslint-disable-next-line no-console
    console.log(line);
  } catch {
    // eslint-disable-next-line no-console
    console.log('[API:client] (invalid log payload)');
  }

  return new Response(null, { status: 204 });
}

