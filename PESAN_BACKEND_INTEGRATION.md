# Integrasi Pesan Backend pada Sistem Prediksi Stunting

## 📋 Ringkasan Perubahan

Sistem sekarang sudah diupdate untuk menampilkan **pesan rekomendasi** dari backend setelah prediksi status stunting. Backend mengembalikan `PredictionOutputWithMessage` yang berisi `data` dan `message`, dan sekarang pesan tersebut ditampilkan di frontend.

## 🔧 Perubahan yang Dibuat

### 1. **Update Type Definitions** (`src/types/prediction.ts`)

```typescript
export interface PredictionResult {
  tbu?: string;     // Status Tinggi Badan menurut Umur
  bbu?: string;     // Status Berat Badan menurut Umur  
  bbtb?: string;    // Status Berat Badan menurut Tinggi Badan
  zs_tbu?: number;  // Z-Score TB/U
  zs_bbu?: number;  // Z-Score BB/U
  zs_bbtb?: number; // Z-Score BB/TB
  message?: string; // ✅ BARU: Pesan rekomendasi dari backend
}
```

### 2. **Update API Route** (`src/app/api/predict/route.ts`)

API route sekarang mengekstrak `message` dari response backend dan memasukkannya ke dalam `data` object:

```typescript
// Backend returns {data: PredictionResult, message: string}
// We need to merge the message into the data object for frontend consumption
if (result.data && result.message) {
  result.data.message = result.message;
}

return NextResponse.json({
  success: true,
  message: 'Prediction completed successfully',
  data: result.data
});
```

### 3. **Update Frontend Component** (`src/components/StuntingPredictionSystemSimple.tsx`)

#### A. **Logging untuk Debug**
```typescript
console.log('[FE] Prediction response received:', result);
console.log('[FE] Prediction data:', result.data);
console.log('[FE] Prediction message:', result.data?.message);
```

#### B. **UI untuk Menampilkan Pesan**
Ditambahkan section baru setelah Z-Scores:

```tsx
{/* Rekomendasi dari Backend */}
{prediction.message && (
  <div className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 shadow-lg">
    <div className="flex items-start gap-3 mb-3">
      <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
        💡
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-yellow-800 text-lg mb-2">Rekomendasi & Saran</h4>
        <div className="text-yellow-700 leading-relaxed whitespace-pre-line">
          {prediction.message}
        </div>
      </div>
    </div>
    <div className="text-xs text-yellow-600 italic mt-3">
      * Rekomendasi ini berdasarkan analisis sistem ML. Konsultasikan dengan tenaga medis untuk penanganan lebih lanjut.
    </div>
  </div>
)}
```

## 🎨 Desain UI Pesan

### **Visual Design:**
- **Background**: Gradient kuning-orange untuk menarik perhatian
- **Icon**: 💡 (lampu) untuk menunjukkan ini adalah saran/rekomendasi
- **Border**: Border kuning untuk konsistensi
- **Typography**: 
  - Header bold dengan warna kuning gelap
  - Content dengan line spacing yang baik
  - Disclaimer italic dengan ukuran kecil

### **Responsive:**
- Mobile-first design
- Flex layout untuk icon dan content
- Whitespace yang cukup untuk readability

## 📊 Data Flow

```
Backend FastAPI (/predict endpoint)
    ↓ 
  PredictionOutputWithMessage {
    data: PredictionResult,
    message: string  // ← Pesan rekomendasi
  }
    ↓
Next.js API Route (/api/predict)
    ↓ 
  Merge message into data.message
    ↓
Frontend Component
    ↓
Display message in dedicated UI section
```

## 🧪 Testing

### **Test Manual:**
1. **Start Backend**: Jalankan `python main.py` di folder backend
2. **Start Frontend**: Jalankan `npm run dev` di folder frontend  
3. **Test Flow**:
   - Isi data anak
   - Connect ke IoT device
   - Tunggu data IoT (berat/tinggi)
   - Klik "Prediksi Status Stunting"
   - **Verifikasi**: Pesan rekomendasi muncul di section berwarna kuning

### **Console Debugging:**
Buka Developer Tools untuk melihat log:
```
[FE] Prediction response received: {...}
[FE] Prediction data: {...}
[FE] Prediction message: "Pesan rekomendasi dari backend"
```

## 🔍 Backend Message Source

Berdasarkan analisis `main.py`, pesan berasal dari:

```python
msg = prediction.penangana_gejalan(
    result.bbu,
    result.tbu,
    result.bbtb
)

return PredictionOutputWithMessage(
    data=result,
    message=msg  # ← Ini adalah pesan yang sekarang ditampilkan
)
```

Fungsi `penangana_gejalan()` menganalisis status gizi dan memberikan rekomendasi berdasarkan kondisi anak.

## ✅ Hasil Akhir

Sekarang sistem menampilkan:

1. **Status Overall** (Normal/Perlu Perhatian)
2. **Detail Analisis** (TB/U, BB/U, BB/TB)
3. **Z-Score Values** (numerik)
4. **🆕 Rekomendasi & Saran** (dari backend ML)
5. **Data Anak Summary**

Pesan rekomendasi akan muncul dalam kotak kuning yang mencolok dengan icon lampu, memberikan guidance yang jelas kepada user tentang langkah selanjutnya berdasarkan hasil prediksi ML.
