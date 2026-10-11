import { NextResponse } from 'next/server';

export async function GET() {
  const txUrl = 'http://127.0.0.1:40120';
  let isOnline = false;
  let latencyMs = 0;
  let serverName = 'ApexMidnight';
  let txaVersion = '8.1.1';

  try {
    const start = Date.now();
    const res = await fetch(`${txUrl}/status`, {
      method: 'GET',
      headers: { 'User-Agent': 'Apex-Admin-Panel' },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3500),
    });
    latencyMs = Date.now() - start;
    if (res.ok || res.status === 200 || res.status === 302) {
      isOnline = true;
    }
  } catch (err) {
    isOnline = false;
  }

  return NextResponse.json({
    online: isOnline,
    latencyMs,
    txAdminExternalUrl: 'http://192.168.2.35:40120',
    serverName,
    txaVersion,
    timestamp: new Date().toISOString(),
  });
}
