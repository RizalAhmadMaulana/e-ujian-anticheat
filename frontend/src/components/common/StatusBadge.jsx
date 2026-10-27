import React from 'react';
import { ShieldAlert, CheckCircle, Clock, Ban } from 'lucide-react';

export default function StatusBadge({ status, className = '' }) {
  switch (status) {
    case 'WORKING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 ${className}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Fokus Mengerjakan
        </span>
      );
    case 'LOCKED_VIOLATION':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-400 animate-pulse-fast ${className}`}>
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
          Layar Terkunci (Pelanggaran)
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 ${className}`}>
          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
          Selesai Terkirim
        </span>
      );
    case 'DISQUALIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300 ${className}`}>
          <Ban className="w-3.5 h-3.5 text-slate-600" />
          Didiskualifikasi
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {status || 'Menunggu'}
        </span>
      );
  }
}

