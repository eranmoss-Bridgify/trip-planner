const BRIDGIFY_BASE = process.env.BRIDGIFY_BASE_URL ?? 'https://api.dev.bridgify.io';
const CLIENT_ID = process.env.BRIDGIFY_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.BRIDGIFY_SECRET ?? '';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getBridgifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${BRIDGIFY_BASE}/accounts/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'read write',
    }),
  });

  if (!res.ok) {
    throw new Error(`Bridgify auth failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

export async function bridgifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getBridgifyToken();
  return fetch(`${BRIDGIFY_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(8000),
  });
}
