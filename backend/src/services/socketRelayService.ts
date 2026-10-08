import type { Core } from '@strapi/strapi';

type SocketTarget =
  | { type: 'user'; id: string | number }
  | { type: 'tournament'; id: string | number }
  | { type: 'match'; id: string | number }
  | { type: 'broadcast' };

export async function publishSocketEvent(
  strapi: Core.Strapi,
  event: string,
  target: SocketTarget,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const serverUrl = process.env.SOCKET_SERVER_URL?.replace(/\/+$/, '');
  const internalToken = process.env.SOCKET_INTERNAL_TOKEN;
  if (!serverUrl || !internalToken) {
    strapi.log.debug('[SocketRelay] Not configured; event was not published');
    return;
  }

  const response = await fetch(`${serverUrl}/events/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${internalToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event, target, payload }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Socket service rejected ${event} with HTTP ${response.status}`);
  }
}
