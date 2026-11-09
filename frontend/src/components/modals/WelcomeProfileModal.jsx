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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-zinc-200/90 overflow-hidden animate-zoom-in">
        {/* Clean Header */}
        <div className="p-5 border-b border-zinc-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-medium text-zinc-400 uppercase tracking-wider block">
                Pemberitahuan Keamanan • {isStudent ? 'Siswa' : 'Pengawas'}
              </span>
              <h3 className="text-base font-bold text-zinc-900 tracking-tight mt-0.5">
                Konfigurasi Kredensial Akun
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Halo <strong className="text-zinc-800 font-semibold">{user?.fullName || user?.full_name || user?.username}</strong>, demi keamanan integritas asesmen, kami menyarankan Anda memperbarui profil dan mengganti kata sandi bawaan.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body: Highlight Warnings */}
        <div className="p-5 space-y-3 bg-zinc-50/50">
          <div className="space-y-2">
            {isPasswordDefault && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900">
                <div className="p-1.5 rounded-md bg-amber-100/80 text-amber-700 shrink-0 mt-0.5">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-semibold text-amber-950">Kata Sandi Bawaan Sistem</div>
                  <div className="text-amber-800 text-[11px] mt-0.5">
                    Akun Anda masih memakai kata sandi bawaan ({isStudent ? 'NISN' : 'NIP'}). Harap perbarui ke sandi pribadi yang aman.
                  </div>
                </div>
              </div>
            )}

            {isProfileIncomplete && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950">
                <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-semibold text-blue-950">Biodata Belum Lengkap</div>
                  <div className="text-blue-800 text-[11px] mt-0.5">
                    Lengkapi alamat email aktif dan periksa nama lengkap untuk keperluan rekapitulasi berita acara asesmen.
                  </div>
                </div>
              </div>
            )}

            {!isPasswordDefault && !isProfileIncomplete && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Profil dan kredensial akun Anda sudah terpasang dengan baik.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleDismissLater}
              className="w-full sm:w-auto h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nanti Saja</span>
            </button>
            <button
              type="button"
              onClick={handleNavigateToProfile}
              className="w-full sm:w-auto h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Lengkapi Profil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

