// Environment configuration utility
export const getBackendUrl = () => {
  // For server-side (Next.js API routes)
  if (typeof window === 'undefined') {
    // Check if we're in same server/container network
    const backendUrl = process.env.BACKEND_API_URL;
    
    if (backendUrl) {
      return backendUrl;
    }
    
    // Default to localhost for same-server setup
    return 'http://localhost:5000';
  }
  
  // For client-side (not used in new architecture, but kept for WebSocket)
  return process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:5000';
};

export const getWebSocketUrl = (deviceId: string) => {
  const serverUrl = getBackendUrl();
  const cleanUrl = serverUrl.replace(/^https?:\/\//, '');
  
  // Detect protocol based on current page
  const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const forceWss = process.env.NEXT_PUBLIC_FORCE_WSS === 'true';
  const wsProtocol = (serverUrl.startsWith('https') || (isPageHttps && forceWss)) ? 'wss' : 'ws';
  
  return `${wsProtocol}://${cleanUrl}/ws/data/${deviceId}`;
};

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
