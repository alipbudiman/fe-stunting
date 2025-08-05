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
      
      // Fetch data from backend (assuming there's an endpoint to get current IoT data)
      const response = await fetch(`${backendUrl}/iot-data/${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // If 404, it might mean no data yet
        if (response.status === 404) {
          return NextResponse.json({
            success: true,
            data: {
              did: deviceId,
              tb: 0,
              bb: 0,
              status: 'no_data' as const,
              timestamp: Date.now()
            }
          });
        }
        
        throw new Error(`Backend returned ${response.status}`);
      }

      const result = await response.json();
      
      console.log('[API] IoT data fetched successfully');
      return NextResponse.json({
        success: true,
        data: result
      });

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
          timestamp: Date.now()
        }
      });
    }

  } catch (error) {
    console.error('[API] IoT data error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
