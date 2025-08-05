# ML Stunting - Frontend Application

Aplikasi frontend untuk sistem prediksi stunting dengan integrasi IoT real-time menggunakan Next.js dan TypeScript.

## 🚀 Features

- **Real-time IoT Integration**: WebSocket connection untuk menerima data berat dan tinggi badan dari IoT device
- **Auto-reconnect**: Otomatis mencoba reconnect jika koneksi terputus
- **Mobile-first Design**: Responsive design dengan tema kesehatan yang clean
- **Input Validation**: Validasi data lengkap sebelum melakukan prediksi
- **Real-time Prediction**: Prediksi stunting menggunakan API FastAPI backend

## 🛠️ Tech Stack

- **Next.js 14+** dengan App Router
- **React 18+** dengan TypeScript
- **Tailwind CSS** untuk styling
- **WebSocket** untuk real-time communication
- **Custom Hooks** untuk WebSocket management

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Configuration

### Backend Integration

Pastikan backend FastAPI sudah berjalan pada `http://localhost:5000` atau sesuaikan URL di aplikasi:

1. Server URL: `localhost:5000` (default)
2. Device ID: `IOT_001` (default)

## 📱 Usage

### 1. Koneksi IoT Device

1. Masukkan Server URL dan Device ID
2. Klik tombol "Hubungkan"
3. Status akan menunjukkan "Terhubung" jika berhasil
4. Data real-time akan ditampilkan saat tersedia

### 2. Input Data Anak

Lengkapi informasi berikut:

**Informasi Personal:**
- Nama Anak
- Tanggal Lahir
- Jenis Kelamin

**Data Kelahiran:**
- Berat Badan Lahir (kg)
- Tinggi Badan Lahir (cm)

**Pengukuran Saat Ini (dari IoT):**
- Berat Badan (otomatis dari IoT)
- Tinggi Badan (otomatis dari IoT)

### 3. Prediksi Stunting

1. Pastikan semua data sudah lengkap
2. Tunggu data dari IoT device tersedia
3. Klik tombol "Prediksi Status Stunting"
4. Hasil akan ditampilkan dengan detail analisis

## 🔌 WebSocket Integration

### Auto-reconnect Features:
- **Max Attempts**: 10 kali percobaan
- **Interval**: 3 detik antar percobaan
- **Auto-connect**: Otomatis connect saat component mount
- **Manual Control**: Tombol connect/disconnect/reconnect

### Data Format:
```typescript
interface IoTData {
  did: string;        // Device ID
  tb: number;         // Tinggi Badan (cm)
  bb: number;         // Berat Badan (kg)
  timestamp?: number; // Unix timestamp
  status: 'updated' | 'no_data';
}
```

## 📊 Prediction Results

Hasil prediksi menampilkan:

1. **Status Overall**: Normal atau Perlu Perhatian
2. **Detail Analisis**:
   - Status TB/U (Tinggi Badan menurut Umur)
   - Status BB/U (Berat Badan menurut Umur)
   - Status BB/TB (Berat Badan menurut Tinggi Badan)
3. **Z-Score Values**: Nilai numerik untuk setiap parameter
4. **Summary Data**: Ringkasan data anak dan waktu prediksi

## 🚨 Troubleshooting

### Common Issues:

1. **WebSocket Connection Failed**
   - Pastikan backend FastAPI running
   - Check server URL dan device ID
   - Periksa firewall/network settings

2. **Data IoT Tidak Muncul**
   - Pastikan device ID sesuai dengan backend
   - Check backend logs untuk WebSocket connections
   - Coba reconnect manual

3. **Prediction API Error**
   - Pastikan semua field sudah diisi
   - Check format tanggal (YYYY-MM-DD)
   - Verifikasi backend endpoint /predict
