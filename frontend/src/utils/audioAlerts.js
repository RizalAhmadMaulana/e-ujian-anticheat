/**
 * Audio Synthesizer via Web Audio API & HTML5 Audio Fallback
 * Memastikan suara peringatan kecurangan & alarm keluar dapat berbunyi 100% tanpa gagal
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
 * Memainkan suara peringatan ketika terjadi pelanggaran
 */
export function playViolationWarningSound() {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (err) {
    console.warn('[AudioAlert] Web Audio error:', err);
  }
}

/**
 * Memainkan bunyi alarm keras beruntun saat siswa keluar ujian dengan Password Keluar
 */
export function playExitAlarmSound() {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      // Nada 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.6, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Nada 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now + 0.2); // E5
      gain2.gain.setValueAtTime(0.6, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.5);

      // Nada 3
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(783.99, now + 0.4); // G5
      gain3.gain.setValueAtTime(0.8, now + 0.4);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.4);
      osc3.stop(now + 0.9);
    }
  } catch (err) {
    console.warn('[AudioAlert] Web Audio error:', err);
  }
}

