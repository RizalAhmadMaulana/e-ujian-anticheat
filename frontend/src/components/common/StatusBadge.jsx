import React from 'react';
import { ShieldAlert, CheckCircle, Clock, Ban } from 'lucide-react';

export default function StatusBadge({ status, className = '' }) {
  switch (status) {
    case 'WORKING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Fokus Mengerjakan
        </span>
      );
    case 'LOCKED_VIOLATION':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
          <ShieldAlert className="w-3 h-3 text-rose-600" />
          Layar Terkunci
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80 ${className}`}>
          <CheckCircle className="w-3 h-3 text-zinc-600" />
          Selesai Terkirim
        </span>
      );
    case 'DISQUALIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200/80 ${className}`}>
          <Ban className="w-3 h-3 text-zinc-500" />
          Didiskualifikasi
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-200/80 ${className}`}>
          <Clock className="w-3 h-3 text-zinc-500" />
          {status || 'Menunggu'}
        </span>
      );
  }
}

