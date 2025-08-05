import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validasi data yang diperlukan
    const requiredFields = ['nama', 'tanggal_lahir', 'jenis_kelamin', 'bb_lahir', 'tb_lahir', 'berat', 'tinggi'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `Field ${field} is required` },
          { status: 400 }
        );
      }
    }

    // Get backend URL (automatically detects localhost vs external)
    const backendUrl = getBackendUrl();
    
    console.log('[API] Forwarding prediction request to backend:', `${backendUrl}/predict`);
    
    // Forward request to backend server
    const response = await fetch(`${backendUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('[API] Backend prediction error:', result);
      return NextResponse.json(
        { success: false, message: result.message || 'Prediction failed' },
        { status: response.status }
      );
    }

    console.log('[API] Prediction successful');
    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Prediction error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
