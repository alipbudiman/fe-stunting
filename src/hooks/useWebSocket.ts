import { useState, useEffect, useRef, useCallback } from 'react';
import { IoTData, ConnectionStatus } from '@/types/prediction';

interface UseWebSocketOptions {
  serverUrl: string;
  deviceId: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = ({
  serverUrl,
  deviceId,
  autoReconnect = true,
  maxReconnectAttempts = 10,
  reconnectInterval = 3000,
}: UseWebSocketOptions) => {
  const [data, setData] = useState<IoTData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    hasData: false,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Initialize shouldReconnectRef to false to prevent auto-connect on first mount
  const shouldReconnectRef = useRef(false);

  const log = useCallback((message: string) => {
    console.log(`[WebSocket] ${message}`);
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const updateStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const connect = useCallback(() => {
    if (!serverUrl || !deviceId) {
      log('Server URL or Device ID not provided');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket already connecting or connected');
      return;
    }

    // Allow reconnects once a manual connection attempt is made
    shouldReconnectRef.current = true;

    try {
      updateStatus({ isConnecting: true });
      
      const wsProtocol = serverUrl.startsWith('https') ? 'wss' : 'ws';
      const cleanUrl = serverUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${cleanUrl}/ws/data/${deviceId}`;
      
      log(`Connecting to: ${wsUrl}`);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        log('Connected successfully');
        updateStatus({
          isConnected: true,
          isConnecting: false,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        });
        clearReconnectTimeout();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const receivedData: IoTData = JSON.parse(event.data);
          log(`Data received: BB=${receivedData.bb}kg, TB=${receivedData.tb}cm`);
          
          setData(receivedData);
          updateStatus({ 
            hasData: receivedData.status === 'updated' && !!receivedData.bb && !!receivedData.tb 
          });
        } catch (error) {
          log(`Error parsing message: ${error}`);
        }
      };

      wsRef.current.onclose = (event) => {
        log(`Connection closed (Code: ${event.code})`);
        const wasConnected = status.isConnected;
        
        updateStatus({
          isConnected: false,
          isConnecting: false,
        });

        // Only auto-reconnect if we were previously connected and should reconnect
        if (shouldReconnectRef.current && autoReconnect && wasConnected &&
            status.reconnectAttempts < maxReconnectAttempts) {
          const nextAttempt = status.reconnectAttempts + 1;
          updateStatus({ reconnectAttempts: nextAttempt });
          
          log(`Auto-reconnecting in ${reconnectInterval / 1000}s (attempt ${nextAttempt}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (status.reconnectAttempts >= maxReconnectAttempts) {
          log('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        log(`WebSocket error: ${error}`);
        updateStatus({ isConnecting: false });
      };

    } catch (error) {
      log(`Connection error: ${error}`);
      updateStatus({ 
        isConnected: false, 
        isConnecting: false 
      });
    }
  }, [serverUrl, deviceId, autoReconnect, maxReconnectAttempts, reconnectInterval, status.reconnectAttempts, status.isConnected, log, updateStatus, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();
    
    if (wsRef.current) {
      log('Manually disconnecting...');
      wsRef.current.close(1000, 'Manual disconnect'); // Use normal close code
      wsRef.current = null;
    }
    
    updateStatus({
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      hasData: false,
    });
    
    // Clear data when disconnecting
    setData(null);
    
    log('Manually disconnected');
  }, [updateStatus, clearReconnectTimeout, log]);

  const reconnect = useCallback(() => {
    log('Manual reconnect requested');
    shouldReconnectRef.current = true;
    updateStatus({ reconnectAttempts: 0 });
    disconnect();
    setTimeout(() => {
      if (shouldReconnectRef.current) {
        connect();
      }
    }, 1000);
  }, [connect, disconnect, updateStatus, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearReconnectTimeout]);

  // Auto-connect when options change, but only if not manually disconnected
  useEffect(() => {
    if (serverUrl && deviceId && !status.isConnected && !status.isConnecting && shouldReconnectRef.current) {
      log('Auto-connecting on mount or config change');
      connect();
    }
  }, [serverUrl, deviceId, connect, status.isConnected, status.isConnecting, log]);

  return {
    data,
    status,
    connect,
    disconnect,
    reconnect,
  };
};
