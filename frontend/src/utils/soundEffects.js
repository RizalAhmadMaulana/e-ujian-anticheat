/**
 * Sound Effects Synthesizer menggunakan Web Audio API murni
 * 100% dipastikan bersuara di browser tanpa bergantung pada file mp3 eksternal
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 1. Bunyi Sirine Peringatan Pelanggaran Anti-Cheat (Emergency Siren)
 * Bersuara tajam & berulang saat siswa terdeteksi curang / melanggar lockdown
 */
export function playViolationWarningSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Nada Peringatan 1 (High Sawtooth)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.3); // Pitch bend down

    gain1.gain.setValueAtTime(0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Nada Peringatan 2 (Echo siren berulang)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(987.77, now + 0.25); // B5
    osc2.frequency.exponentialRampToValueAtTime(329.63, now + 0.6);

    gain2.gain.setValueAtTime(0.8, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('[SoundEffects] Gagal memutar Web Audio warning:', err);
  }
}

/**
 * 2. Bunyi Notifikasi Alarm Besar Selesai Ujian (ExamBrowser Style Loud Alarm)
 * Bersuara nyaring dan megah selama ~2.5 detik saat siswa sukses keluar menggunakan Password Keluar
 */
export function playExitSuccessAlarm() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Rangkaian Chime Megah & Fanfare (C5 -> E5 -> G5 -> C6 -> Sustained Chord)
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.35 },  // C5
      { freq: 659.25, time: 0.2, dur: 0.35 },  // E5
      { freq: 783.99, time: 0.4, dur: 0.45 },  // G5
      { freq: 1046.50, time: 0.65, dur: 1.8 }, // C6 (Long Bell)
      { freq: 523.25, time: 0.65, dur: 1.8 },  // Harmony C5
      { freq: 783.99, time: 0.65, dur: 1.8 },  // Harmony G5
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0.7, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.05);
    });
  } catch (err) {
    console.warn('[SoundEffects] Gagal memutar Web Audio exit alarm:', err);
  }
}

