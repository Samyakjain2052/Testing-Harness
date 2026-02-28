import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface WsBroadcaster {
  broadcast(executionId: string, data: unknown): void;
}

let _broadcaster: WsBroadcaster | null = null;

export function setupWebSocket(httpServer: Server): WsBroadcaster {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map of executionId → Set<WebSocket>
  const subscriptions = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe' && typeof msg.executionId === 'string') {
          if (!subscriptions.has(msg.executionId)) {
            subscriptions.set(msg.executionId, new Set());
          }
          subscriptions.get(msg.executionId)!.add(ws);
        }

        if (msg.type === 'unsubscribe' && typeof msg.executionId === 'string') {
          subscriptions.get(msg.executionId)?.delete(ws);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      for (const [, clients] of subscriptions) {
        clients.delete(ws);
      }
    });
  });

  _broadcaster = {
    broadcast(executionId: string, data: unknown) {
      const clients = subscriptions.get(executionId);
      if (!clients) return;

      const payload = JSON.stringify(data);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    },
  };

  return _broadcaster;
}

export function getBroadcaster(): WsBroadcaster | null {
  return _broadcaster;
}
