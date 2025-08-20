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
    
    // Check if backend server is reachable and device exists
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // First check backend health
      const healthResponse = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      if (!healthResponse.ok) {
        clearTimeout(timeoutId);
        return NextResponse.json({
          success: true,
          data: {
            backendStatus: 'unhealthy',
            deviceId,
            backendUrl: backendUrl.replace(/^https?:\/\//, ''),
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Then check if specific device exists
      const deviceResponse = await fetch(`${backendUrl}/devices/${deviceId}`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (deviceResponse.status === 404) {
        console.log(`[API] Device ${deviceId} not found in backend`);
        return NextResponse.json({
          success: false,
          message: `Device '${deviceId}' tidak terdaftar di sistem. Pastikan Device ID benar.`,
          data: {
            backendStatus: 'healthy',
            deviceExists: false,
            deviceId,
            backendUrl: backendUrl.replace(/^https?:\/\//, ''),
            timestamp: new Date().toISOString()
          }
        }, { status: 404 });
      }
      
      // Both backend and device are OK
      return NextResponse.json({
        success: true,
        data: {
          backendStatus: 'healthy',
          deviceExists: true,
          deviceId,
          backendUrl: backendUrl.replace(/^https?:\/\//, ''),
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
