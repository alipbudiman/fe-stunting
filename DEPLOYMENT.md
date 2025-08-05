# ML Stunting Prediction - Deployment Guide

## 🏗️ Arsitektur Sistem

### Arsitektur Baru: Next.js API sebagai Proxy
```
Client ↔ Next.js (Frontend + API Routes) ↔ Backend ML Server
```

### Keuntungan:
- ✅ Backend URL tersembunyi dari client
- ✅ Tidak ada CORS issues
- ✅ Tidak ada Mixed Content errors
- ✅ Centralized error handling
- ✅ Bisa tambahkan authentication/rate limiting

## 🚀 Skenario Deployment

### 1. **Development (Same Machine)**
```bash
# Terminal 1: Backend
cd backend
python app.py  # Running at localhost:5000

# Terminal 2: Frontend
cd frontend/my-app
npm run dev    # Running at localhost:3000
```

**Environment (.env.local):**
```env
BACKEND_API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=localhost:5000
```

### 2. **Single Server (VPS/Cloud)**
Backend dan Frontend di server yang sama:

```bash
# Backend di background
cd backend
nohup python app.py &

# Frontend
cd frontend/my-app
npm run build
npm start
```

**Environment (.env.production):**
```env
BACKEND_API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=your-domain.com:5000  # atau IP publik
```

### 3. **Docker Compose (Recommended)**
Semua service dalam 1 server menggunakan Docker:

```bash
docker-compose up -d
```

**Environment (dalam docker-compose.yml):**
```yaml
frontend:
  environment:
    - BACKEND_API_URL=http://backend:5000  # Container-to-container
    - NEXT_PUBLIC_API_URL=localhost:5000   # Client-to-server
```

### 4. **Separate Servers**
Backend dan Frontend di server berbeda:

**Frontend Server (.env.production):**
```env
BACKEND_API_URL=http://192.168.1.100:5000  # IP Backend server
NEXT_PUBLIC_API_URL=192.168.1.100:5000
```

## 📡 Connection Modes

### HTTP Polling (Recommended)
- ✅ Stabil dan reliable
- ✅ Tidak terpengaruh Mixed Content
- ✅ Mudah debugging
- ✅ Works through firewalls

### WebSocket (Optional)
- ⚡ Real-time updates
- ⚠️ Butuh WSS untuk HTTPS sites
- ⚠️ Bisa terblokir firewall/proxy

## 🔧 Configuration Files

### Frontend Configuration
```typescript
// src/lib/config.ts
export const getBackendUrl = () => {
  if (typeof window === 'undefined') {
    // Server-side: Use internal URL
    return process.env.BACKEND_API_URL || 'http://localhost:5000';
  }
  // Client-side: Use public URL (for WebSocket only)
  return process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:5000';
};
```

### API Routes
All API calls go through Next.js:
- `/api/predict` → Backend ML prediction
- `/api/reset/[deviceId]` → Backend device reset  
- `/api/iot-data` → Backend IoT data polling
- `/api/connection` → Backend health check

## 🐳 Docker Setup

### Dockerfile (Frontend)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Dockerfile (Backend)
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

## 🌐 Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API (direct access jika diperlukan)
    location /api/backend/ {
        rewrite ^/api/backend/(.*) /$1 break;
        proxy_pass http://localhost:5000;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔍 Troubleshooting

### Connection Issues
1. Check if backend is running: `curl http://localhost:5000/health`
2. Check Next.js API routes: `curl http://localhost:3000/api/connection?deviceId=IOT_001`
3. Check logs: `docker-compose logs frontend` or `npm run dev`

### Mixed Content Errors
- Otomatis solved dengan HTTP Polling mode
- Untuk WebSocket: set `NEXT_PUBLIC_FORCE_WSS=true` dan pastikan backend support HTTPS

### CORS Issues
- Tidak ada dengan arsitektur baru (semua via Next.js API routes)
- Backend hanya perlu allow localhost jika di same server

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /api/connection?deviceId=IOT_001`
- Full system: `docker-compose ps`

### Logs
```bash
# Development
npm run dev

# Production  
pm2 start ecosystem.config.js
pm2 logs

# Docker
docker-compose logs -f
```
