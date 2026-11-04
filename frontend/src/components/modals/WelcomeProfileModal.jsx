import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, UserCheck, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

/**
 * Modal Peringatan Keamanan & Lengkapi Profil Pengguna
 * Muncul saat user pertama kali login dan mendeteksi data profil belum lengkap
 * atau kata sandi masih menggunakan bawaan sistem (NIP/default).
 */
export default function WelcomeProfileModal({ user, onClose }) {
  const navigate = useNavigate();

  const isStudent = user?.role === 'STUDENT';
  const targetProfileUrl = isStudent ? '/student/profile' : '/teacher/profile';

  const handleNavigateToProfile = () => {
    sessionStorage.setItem('dismiss_profile_welcome_modal', 'true');
    onClose();
    navigate(targetProfileUrl);
  };

  const handleDismissLater = () => {
    sessionStorage.setItem('dismiss_profile_welcome_modal', 'true');
    onClose();
  };

  const isPasswordDefault = user?.is_password_default;
  const isProfileIncomplete = !user?.is_profile_complete;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-zoom-in">
        {/* Header Visual with Indigo & Slate gradient */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-950/50">
            <ShieldAlert className="w-7 h-7 text-amber-400" />
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold tracking-wider uppercase mb-2">
            Pemberitahuan Keamanan Akun {isStudent ? 'Peserta Siswa' : 'Pengawas'}
          </span>
          <h3 className="font-extrabold text-xl sm:text-2xl text-white tracking-tight">
            Selamat Datang di E-UJIAN PRO! 👋
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto">
            Halo <strong className="text-white">{user?.fullName || user?.full_name || user?.username}</strong>, demi menjaga keamanan akun dan privasi nilai asesmen Anda, kami menyarankan Anda memperbarui profil dan mengganti kata sandi bawaan.
          </p>
        </div>

        {/* Content Body: Highlight Warnings */}
        <div className="p-6 space-y-4 bg-slate-50/50">
          <div className="space-y-2.5">
            {isPasswordDefault && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900">
                <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700 shrink-0 mt-0.5">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-bold text-amber-950">Kata Sandi Masih Bawaan Sistem</div>
                  <div className="text-amber-800/90 text-[11px] mt-0.5">
                    Akun Anda saat ini masih memakai kata sandi bawaan ({isStudent ? 'NISN/default' : 'NIP/default'}). Segera ganti dengan sandi pribadi yang hanya Anda ketahui.
                  </div>
                </div>
              </div>
            )}

            {isProfileIncomplete && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-950">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-bold text-indigo-950">Biodata Belum Lengkap</div>
                  <div className="text-indigo-800/90 text-[11px] mt-0.5">
                    Lengkapi alamat email aktif dan periksa nama lengkap Anda untuk keperluan verifikasi dan identitas laporan asesmen.
                  </div>
                </div>
              </div>
            )}

            {!isPasswordDefault && !isProfileIncomplete && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Profil dan kredensial Anda sudah terpasang dengan baik.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={handleDismissLater}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Ingatkan Saya Nanti</span>
            </button>
            <button
              type="button"
              onClick={handleNavigateToProfile}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30"
            >
              <span>Lengkapi Profil Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

