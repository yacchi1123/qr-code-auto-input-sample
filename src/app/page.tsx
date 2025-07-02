'use client';

import { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function Home() {
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const startScanning = useCallback(async () => {
    setIsScanning(true);
    setError('');
    
    try {
      // 毎回新しいreaderを作成して確実に背面カメラを選択
      if (readerRef.current) {
        readerRef.current.reset();
      }
      readerRef.current = new BrowserMultiFormatReader();

      const videoInputDevices = await readerRef.current.listVideoInputDevices();
      
      // デバッグ用：利用可能なカメラデバイスをログ出力
      console.log('利用可能なカメラデバイス:', videoInputDevices.map(device => ({
        deviceId: device.deviceId,
        label: device.label
      })));
      
      if (videoInputDevices.length === 0) {
        throw new Error('カメラが見つかりません');
      }

      // 背面カメラを確実に選択（より厳密な判定）
      let targetDeviceId = selectedDeviceId;
      
      if (!targetDeviceId) {
        const backCameraDevice = videoInputDevices.find(device => {
          const label = device.label.toLowerCase();
          return label.includes('back') || 
                 label.includes('rear') || 
                 label.includes('environment') ||
                 label.includes('背面') ||
                 // iOSの場合、backgroundという文字列が含まれることがある
                 label.includes('background');
        });
        
        // 背面カメラが見つからない場合は、前面カメラではないものを選択
        const nonFrontCamera = videoInputDevices.find(device => {
          const label = device.label.toLowerCase();
          return !label.includes('front') && 
                 !label.includes('user') && 
                 !label.includes('face') &&
                 !label.includes('前面');
        });
        
        const selectedDevice = backCameraDevice || nonFrontCamera || videoInputDevices[videoInputDevices.length - 1];
        targetDeviceId = selectedDevice.deviceId;
        setSelectedDeviceId(targetDeviceId);
        
        // デバッグ用：選択されたカメラデバイスをログ出力
        console.log('選択されたカメラデバイス:', {
          deviceId: selectedDevice.deviceId,
          label: selectedDevice.label
        });
      }

      readerRef.current.decodeOnceFromVideoDevice(targetDeviceId, 'video')
        .then((result) => {
          setCode(result.getText());
          setIsScanning(false);
        })
        .catch((err) => {
          console.log(err);
          setError('QRコード・バーコードを読み取れませんでした');
          setIsScanning(false);
        });
    } catch (err) {
      console.error(err);
      setError('カメラにアクセスできませんでした');
      setIsScanning(false);
    }
  }, [selectedDeviceId]);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      // iOSでの問題を避けるため、readerを完全に破棄
      readerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleUseCode = () => {
    if (code.trim()) {
      alert(`コード「${code}」を使用します`);
      // ここに実際のコード使用処理を実装
    } else {
      alert('コードを入力してください');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-center text-gray-800 mb-8">
          ポイントコードを使用する
        </h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            コード入力
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            placeholder="コードを入力またはスキャン"
          />
        </div>

        <button
          onClick={handleUseCode}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-full font-medium mb-4 hover:bg-blue-700 transition-colors"
        >
          コードを使用する
        </button>

        <button
          onClick={isScanning ? stopScanning : startScanning}
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-full font-medium mb-4 hover:bg-gray-50 transition-colors"
        >
          {isScanning ? 'スキャンを停止' : 'カメラで読み取る'}
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          トップページにもどる
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {isScanning && (
          <div className="mt-6">
            <div className="relative">
              <video
                id="video"
                className="w-full rounded-lg aspect-square object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-l-4 border-t-4 border-blue-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-4 border-t-4 border-blue-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-4 border-b-4 border-blue-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-4 border-b-4 border-blue-500"></div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              QRコードまたはバーコードをカメラに向けてください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
