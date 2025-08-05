import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get backend URL (automatically detects localhost vs external)
    const backendUrl = getBackendUrl();
    
    console.log('[API] Fetching IoT data for device:', deviceId);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try to fetch specific device data from backend
      const response = await fetch(`${backendUrl}/devices/${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // If 404, device not found, return no_data status
        if (response.status === 404) {
          console.log(`[API] Device ${deviceId} not found, returning no_data`);
          return NextResponse.json({
            success: true,
            data: {
              did: deviceId,
              tb: 0,
              bb: 0,
              status: 'no_data' as const,
              timestamp: Date.now(),
              message: `No data available for device ${deviceId}`
            }
          });
        }
        
        throw new Error(`Backend returned ${response.status}`);
      }

      const result = await response.json();
      
      // Backend returns: { device_id, data: { tb, bb, status, last_updated }, connections }
      if (result.data) {
        const iotData = {
          did: deviceId,
          tb: result.data.tb || 0,
          bb: result.data.bb || 0,
          status: result.data.status || 'no_data',
          timestamp: result.data.last_updated || Date.now(),
          connections: result.connections || 0
        };
        
        console.log('[API] IoT data fetched successfully:', iotData);
        return NextResponse.json({
          success: true,
          data: iotData
        });
      } else {
        throw new Error('Invalid data format from backend');
      }

    } catch (error) {
      console.error('[API] Failed to fetch IoT data:', error);
      
      // Return no_data status instead of error for client compatibility
      return NextResponse.json({
        success: true,
        data: {
          did: deviceId,
          tb: 0,
          bb: 0,
          status: 'no_data' as const,
          timestamp: Date.now(),
          message: `Error fetching data for device ${deviceId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }

  } catch (error) {
    console.error('[API] IoT data API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
