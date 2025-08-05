# Backend Testing Guide

## 🚀 Running the Backend Server

### 1. **Start FastAPI Backend**
```bash
# Navigate to backend directory
cd d:/NEW\ PROJECT/mlstunting/sourceml/

# Run the main.py server
python main.py
```

Backend akan berjalan di: **http://localhost:5000**

### 2. **Backend Endpoints Available:**
- `GET /` - Health check
- `GET /health` - Health status
- `POST /recive` - Receive data from IoT device
- `POST /predict` - ML prediction
- `POST /reset/{device_id}` - Reset device data
- `GET /devices` - Get all devices
- `GET /devices/{device_id}` - Get specific device data
- `WebSocket /ws/data/{device_id}` - Real-time data stream

### 3. **Testing IoT Data Flow**

#### Manual IoT Data Simulation (via cURL):
```bash
# Send IoT data to backend
curl -X POST http://localhost:5000/recive \
  -H "Content-Type: application/json" \
  -d '{"did": "IOT_001", "tb": 75.5, "bb": 12.3}'

# Check device data
curl http://localhost:5000/devices/IOT_001
```

#### Via Frontend (Recommended):
1. Buka http://localhost:3000
2. Pilih "HTTP Polling" mode
3. Connect dengan Device ID: IOT_001
4. Di step "Pengukuran", klik **"🧪 Kirim Data IoT Simulasi"**
5. Data akan dikirim: Frontend → Next.js API → Backend → Broadcast → Next.js API → Frontend

## 📡 Data Flow Architecture

```
IoT Device/Simulation → Backend /recive → data_devices storage → 
Frontend HTTP Polling → Next.js /api/iot-data → Backend /devices/{id} → Frontend Display
```

### New vs Old Flow:

**OLD (Direct):**
```
Client ←→ Backend WebSocket (Direct)
```

**NEW (Via Next.js):**
```  
Client → Next.js API Routes → Backend → Next.js API Routes → Client
```

## 🧪 Testing Steps

1. **Start Backend**: `python main.py`
2. **Start Frontend**: `npm run dev`
3. **Connect**: Pilih HTTP Polling, Device ID: IOT_001
4. **Simulate Data**: Klik tombol simulasi IoT
5. **Verify**: Data harus muncul di "Berat Badan" dan "Tinggi Badan"
6. **Predict**: Lanjutkan ke prediksi stunting

## 🔍 Debugging

### Check Backend Status:
```bash
curl http://localhost:5000/health
curl http://localhost:5000/devices
```

### Check Frontend API:
```bash
curl "http://localhost:3000/api/iot-data?deviceId=IOT_001"
curl "http://localhost:3000/api/connection?deviceId=IOT_001"
```

### Monitor Logs:
- **Backend**: Lihat terminal backend untuk log data IoT
- **Frontend**: Buka Browser DevTools → Console untuk log API calls
