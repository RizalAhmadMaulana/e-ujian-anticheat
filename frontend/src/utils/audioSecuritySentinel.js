/**
 * AudioSecuritySentinel: Passive Sentinel Stub (Zero-Permission & Zero-Sound)
 * 
 * Seluruh deteksi Gemini Live & Asisten AI kini ditangani secara murni oleh:
 * 1. OS Focus Loss Watchdog (document.hasFocus() <= 500ms) di useExamSecurity.js
 * 2. Window Blur Interceptor (window.onblur)
 * 3. Hardware Button Guard (Volume/Power)
 * 
 * Tidak lagi meminta izin mikrofon peramban dan tidak memutar audio system chime Google apapun.
 */
export class AudioSecuritySentinel {
  constructor() {
    this.isDestroyed = false;
  }

  setPaused() {}

  async start() {}

  stop() {
    this.isDestroyed = true;
  }
}
