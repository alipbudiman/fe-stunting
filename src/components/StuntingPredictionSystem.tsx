'use client';

import { useState, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChildData, PredictionResult, ApiResponse, ConnectionConfig } from '@/types/prediction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  Heart, 
  Activity, 
  Wifi, 
  WifiOff, 
  Loader2, 
  Baby, 
  Scale, 
  Ruler,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function StuntingPredictionSystem() {
  const [config, setConfig] = useState<ConnectionConfig>({
    serverUrl: 'localhost:5000',
    deviceId: 'IOT_001'
  });

  const [childData, setChildData] = useState<ChildData>({
    nama: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L',
    bb_lahir: 0,
    tb_lahir: 0,
    berat: 0,
    tinggi: 0
  });

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: iotData, status, connect, disconnect, reconnect } = useWebSocket({
    serverUrl: config.serverUrl,
    deviceId: config.deviceId,
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 3000,
  });

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

  // Check if all required data is available
  const canPredict = useMemo(() => {
    return (
      updatedChildData.nama.trim() !== '' &&
      updatedChildData.tanggal_lahir !== '' &&
      (updatedChildData.jenis_kelamin === 'L' || updatedChildData.jenis_kelamin === 'P') &&
      updatedChildData.bb_lahir > 0 &&
      updatedChildData.tb_lahir > 0 &&
      updatedChildData.berat > 0 &&
      updatedChildData.tinggi > 0 &&
      status.hasData
    );
  }, [updatedChildData, status.hasData]);

  const formatDateForAPI = (dateString: string): string => {
    return dateString; // API expects YYYY-MM-DD format
  };

  const handlePredict = async () => {
    if (!canPredict) return;

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const httpProtocol = config.serverUrl.startsWith('localhost') || config.serverUrl.startsWith('127.0.0.1') ? 'http' : 'https';
      const cleanUrl = config.serverUrl.replace(/^https?:\/\//, '');
      const apiUrl = `${httpProtocol}://${cleanUrl}/predict`;

      const requestData = {
        nama: updatedChildData.nama,
        tanggal_lahir: formatDateForAPI(updatedChildData.tanggal_lahir),
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
        setPrediction(result.data);
      } else {
        throw new Error(result.message || 'Prediction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('normal')) return 'text-green-600';
    if (status.toLowerCase().includes('pendek') || status.toLowerCase().includes('kurang')) return 'text-red-600';
    if (status.toLowerCase().includes('lebih')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getOverallStatus = () => {
    if (!prediction) return null;
    
    const isStunted = 
      prediction.tbu?.toLowerCase().includes('pendek') ||
      prediction.bbu?.toLowerCase().includes('kurang') ||
      prediction.bbtb?.toLowerCase().includes('kurang');
    
    return isStunted ? 'PERLU PERHATIAN' : 'STATUS NORMAL';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Heart className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">ML Stunting</h1>
          </div>
          <p className="text-lg text-gray-600">Sistem Prediksi Stunting dengan Data IoT Real-time</p>
        </div>

        {/* Connection Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.isConnected ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              Koneksi IoT Device
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serverUrl">Server URL</Label>
                <Input
                  id="serverUrl"
                  value={config.serverUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, serverUrl: e.target.value })}
                  placeholder="localhost:5000"
                  disabled={status.isConnected}
                />
              </div>
              <div>
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  value={config.deviceId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, deviceId: e.target.value })}
                  placeholder="IOT_001"
                  disabled={status.isConnected}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge 
                variant={status.isConnected ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {status.isConnecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : status.isConnected ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {status.isConnecting ? 'Menghubungkan...' : 
                 status.isConnected ? 'Terhubung' : 'Terputus'}
              </Badge>
              
              {status.reconnectAttempts > 0 && (
                <Badge variant="outline">
                  Percobaan ke-{status.reconnectAttempts}
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={connect}
                disabled={status.isConnected || status.isConnecting}
                size="sm"
              >
                {status.isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                Hubungkan
              </Button>
              
              <Button
                onClick={disconnect}
                disabled={!status.isConnected}
                variant="outline"
                size="sm"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Putuskan
              </Button>
              
              <Button
                onClick={reconnect}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            </div>

            {/* IoT Data Display */}
            {iotData && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Data IoT Real-time
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Berat Badan:</span>
                    <span className="ml-2 font-mono font-semibold">{iotData.bb} kg</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tinggi Badan:</span>
                    <span className="ml-2 font-mono font-semibold">{iotData.tb} cm</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Device ID:</span>
                    <span className="ml-2 font-mono">{iotData.did}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Badge 
                      variant={iotData.status === 'updated' ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {iotData.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Child Data Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-pink-600" />
              Data Anak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Informasi Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nama">Nama Anak *</Label>
                  <Input
                    id="nama"
                    value={childData.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChildData({ ...childData, nama: e.target.value })}
                    placeholder="Masukkan nama anak"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
                  <Input
                    id="tanggal_lahir"
                    type="date"
                    value={childData.tanggal_lahir}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChildData({ ...childData, tanggal_lahir: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
                  <Select
                    value={childData.jenis_kelamin}
                    onValueChange={(value: string) => setChildData({ ...childData, jenis_kelamin: value as 'L' | 'P' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Birth Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Data Kelahiran
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bb_lahir">Berat Badan Lahir (kg) *</Label>
                  <Input
                    id="bb_lahir"
                    type="number"
                    step="0.1"
                    value={childData.bb_lahir || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChildData({ ...childData, bb_lahir: parseFloat(e.target.value) || 0 })}
                    placeholder="contoh: 3.2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tb_lahir">Tinggi Badan Lahir (cm) *</Label>
                  <Input
                    id="tb_lahir"
                    type="number"
                    step="0.1"
                    value={childData.tb_lahir || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChildData({ ...childData, tb_lahir: parseFloat(e.target.value) || 0 })}
                    placeholder="contoh: 50"
                  />
                </div>
              </div>
            </div>

            {/* Current Measurements (IoT) */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Pengukuran Saat Ini (IoT Device)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="berat">Berat Badan (kg)</Label>
                  <Input
                    id="berat"
                    type="number"
                    step="0.1"
                    value={updatedChildData.berat || ''}
                    disabled
                    className="bg-blue-50 border-blue-200"
                    placeholder="Menunggu data IoT..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {status.hasData ? '✅ Data dari IoT device' : '⏳ Menunggu data IoT...'}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="tinggi">Tinggi Badan (cm)</Label>
                  <Input
                    id="tinggi"
                    type="number"
                    step="0.1"
                    value={updatedChildData.tinggi || ''}
                    disabled
                    className="bg-blue-50 border-blue-200"
                    placeholder="Menunggu data IoT..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {status.hasData ? '✅ Data dari IoT device' : '⏳ Menunggu data IoT...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Predict Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={handlePredict}
                disabled={!canPredict || isLoading}
                size="lg"
                className="w-full md:w-auto px-8 py-3 text-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Activity className="h-5 w-5 mr-2" />
                )}
                {isLoading ? 'Memproses Prediksi...' : 'Prediksi Status Stunting'}
              </Button>
            </div>

            {!canPredict && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {!status.hasData 
                    ? 'Menunggu data dari IoT device untuk melanjutkan prediksi.'
                    : 'Mohon lengkapi semua data yang diperlukan.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Prediction Results */}
        {prediction && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-green-600" />
                Hasil Prediksi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Status */}
              <div className={`p-6 rounded-lg text-center ${
                getOverallStatus() === 'STATUS NORMAL' 
                  ? 'bg-green-100 border border-green-200' 
                  : 'bg-red-100 border border-red-200'
              }`}>
                <div className={`text-2xl font-bold ${
                  getOverallStatus() === 'STATUS NORMAL' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {getOverallStatus() === 'STATUS NORMAL' ? '✅' : '⚠️'} {getOverallStatus()}
                </div>
              </div>

              {/* Detailed Results */}
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold">Detail Analisis Status Gizi</h3>
                
                <div className="space-y-3">
                  {prediction.tbu && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Status Tinggi Badan menurut Umur (TB/U):</span>
                      <Badge className={`${getStatusColor(prediction.tbu)} bg-transparent border`}>
                        {prediction.tbu}
                      </Badge>
                    </div>
                  )}
                  
                  {prediction.bbu && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Status Berat Badan menurut Umur (BB/U):</span>
                      <Badge className={`${getStatusColor(prediction.bbu)} bg-transparent border`}>
                        {prediction.bbu}
                      </Badge>
                    </div>
                  )}
                  
                  {prediction.bbtb && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Status Berat Badan menurut Tinggi Badan (BB/TB):</span>
                      <Badge className={`${getStatusColor(prediction.bbtb)} bg-transparent border`}>
                        {prediction.bbtb}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Z-Scores */}
                {(prediction.zs_tbu || prediction.zs_bbu || prediction.zs_bbtb) && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Z-Score Values</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {prediction.zs_tbu !== undefined && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Z-Score TB/U</div>
                          <div className="text-lg font-mono font-semibold">{prediction.zs_tbu.toFixed(2)}</div>
                        </div>
                      )}
                      {prediction.zs_bbu !== undefined && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Z-Score BB/U</div>
                          <div className="text-lg font-mono font-semibold">{prediction.zs_bbu.toFixed(2)}</div>
                        </div>
                      )}
                      {prediction.zs_bbtb !== undefined && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Z-Score BB/TB</div>
                          <div className="text-lg font-mono font-semibold">{prediction.zs_bbtb.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Child Info Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-3">Data Anak</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Nama:</span> <span className="font-medium">{updatedChildData.nama}</span></div>
                    <div><span className="text-gray-600">Jenis Kelamin:</span> <span className="font-medium">{updatedChildData.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
                    <div><span className="text-gray-600">Berat Saat Ini:</span> <span className="font-medium">{updatedChildData.berat} kg</span></div>
                    <div><span className="text-gray-600">Tinggi Saat Ini:</span> <span className="font-medium">{updatedChildData.tinggi} cm</span></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Prediksi dibuat pada: {new Date().toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
