import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validasi data yang diperlukan untuk IoT data
    const requiredFields = ['did', 'tb', 'bb'];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { success: false, message: `Field ${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validasi range data
    if (body.tb <= 0 || body.tb > 200) {
      return NextResponse.json(
        { success: false, message: 'Height (tb) must be between 0 and 200 cm' },
        { status: 400 }
      );
    }

    if (body.bb <= 0 || body.bb > 100) {
      return NextResponse.json(
        { success: false, message: 'Weight (bb) must be between 0 and 100 kg' },
        { status: 400 }
      );
    }

    // Get backend URL (automatically detects localhost vs external)
    const backendUrl = getBackendUrl();
    
    console.log('[API] Forwarding IoT data to backend:', `${backendUrl}/recive`);
    console.log('[API] IoT Data:', body);
    
    // Forward request to backend server
    const response = await fetch(`${backendUrl}/recive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        did: body.did,
        tb: parseFloat(body.tb),
        bb: parseFloat(body.bb)
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('[API] Backend IoT data error:', result);
      return NextResponse.json(
        { success: false, message: result.message || 'Failed to send IoT data' },
        { status: response.status }
      );
    }

    console.log('[API] IoT data sent successfully');
    return NextResponse.json({
      success: true,
      message: `IoT data received and broadcasted for device ${body.did}`,
      data: {
        did: body.did,
        tb: body.tb,
        bb: body.bb,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('[API] IoT send error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
