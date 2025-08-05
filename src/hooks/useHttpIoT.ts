import { useState, useEffect, useCallback, useRef } from 'react';
import { IoTData, ConnectionStatus } from '@/types/prediction';

interface UseHttpIoTOptions {
  deviceId: string;
  pollingInterval?: number;
  autoStart?: boolean;
}

export function useHttpIoT(options: UseHttpIoTOptions) {
  const { deviceId, pollingInterval = 3000, autoStart = false } = options;
  
  const [data, setData] = useState<IoTData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    hasData: false,
    reconnectAttempts: 0,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const log = useCallback((message: string, ...args: unknown[]) => {
    console.log(`[HttpIoT ${deviceId}] ${message}`, ...args);
  }, [deviceId]);

  const updateStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchIoTData = useCallback(async () => {
    try {
      const response = await fetch(`/api/iot-data?deviceId=${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const iotData: IoTData = result.data;
        
        // Only update state if data has actually changed or this is first fetch
        const hasDataChanged = !data || 
          data.bb !== iotData.bb || 
          data.tb !== iotData.tb || 
          data.status !== iotData.status;

        if (hasDataChanged) {
          setData(iotData);
          log('Data updated:', iotData);
        }
        
        updateStatus({ 
          hasData: iotData.status === 'updated',
          error: undefined 
        });
        
        // Log less frequently for no_data to avoid spam
        if (iotData.status !== 'no_data' || !data) {
          log('Data fetched:', iotData);
        }
      } else {
        log('No data available from backend');
        updateStatus({ hasData: false });
      }

    } catch (error) {
      log('Error fetching IoT data:', error);
      updateStatus({ 
        error: error instanceof Error ? error.message : 'Fetch error',
        hasData: false 
      });
    }
  }, [deviceId, log, updateStatus, data]);

  const startPolling = useCallback(() => {
    if (isPollingRef.current) {
      log('Already polling');
      return;
    }

    log('Starting HTTP polling');
    isPollingRef.current = true;
    updateStatus({ 
      isConnected: true, 
      isConnecting: false, 
      error: undefined,
      lastConnected: new Date()
    });
    
    // Fetch immediately
    fetchIoTData();
    
    // Start polling interval
    intervalRef.current = setInterval(fetchIoTData, pollingInterval);
  }, [fetchIoTData, pollingInterval, log, updateStatus]);

  const stopPolling = useCallback(() => {
    if (!isPollingRef.current) {
      log('Not currently polling');
      return;
    }

    log('Stopping HTTP polling');
    isPollingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    updateStatus({ 
      isConnected: false, 
      isConnecting: false,
      hasData: false 
    });
    setData(null);
  }, [log, updateStatus]);

  const connect = useCallback(() => {
    if (isPollingRef.current) {
      log('Already connected');
      return;
    }
    
    updateStatus({ isConnecting: true });
    
    // Check backend connectivity first
    fetch('/api/connection?deviceId=' + deviceId)
      .then(response => response.json())
      .then(result => {
        if (result.success && result.data.backendStatus === 'healthy') {
          startPolling();
        } else {
          throw new Error('Backend server is not healthy');
        }
      })
      .catch(error => {
        log('Connection failed:', error);
        updateStatus({ 
          isConnecting: false, 
          error: error instanceof Error ? error.message : 'Connection failed' 
        });
      });
  }, [deviceId, startPolling, log, updateStatus]);

  const disconnect = useCallback(() => {
    log('Manual disconnect');
    stopPolling();
  }, [stopPolling, log]);

  const reconnect = useCallback(() => {
    log('Manual reconnect');
    stopPolling();
    setTimeout(() => connect(), 1000);
  }, [connect, stopPolling, log]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && deviceId && !isPollingRef.current) {
      log('Auto-starting connection');
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoStart, deviceId, connect, log]);

  return {
    data,
    status,
    connect,
    disconnect,
    reconnect,
  };
}
