'use client';

import { useState, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useHttpIoT } from '@/hooks/useHttpIoT';
import { ChildData, PredictionResult, ApiResponse, ConnectionConfig } from '@/types/prediction';

// Define pagination steps
type PageStep = 'connection' | 'child-data' | 'measurement' | 'result';

// Connection mode
type ConnectionMode = 'websocket' | 'http';

export default function StuntingPredictionSystem() {
  const [currentStep, setCurrentStep] = useState<PageStep>('connection');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('http'); // Default to HTTP for better compatibility
  
  const [config, setConfig] = useState<ConnectionConfig>({
    serverUrl: (process.env.NEXT_PUBLIC_API_URL || 'localhost:5000').replace(/^https?:\/\//, ''),
    deviceId: 'IOT_001'
  });

  const [childData, setChildData] = useState<ChildData>({
    nama: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L', // Set default value instead of empty string
    bb_lahir: 0,
    tb_lahir: 0,
    berat: 0,
    tinggi: 0
  });

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection (for real-time updates)
  const websocketConnection = useWebSocket({
    serverUrl: config.serverUrl,
    deviceId: config.deviceId,
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  // HTTP polling connection (more reliable, goes through Next.js API)
  const httpConnection = useHttpIoT({
    deviceId: config.deviceId,
    pollingInterval: 2000, // Poll every 2 seconds for real IoT data
    autoStart: false,
    maxEmptyPolls: 50, // Allow more empty polls before slowing down
  });

  // Use the selected connection mode
  const { data: iotData, status, connect, disconnect, reconnect } = 
    connectionMode === 'websocket' ? websocketConnection : httpConnection;

  // Update child data when IoT data is received
  const updatedChildData = useMemo(() => {
    if (iotData && iotData.status === 'updated') {
      return {
        ...childData,
        berat: iotData.bb,
        tinggi: iotData.tb
      };
    }
    return childData;
  }, [childData, iotData]);

  // Check if child data form is complete
  const isChildDataComplete = useMemo(() => {
    return (
      childData.nama.trim() !== '' &&
      childData.tanggal_lahir !== '' &&
      (childData.jenis_kelamin === 'L' || childData.jenis_kelamin === 'P') &&
      childData.bb_lahir > 0 &&
      childData.tb_lahir > 0
    );
  }, [childData]);

  // Check if all required data is available for prediction
  const canPredict = useMemo(() => {
    return (
      isChildDataComplete &&
      updatedChildData.berat > 0 &&
      updatedChildData.tinggi > 0 &&
      status.hasData
    );
  }, [isChildDataComplete, updatedChildData, status.hasData]);

  // Navigation functions
  const handleConnect = () => {
    console.log('[StuntingPrediction] Manual connect button clicked');
    connect();
  };

  const handleResetToStart = async () => {
    try {
      // Call Next.js API route instead of direct backend
      const resetUrl = `/api/reset/${config.deviceId}`;
      
      const response = await fetch(resetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Reset failed');
      }
      
      // Reset all states
      setCurrentStep('connection');
      setPrediction(null);
      setError(null);
      setChildData({
        nama: '',
        tanggal_lahir: '',
        jenis_kelamin: 'L', // Reset to default
        bb_lahir: 0,
        tb_lahir: 0,
        berat: 0,
        tinggi: 0
      });
      
      // Disconnect websocket
      disconnect();
    } catch (err) {
      console.error('Error resetting:', err);
      setError(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  const handlePredict = async () => {
    if (!canPredict) return;

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // Call Next.js API route instead of direct backend
      const apiUrl = '/api/predict';

      console.log('[FE] Making prediction request to Next.js API:', apiUrl);

      const requestData = {
        nama: updatedChildData.nama,
        tanggal_lahir: updatedChildData.tanggal_lahir,
        jenis_kelamin: updatedChildData.jenis_kelamin,
        bb_lahir: updatedChildData.bb_lahir,
        tb_lahir: updatedChildData.tb_lahir,
        berat: updatedChildData.berat,
        tinggi: updatedChildData.tinggi
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result: ApiResponse = await response.json();

      if (response.ok) {
        console.log('[FE] Prediction response received:', result);
        console.log('[FE] Prediction data:', result.data);
        console.log('[FE] Prediction message:', result.data?.message);
        
        setPrediction(result.data);
        setCurrentStep('result'); // Move to result step after successful prediction
      } else {
        throw new Error(result.message || 'Prediction failed');
      }
    } catch (err) {
      console.error('[FE] Prediction error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallStatus = () => {
    if (!prediction) return null;
    
    const isStunted = 
      prediction.tbu?.toLowerCase().includes('pendek') ||
      prediction.bbu?.toLowerCase().includes('kurang') ||
      prediction.bbtb?.toLowerCase().includes('kurang');
    
    return isStunted ? 'PERLU PERHATIAN' : 'STATUS NORMAL';
  };

  // Step indicator component
  const StepIndicator = () => {
    const steps = [
      { id: 'connection', title: 'Koneksi IoT', icon: '📶' },
      { id: 'child-data', title: 'Data Anak', icon: '👶' },
      { id: 'measurement', title: 'Pengukuran', icon: '⚖️' },
      { id: 'result', title: 'Hasil Prediksi', icon: '📊' }
    ];

    const getStepIndex = (step: PageStep) => steps.findIndex(s => s.id === step);
    const currentIndex = getStepIndex(currentStep);

    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex flex-col items-center ${
                index <= currentIndex ? 'text-blue-600' : 'text-gray-400'
              }`}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold border-2 ${
                  index < currentIndex 
                    ? 'bg-green-500 border-green-500 text-white'
                    : index === currentIndex
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                }`}>
                  {step.icon}
                </div>
                <span className="text-xs sm:text-sm font-medium mt-1 text-center max-w-16 sm:max-w-20">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-white p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center py-6 sm:py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full shadow-lg">
              <span className="text-2xl text-white">🏥</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-green-700 bg-clip-text text-transparent">
              ML Stunting Prediction
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-700 font-medium">
            Sistem Prediksi Stunting dengan Data IoT Real-time
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Error Display */}
        {(error || status.error) && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
            <div className="flex items-center gap-3 text-red-800">
              <span className="text-xl">❌</span>
              <span className="font-semibold">{error || status.error}</span>
            </div>
            {status.error && status.error.includes('Mixed Content') && (
              <div className="mt-3 text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                <p className="font-semibold">💡 Solusi:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Akses frontend melalui HTTP: <code className="bg-red-200 px-1 rounded">http://localhost:3000</code></li>
                  <li>Atau konfigurasi backend untuk mendukung HTTPS/WSS</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Connection */}
        {currentStep === 'connection' && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-blue-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                {status.isConnected ? '📶' : '📵'}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Langkah 1: Koneksi IoT Device
              </h2>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Metode Koneksi</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setConnectionMode('http')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    connectionMode === 'http'
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">🌐 HTTP Polling</div>
                  <div className="text-sm mt-1">Via Next.js API (Recommended)</div>
                </button>
                <button
                  onClick={() => setConnectionMode('websocket')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    connectionMode === 'websocket'
                      ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">⚡ WebSocket</div>
                  <div className="text-sm mt-1">Direct connection (Real-time)</div>
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                HTTP Polling menggunakan Next.js API routes untuk komunikasi yang lebih stabil dan aman.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Device ID</label>
              <input
                type="text"
                value={config.deviceId}
                onChange={(e) => setConfig({ ...config, deviceId: e.target.value })}
                placeholder="Contoh: IOT_001"
                disabled={status.isConnected || status.isConnecting}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-500 text-gray-900"
                aria-label="Device ID"
              />
              <p className="text-xs text-gray-600 mt-1">
                {status.isConnected || status.isConnecting 
                  ? "Device ID tidak dapat diubah saat terhubung" 
                  : "Masukkan Device ID untuk menghubungkan ke IoT device"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                status.isConnected 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : status.isConnecting 
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {status.isConnecting ? '🔄 Menghubungkan...' : 
                 status.isConnected ? '✅ Terhubung' : '❌ Terputus'}
              </div>
              
              {status.reconnectAttempts > 0 && (
                <div className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-800 border border-gray-300 font-medium">
                  Percobaan ke-{status.reconnectAttempts}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
              <button
                onClick={handleConnect}
                disabled={status.isConnected || status.isConnecting}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm sm:text-base transition-colors shadow-md"
              >
                {status.isConnecting ? '🔄 Menghubungkan...' : '📶 Hubungkan'}
              </button>
              
              <button
                onClick={disconnect}
                disabled={!status.isConnected}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm sm:text-base transition-colors shadow-md"
              >
                📵 Putuskan
              </button>
              
              <button
                onClick={reconnect}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold text-sm sm:text-base transition-colors shadow-md"
              >
                🔄 Reconnect
              </button>
            </div>

            {status.isConnected && (
              <div className="text-center">
                <button
                  onClick={() => setCurrentStep('child-data')}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  Lanjutkan ke Data Anak ➡️
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Child Data */}
        {currentStep === 'child-data' && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-green-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                👶
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Langkah 2: Data Anak
              </h2>
            </div>
            
            {/* Personal Information */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-blue-100 rounded">
                  👤
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">
                  Informasi Personal
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="nama-anak" className="block text-sm font-bold text-gray-800 mb-2">Nama Anak *</label>
                  <input
                    id="nama-anak"
                    type="text"
                    value={childData.nama}
                    onChange={(e) => setChildData({ ...childData, nama: e.target.value })}
                    placeholder="Masukkan nama lengkap anak"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 text-gray-900"
                    aria-label="Nama Anak"
                  />
                </div>
                
                <div>
                  <label htmlFor="tanggal-lahir" className="block text-sm font-bold text-gray-800 mb-2">Tanggal Lahir *</label>
                  <input
                    id="tanggal-lahir"
                    type="date"
                    value={childData.tanggal_lahir}
                    onChange={(e) => setChildData({ ...childData, tanggal_lahir: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    aria-label="Tanggal Lahir"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div>
                  <label htmlFor="jenis-kelamin" className="block text-sm font-bold text-gray-800 mb-2">Jenis Kelamin *</label>
                  <select
                    id="jenis-kelamin"
                    value={childData.jenis_kelamin}
                    onChange={(e) => setChildData({ ...childData, jenis_kelamin: e.target.value as ChildData['jenis_kelamin'] })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    aria-label="Jenis Kelamin"
                  >
                    <option value="" className="text-gray-500">Pilih jenis kelamin</option>
                    <option value="L" className="text-gray-900">Laki-laki</option>
                    <option value="P" className="text-gray-900">Perempuan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Birth Information */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-purple-100 rounded">
                  📅
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">
                  Data Kelahiran
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Berat Badan Lahir (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={childData.bb_lahir || ''}
                    onChange={(e) => setChildData({ ...childData, bb_lahir: parseFloat(e.target.value) || 0 })}
                    placeholder="Contoh: 3.2"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Tinggi Badan Lahir (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={childData.tb_lahir || ''}
                    onChange={(e) => setChildData({ ...childData, tb_lahir: parseFloat(e.target.value) || 0 })}
                    placeholder="Contoh: 50.5"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setCurrentStep('connection')}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-colors shadow-md"
              >
                ⬅️ Kembali
              </button>
              
              <button
                onClick={() => setCurrentStep('measurement')}
                disabled={!isChildDataComplete}
                className={`px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 shadow-lg ${
                  isChildDataComplete
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 transform hover:scale-105'
                    : 'bg-gray-400 cursor-not-allowed text-gray-700'
                }`}
              >
                Lanjutkan ke Pengukuran ➡️
              </button>
            </div>

            {!isChildDataComplete && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
                <div className="flex items-center gap-3 text-yellow-800">
                  <span className="text-xl">⚠️</span>
                  <span className="font-semibold">
                    Mohon lengkapi semua data yang diperlukan untuk melanjutkan.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Measurement */}
        {currentStep === 'measurement' && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-purple-200 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                ⚖️
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Langkah 3: Pengukuran Saat Ini (IoT Device)
              </h2>
            </div>

            {/* IoT Data Display */}
            {iotData && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-blue-200 shadow-sm">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                  📡 Data IoT Real-time
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between items-center p-2 bg-white rounded-md">
                    <span className="text-gray-700 font-medium">Berat Badan:</span>
                    <span className="ml-2 font-mono font-bold text-blue-700">{iotData.bb} kg</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-md">
                    <span className="text-gray-700 font-medium">Tinggi Badan:</span>
                    <span className="ml-2 font-mono font-bold text-green-700">{iotData.tb} cm</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-md">
                    <span className="text-gray-700 font-medium">Device ID:</span>
                    <span className="ml-2 font-mono text-gray-800">{iotData.did}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-md">
                    <span className="text-gray-700 font-medium">Status:</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      iotData.status === 'updated' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {iotData.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for IoT Data */}
            {!iotData && (
              <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200 shadow-sm">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                  ⏳ Menunggu Data IoT
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  Sistem sedang memeriksa data dari IoT device secara berkala...
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span>Polling setiap 2 detik untuk data baru dari IoT device</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Berat Badan (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={updatedChildData.berat || ''}
                  disabled
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 cursor-not-allowed text-gray-900 font-medium"
                  placeholder="Menunggu data dari IoT device..."
                  aria-label="Berat Badan dalam kilogram"
                />
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  {status.hasData ? '✅ Data dari IoT device tersedia' : '⏳ Menunggu data IoT device...'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Tinggi Badan (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={updatedChildData.tinggi || ''}
                  disabled
                  className="w-full px-4 py-3 border-2 border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-green-100 cursor-not-allowed text-gray-900 font-medium"
                  placeholder="Menunggu data dari IoT device..."
                />
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  {status.hasData ? '✅ Data dari IoT device tersedia' : '⏳ Menunggu data IoT device...'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setCurrentStep('child-data')}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-colors shadow-md"
              >
                ⬅️ Kembali
              </button>
              
              <button
                onClick={handlePredict}
                disabled={!canPredict || isLoading}
                className={`px-8 py-4 text-base sm:text-lg font-bold rounded-xl transition-all duration-300 shadow-lg ${
                  canPredict && !isLoading
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white transform hover:scale-105'
                    : 'bg-gray-400 cursor-not-allowed text-gray-700'
                }`}
              >
                {isLoading ? '🔄 Memproses Prediksi...' : '🔮 Prediksi Status Stunting'}
              </button>
            </div>

            {!canPredict && !isLoading && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
                <div className="flex items-center gap-3 text-yellow-800">
                  <span className="text-xl">⚠️</span>
                  <span className="font-semibold">
                    {!status.hasData 
                      ? 'Menunggu data dari IoT device untuk melanjutkan prediksi.'
                      : 'Mohon lengkapi semua data yang diperlukan untuk melakukan prediksi.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 'result' && prediction && (
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border-2 border-green-300 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                📊
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Langkah 4: Hasil Prediksi
              </h2>
            </div>
            
            {/* Overall Status */}
            <div className={`p-6 rounded-xl text-center mb-6 shadow-lg border-2 ${
              getOverallStatus() === 'STATUS NORMAL' 
                ? 'bg-gradient-to-r from-green-100 to-blue-100 border-green-300' 
                : 'bg-gradient-to-r from-red-100 to-orange-100 border-red-300'
            }`}>
              <div className={`text-2xl sm:text-3xl font-bold ${
                getOverallStatus() === 'STATUS NORMAL' ? 'text-green-700' : 'text-red-700'
              }`}>
                {getOverallStatus() === 'STATUS NORMAL' ? '✅' : '⚠️'} {getOverallStatus()}
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4 mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800">Detail Analisis Status Gizi</h3>
              
              {prediction.tbu && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gray-50 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 mb-2 sm:mb-0">Status Tinggi Badan menurut Umur (TB/U):</span>
                  <span className={`px-4 py-2 rounded-full font-bold text-center ${
                    prediction.tbu.toLowerCase().includes('pendek') 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>
                    {prediction.tbu}
                  </span>
                </div>
              )}
              
              {prediction.bbu && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gray-50 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 mb-2 sm:mb-0">Status Berat Badan menurut Umur (BB/U):</span>
                  <span className={`px-4 py-2 rounded-full font-bold text-center ${
                    prediction.bbu.toLowerCase().includes('kurang') 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : prediction.bbu.toLowerCase().includes('lebih')
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>
                    {prediction.bbu}
                  </span>
                </div>
              )}
              
              {prediction.bbtb && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gray-50 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 mb-2 sm:mb-0">Status Berat Badan menurut Tinggi Badan (BB/TB):</span>
                  <span className={`px-4 py-2 rounded-full font-bold text-center ${
                    prediction.bbtb.toLowerCase().includes('kurang') 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : prediction.bbtb.toLowerCase().includes('lebih')
                      ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>
                    {prediction.bbtb}
                  </span>
                </div>
              )}
            </div>

            {/* Z-Scores */}
            {(prediction.zs_tbu !== undefined || prediction.zs_bbu !== undefined || prediction.zs_bbtb !== undefined) && (
              <div className="mb-6">
                <h4 className="font-bold mb-4 text-gray-800">Z-Score Values</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {prediction.zs_tbu !== undefined && (
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 shadow-sm">
                      <div className="text-sm text-gray-700 font-semibold">Z-Score TB/U</div>
                      <div className="text-xl font-mono font-bold text-blue-700">{prediction.zs_tbu.toFixed(2)}</div>
                    </div>
                  )}
                  {prediction.zs_bbu !== undefined && (
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 shadow-sm">
                      <div className="text-sm text-gray-700 font-semibold">Z-Score BB/U</div>
                      <div className="text-xl font-mono font-bold text-blue-700">{prediction.zs_bbu.toFixed(2)}</div>
                    </div>
                  )}
                  {prediction.zs_bbtb !== undefined && (
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 shadow-sm">
                      <div className="text-sm text-gray-700 font-semibold">Z-Score BB/TB</div>
                      <div className="text-xl font-mono font-bold text-blue-700">{prediction.zs_bbtb.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* Child Info Summary */}
            <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border-2 border-gray-300 shadow-sm">
              <h4 className="font-bold mb-3 text-gray-800">Data Anak</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-white rounded-md">
                  <span className="text-gray-700 font-medium">Nama:</span> 
                  <span className="font-bold text-gray-900">{updatedChildData.nama}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-md">
                  <span className="text-gray-700 font-medium">Jenis Kelamin:</span> 
                  <span className="font-bold text-gray-900">{updatedChildData.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-md">
                  <span className="text-gray-700 font-medium">Berat Saat Ini:</span> 
                  <span className="font-bold text-blue-700">{updatedChildData.berat} kg</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-md">
                  <span className="text-gray-700 font-medium">Tinggi Saat Ini:</span> 
                  <span className="font-bold text-green-700">{updatedChildData.tinggi} cm</span>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-3 font-medium text-center">
                Prediksi dibuat pada: {new Date().toLocaleString('id-ID')}
              </div>
            </div>

            {/* Reset Button */}
            <div className="text-center">
              <button
                onClick={handleResetToStart}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                🔄 Kembali ke Awal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
