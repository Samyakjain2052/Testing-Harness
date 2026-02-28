import { useEffect, useRef, useCallback, useState } from 'react';
import type { ExecutionStatus } from '../api/test-executions.api';

interface WsMessage {
  type: 'status_change' | 'progress';
  status?: ExecutionStatus;
  step?: string;
  error?: string;
}

export function useExecutionWebSocket(executionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  const connect = useCallback(() => {
    if (!executionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', executionId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        setLastMessage(data);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds if the execution is still active
      setTimeout(() => {
        if (wsRef.current === ws) {
          connect();
        }
      }, 3000);
    };

    wsRef.current = ws;
  }, [executionId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { lastMessage };
}
