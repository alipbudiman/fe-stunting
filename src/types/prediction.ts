// Types for ML Stunting Prediction System

export interface IoTData {
  did: string;
  tb: number;  // tinggi badan (cm)
  bb: number;  // berat badan (kg)
  timestamp?: number;
  status: 'updated' | 'no_data';
}

export interface ChildData {
  nama: string;
  tanggal_lahir: string;
  jenis_kelamin: 'L' | 'P';
  bb_lahir: number;
  tb_lahir: number;
  berat: number;    // from IoT
  tinggi: number;   // from IoT
}

export interface PredictionResult {
  tbu?: string;     // Status Tinggi Badan menurut Umur
  bbu?: string;     // Status Berat Badan menurut Umur  
  bbtb?: string;    // Status Berat Badan menurut Tinggi Badan
  zs_tbu?: number;  // Z-Score TB/U
  zs_bbu?: number;  // Z-Score BB/U
  zs_bbtb?: number; // Z-Score BB/TB
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data: PredictionResult;
}

export interface ConnectionConfig {
  serverUrl: string;
  deviceId: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  hasData: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}
