import { useState, useEffect, useCallback, useRef } from 'react';
import { IoTData, ConnectionStatus } from '@/types/prediction';

interface UseHttpIoTOptions {
  deviceId: string;
  pollingInterval?: number;
  autoStart?: boolean;
  maxEmptyPolls?: number; // New: Stop polling after too many empty responses
}

export function useHttpIoT(options: UseHttpIoTOptions) {
  const { deviceId, pollingInterval = 2000, autoStart = false, maxEmptyPolls = 30 } = options;
  
  const [data, setData] = useState<IoTData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    hasData: false,
    reconnectAttempts: 0,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const emptyPollCountRef = useRef(0);
  const lastSuccessfulDataRef = useRef<string>(''); // Track last successful data hash

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
        
        // Create a hash of the data to detect real changes
        const dataHash = `${iotData.bb}-${iotData.tb}-${iotData.status}`;
        
        if (iotData.status === 'updated' && iotData.bb > 0 && iotData.tb > 0) {
          // We have real IoT data
          emptyPollCountRef.current = 0; // Reset empty poll counter
          
          // Only update if this is genuinely new data
          if (lastSuccessfulDataRef.current !== dataHash) {
            setData(iotData);
            lastSuccessfulDataRef.current = dataHash;
            log('✅ New IoT data received:', iotData);
          }
          
          updateStatus({ 
            hasData: true,
            error: undefined 
          });
          
        } else {
          // No real data yet, increment empty poll counter
          emptyPollCountRef.current += 1;
          
          if (emptyPollCountRef.current === 1) {
            log('⏳ Waiting for IoT data...');
          } else if (emptyPollCountRef.current % 10 === 0) {
            log(`⏳ Still waiting for IoT data... (${emptyPollCountRef.current} polls)`);
          }
          
          updateStatus({ hasData: false });
          
          // If we've been polling too long without data, slow down the polling
          if (emptyPollCountRef.current >= maxEmptyPolls) {
            log('🐌 Too many empty polls, slowing down polling interval');
            // Could implement dynamic interval adjustment here
          }
        }
      } else {
        emptyPollCountRef.current += 1;
        log('No valid data from backend');
        updateStatus({ hasData: false });
      }

    } catch (error) {
      emptyPollCountRef.current += 1;
      log('Error fetching IoT data:', error);
      updateStatus({ 
        error: error instanceof Error ? error.message : 'Fetch error',
        hasData: false 
      });
    }
  }, [deviceId, log, updateStatus, maxEmptyPolls]);

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
