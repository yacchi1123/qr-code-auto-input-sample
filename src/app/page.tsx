'use client';

import { useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraDevice {
  id: string;
  label: string;
}

export default function Home() {
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startScanning = useCallback(async () => {
    setIsScanning(true);
    setError('');
    
    try {
      // まず、現在のプロトコルを確認
      console.log('Current protocol:', window.location.protocol);
      
      // HTTPSでない場合は警告を表示
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError('カメラアクセスにはHTTPS接続が必要です。localhostまたはHTTPS経由でアクセスしてください。');
        setIsScanning(false);
        return;
      }

      // カメラデバイスを取得（権限確認も含む）
      console.log('カメラデバイスの取得を開始...');
      let cameras: CameraDevice[] = [];
      
      try {
        cameras = await Html5Qrcode.getCameras();
        console.log('利用可能なカメラデバイス:', cameras);
      } catch (cameraError) {
        console.error('カメラデバイス取得エラー:', cameraError);
        
        // カメラが見つからない場合は、MediaDevicesAPIを直接使用して権限を確認
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // すぐに停止
            
            // 権限が取得できたら、再度カメラデバイスを取得
            cameras = await Html5Qrcode.getCameras();
            console.log('権限取得後のカメラデバイス:', cameras);
          } catch (permissionError) {
            console.error('カメラ権限エラー:', permissionError);
            if (permissionError instanceof Error) {
              if (permissionError.name === 'NotAllowedError') {
                setError('カメラの使用が許可されていません。ブラウザでカメラの使用を許可してください。');
              } else if (permissionError.name === 'NotFoundError') {
                setError('カメラが見つかりません。カメラが接続されているか確認してください。');
              } else {
                setError(`カメラアクセスエラー: ${permissionError.message}`);
              }
            } else {
              setError('カメラにアクセスできませんでした。');
            }
            setIsScanning(false);
            return;
          }
        } else {
          setError('このブラウザはカメラアクセスをサポートしていません。');
          setIsScanning(false);
          return;
        }
      }
      
      if (cameras.length === 0) {
        setError('利用可能なカメラが見つかりません。');
        setIsScanning(false);
        return;
      }

      // Html5Qrcodeインスタンスを作成
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          console.log('既存のスキャナーの停止:', e);
        }
      }
      
      html5QrCodeRef.current = new Html5Qrcode('video');

      // 背面カメラを探す
      const backCamera = cameras.find((camera: CameraDevice) => {
        const label = camera.label.toLowerCase();
        return label.includes('back') || 
               label.includes('rear') || 
               label.includes('environment');
      });

      // 背面カメラが見つからない場合は最初のデバイスを使用
      const selectedCamera = backCamera || cameras[0];
      
      console.log('選択されたカメラ:', {
        id: selectedCamera.id, 
        label: selectedCamera.label
      });

      // QRコードスキャンの設定
      const qrCodeSuccessCallback = (decodedText: string) => {
        console.log('QRコードを読み取りました:', decodedText);
        setCode(decodedText);
        stopScanning();
      };

      const qrCodeErrorCallback = () => {
        // エラーメッセージは大量に出力されるため、コンソールには出力しない
      };

      // スキャン開始
      console.log('スキャンを開始します...');
      await html5QrCodeRef.current.start(
        selectedCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );

      console.log('スキャンが正常に開始されました');

    } catch (err) {
      console.error('予期しないエラー:', err);
      
      // より詳細なエラーメッセージ
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('カメラの使用が許可されていません。ブラウザでカメラの使用を許可してください。');
        } else if (err.name === 'NotFoundError') {
          setError('カメラが見つかりません。カメラが接続されているか確認してください。');
        } else if (err.name === 'NotReadableError') {
          setError('カメラが他のアプリケーションで使用されています。他のアプリケーションを閉じてから再度お試しください。');
        } else if (err.message.includes('Permission denied')) {
          setError('カメラの使用が許可されていません。ブラウザでカメラの使用を許可してください。');
        } else if (err.message.includes('HTTPS')) {
          setError('カメラアクセスにはHTTPS接続が必要です。');
        } else {
          setError(`カメラアクセスエラー: ${err.message}`);
        }
      } else {
        setError('カメラにアクセスできませんでした。ブラウザを更新してもう一度お試しください。');
      }
      setIsScanning(false);
    }
  }, []);

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        console.log('スキャンを停止します...');
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        console.log('スキャンが正常に停止されました');
      } catch (err) {
        console.error('スキャン停止エラー:', err);
      }
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
              <div
                id="video"
                className="w-full rounded-lg aspect-square [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>video]:rounded-lg"
              />
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
