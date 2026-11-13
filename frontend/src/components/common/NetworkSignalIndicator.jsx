import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

/**
 * Indikator Kualitas Jaringan Real-Time (Network Heartbeat)
 * Mengukur latensi ping (ms) dan status koneksi internet siswa.
 */
export default function NetworkSignalIndicator({ onLatencyChange }) {
  const [latency, setLatency] = useState(35);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [quality, setQuality] = useState('EXCELLENT'); // EXCELLENT, SLOW, OFFLINE

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkLatency();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setQuality('OFFLINE');
      setLatency(9999);
      onLatencyChange?.({ latency: 9999, quality: 'OFFLINE' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Fungsi pengukur latensi berkala
    const checkLatency = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        setQuality('OFFLINE');
        return;
      }

      const start = performance.now();
      try {
        // Ping ringan ke endpoint backend
        await axiosInstance.get('/auth/me/', { timeout: 4000 });
        const end = performance.now();
        const rtt = Math.round(end - start);
        setLatency(rtt);
        setIsOnline(true);

        let q = 'EXCELLENT';
        if (rtt > 500) {
          q = 'SLOW';
        } else if (rtt > 200) {
          q = 'MODERATE';
        } else {
          q = 'EXCELLENT';
        }
        setQuality(q);
        onLatencyChange?.({ latency: rtt, quality: q });
      } catch (err) {
        if (!navigator.onLine || err.code === 'ECONNABORTED' || !err.response) {
          setIsOnline(false);
          setQuality('OFFLINE');
          setLatency(9999);
          onLatencyChange?.({ latency: 9999, quality: 'OFFLINE' });
        } else {
          // Server merespons (misal error token), tetapi jaringan tetap online
          const end = performance.now();
          const rtt = Math.round(end - start);
          setLatency(rtt);
          setIsOnline(true);
          setQuality(rtt > 500 ? 'SLOW' : 'EXCELLENT');
          onLatencyChange?.({ latency: rtt, quality: 'EXCELLENT' });
        }
      }
    };

    // Jalankan ping pertama
    checkLatency();

    // Interval ping setiap 15 detik
    const pingInterval = setInterval(checkLatency, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, []);

  if (!isOnline || quality === 'OFFLINE') {
    return (
      <div 
        title="Koneksi terputus! Mode Offline Aktif: Jawaban Anda tetap tersimpan aman di perangkat."
        className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-[10px] sm:text-[11px] font-bold animate-pulse shrink-0"
      >
        <WifiOff className="w-3 h-3 text-red-400 shrink-0" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  if (quality === 'SLOW') {
    return (
      <div 
        title={`Koneksi agak lambat (${latency}ms). Jawaban tetap tersimpan aman di perangkat.`}
        className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] sm:text-[11px] font-bold shrink-0"
      >
        <Wifi className="w-3 h-3 text-amber-400 shrink-0" />
        <span>{latency}ms</span>
      </div>
    );
  }

  return (
    <div 
      title={`Koneksi lancar (${latency}ms). Sinkronisasi server real-time.`}
      className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] sm:text-[11px] font-bold shrink-0"
    >
      <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
      <span>{latency}ms</span>
    </div>
  );
}

