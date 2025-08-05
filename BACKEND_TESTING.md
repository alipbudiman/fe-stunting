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

### 3. **Testing Real IoT Data Flow**

#### Real IoT Device Integration:
```bash
# Send real IoT data to backend (from your IoT device)
curl -X POST http://localhost:5000/recive \
  -H "Content-Type: application/json" \
  -d '{"did": "IOT_001", "tb": 75.5, "bb": 12.3}'

# Check device data
curl http://localhost:5000/devices/IOT_001
```

#### Via Frontend (Production Mode):
1. Buka http://localhost:3000
2. Pilih "HTTP Polling" mode (recommended)
3. Connect dengan Device ID: IOT_001
4. Sistem akan polling data setiap 2 detik
5. Ketika IoT device mengirim data ke backend `/recive`, data akan otomatis muncul di frontend

## 📡 Data Flow Architecture

```
Real IoT Device → Backend /recive → data_devices storage → 
Frontend HTTP Polling (2s interval) → Next.js /api/iot-data → Backend /devices/{id} → Frontend Display
```

### Production Architecture:

```  
IoT Device → Backend Server → Next.js API Proxy → Frontend Client
```

## 🧪 Testing Steps

1. **Start Backend**: `python main.py`
2. **Start Frontend**: `npm run dev`
3. **Connect**: Pilih HTTP Polling, Device ID: IOT_001
4. **Send Real Data**: Gunakan IoT device atau cURL untuk kirim data ke backend
5. **Monitor**: Data akan otomatis muncul di frontend dalam 2-4 detik
6. **Predict**: Lanjutkan ke prediksi stunting setelah data tersedia

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

### Monitor Real-time Data:
- **Backend**: Lihat terminal backend untuk log data IoT dari device
- **Frontend**: Buka Browser DevTools → Console untuk log polling dan data updates
- **Network Tab**: Monitor API calls untuk melihat polling activity

### IoT Device Integration:
1. Configure your IoT device to send POST requests to: `http://localhost:5000/recive`
2. Data format: `{"did": "YOUR_DEVICE_ID", "tb": HEIGHT_IN_CM, "bb": WEIGHT_IN_KG}`
3. Frontend akan otomatis detect dan display data dalam 2-4 detik
