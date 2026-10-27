import React from 'react';
import { ShieldAlert, CheckCircle, Clock, Ban } from 'lucide-react';

export default function StatusBadge({ status, className = '' }) {
  switch (status) {
    case 'WORKING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border-2 border-emerald-400 shadow-sm ${className}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Fokus Mengerjakan
        </span>
      );
    case 'LOCKED_VIOLATION':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-950 border-2 border-red-500 animate-pulse-fast shadow-md ${className}`}>
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          Layar Terkunci
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border-2 border-blue-400 shadow-sm ${className}`}>
          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
          Selesai Terkirim
        </span>
      );
    case 'DISQUALIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-800 border-2 border-slate-400 shadow-sm ${className}`}>
          <Ban className="w-3.5 h-3.5 text-slate-600" />
          Didiskualifikasi
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border-2 border-slate-300 shadow-sm ${className}`}>
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {status || 'Menunggu'}
        </span>
      );
  }
}

