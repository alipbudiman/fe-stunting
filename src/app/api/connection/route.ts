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
    
    console.log('[API] Checking connection status for device:', deviceId);
    
    // Check if backend server is reachable
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const isBackendHealthy = response.ok;
      
      return NextResponse.json({
        success: true,
        data: {
          backendStatus: isBackendHealthy ? 'healthy' : 'unhealthy',
          deviceId,
          backendUrl: backendUrl.replace(/^https?:\/\//, ''), // Don't expose full URL to client
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[API] Backend health check failed:', error);
      return NextResponse.json({
        success: true,
        data: {
          backendStatus: 'unreachable',
          deviceId,
          backendUrl: backendUrl.replace(/^https?:\/\//, ''),
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('[API] Connection status error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
