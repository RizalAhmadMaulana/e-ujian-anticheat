import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { ShieldAlert } from 'lucide-react';

/**
 * Guard untuk membatasi akses halaman berdasarkan Role ('TEACHER' atau 'STUDENT')
 */
export default function RoleRouteGuard({ allowedRoles, children }) {
  const { currentUser, isAuthenticated } = useExamStore();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Arahkan ke rute default masing-masing jika peran tidak cocok
    if (currentUser.role === 'TEACHER') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else if (currentUser.role === 'STUDENT') {
      return <Navigate to="/student/gatekeeper" replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-600 text-sm mb-6">
            Akun Anda ({currentUser.role}) tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return children;
}

