import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';

export async function POST(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params;
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get backend URL (automatically detects localhost vs external)
    const backendUrl = getBackendUrl();
    
    console.log('[API] Forwarding reset request to backend:', `${backendUrl}/reset/${deviceId}`);
    
    // Forward request to backend server
    const response = await fetch(`${backendUrl}/reset/${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Backend reset error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Reset failed' },
        { status: response.status }
      );
    }

    await response.text(); // Read response body
    console.log('[API] Reset successful');
    
    return NextResponse.json({ success: true, message: 'Reset successful' });

  } catch (error) {
    console.error('[API] Reset error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
