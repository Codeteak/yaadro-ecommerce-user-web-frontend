import { NextResponse } from 'next/server';
import { reverseGeocodeUpstream } from '../../../../utils/geocoding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/geocode/reverse?lat=&lng=&zoom=
 * Server-side Nominatim/LocationIQ reverse geocode for the browser.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng') ?? searchParams.get('lon'));
  const zoomRaw = searchParams.get('zoom');
  const zoom = zoomRaw != null && zoomRaw !== '' ? Number(zoomRaw) : 18;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { status: 'error', message: 'lat and lng are required' },
      { status: 400 }
    );
  }

  try {
    const data = await reverseGeocodeUpstream(lat, lng, {
      zoom: Number.isFinite(zoom) ? zoom : 18,
    });
    if (!data) {
      return NextResponse.json({ status: 'success', data: null }, { status: 404 });
    }
    return NextResponse.json({ status: 'success', data });
  } catch (err) {
    console.error('[geocode/reverse]', err?.message || err);
    return NextResponse.json(
      {
        status: 'error',
        message: err?.message || 'Reverse geocode failed',
      },
      { status: 502 }
    );
  }
}
