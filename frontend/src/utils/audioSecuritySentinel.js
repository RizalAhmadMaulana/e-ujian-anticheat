/**
 * AudioSecuritySentinel: Sensor Pengawasan Integritas Audio & Anti-Voice AI (Gemini Live)
 * 
 * Melindungi pelaksanaan ujian dari:
 * 1. Gemini Live / Google Assistant via Voice Hotword ("Hey Google" / "OK Google")
 * 2. Gemini Live via Tombol Fisik Daya / Floating Voice Bar / Ambient Glow
 * 3. Siswa membacakan soal ujian secara lisan (Speech-to-Text & Decibel Volume Threshold)
 * 4. Perebutan eksklusif Audio Focus mikrofon hardware oleh OS Android
 */
export class AudioSecuritySentinel {
  constructor({ onViolation, isExamActive = true }) {
    this.onViolation = onViolation;
    this.isExamActive = isExamActive;
    this.mediaStream = null;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.speechRecognition = null;
    this.volumeCheckInterval = null;
    this.speakingDurationMs = 0;
    this.isDestroyed = false;
    this.isPaused = false;
    this.lastViolationTime = 0;
  }

  setPaused(paused) {
    this.isPaused = Boolean(paused);
    if (this.isPaused) {
      this.speakingDurationMs = 0;
    }
  }

  async start() {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }

    try {
      // 1. Dapatkan stream mikrofon perangkat (Hardware Lock)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      if (this.isDestroyed) {
        this.stop();
        return;
      }

      // 2. Pasang pendengar benturan hardware track mikrofon (Audio Focus Theft)
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const primaryTrack = audioTracks[0];

        // Saat Google Assistant / Gemini Live diaktifkan, OS Android merebut akses mikrofon fisik
        primaryTrack.onmute = () => {
          if (!this.isExamActive || this.isDestroyed || this.isPaused) return;
          const now = Date.now();
          if (now - this.lastViolationTime < 3000) return;
          this.lastViolationTime = now;

          if (this.onViolation) {
            this.onViolation(
              'VOICE_ASSISTANT_ATTEMPT',
              'Siswa terdeteksi mengaktifkan asisten suara / benturan mikrofon (Gemini Live / Google Assistant)'
            );
          }
        };

        primaryTrack.onended = () => {
          if (!this.isExamActive || this.isDestroyed || this.isPaused) return;
          const now = Date.now();
          if (now - this.lastViolationTime < 3000) return;
          this.lastViolationTime = now;

          if (this.onViolation) {
            this.onViolation(
              'VOICE_ASSISTANT_ATTEMPT',
              'Akses sensor mikrofon integritas ujian dihentikan paksa oleh sistem (Gemini Live / Voice AI)'
            );
          }
        };
      }

      // 3. Inisialisasi Web Audio API Context & State Change Listener
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass();

        this.audioContext.onstatechange = () => {
          if (!this.isExamActive || this.isDestroyed || this.isPaused) return;
          // State suspended atau interrupted saat OS mengalihkan audio focus ke Gemini Live
          if (this.audioContext && (this.audioContext.state === 'suspended' || this.audioContext.state === 'interrupted')) {
            const now = Date.now();
            if (now - this.lastViolationTime < 3000) return;
            this.lastViolationTime = now;

            if (this.onViolation) {
              this.onViolation(
                'VOICE_ASSISTANT_ATTEMPT',
                'Audio focus ujian dialihkan ke asisten suara eksternal (Gemini Live / Voice AI)'
              );
            }
          }
        };

        // 4. Analyser Node untuk Pengukuran Desibel & Deteksi Siswa Berbicara Membaca Soal
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.4;
        this.sourceNode.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Interval pemeriksaan intensitas suara setiap 250ms
        this.volumeCheckInterval = setInterval(() => {
          if (!this.isExamActive || this.isDestroyed || this.isPaused || !this.analyser) return;

          this.analyser.getByteFrequencyData(dataArray);

          // Hitung rata-rata amplitudo / Root Mean Square
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avgVolume = sum / bufferLength;

          // Ambang batas suara manusia berbicara normal / membaca soal (biasanya > 50 pada skala 0-255)
          if (avgVolume > 50) {
            this.speakingDurationMs += 250;

            // Jika siswa terdeteksi berbicara / bersuara terus-menerus selama >= 3 detik (indikasi kuat membaca soal)
            if (this.speakingDurationMs >= 3000) {
              this.speakingDurationMs = 0;
              const now = Date.now();
              if (now - this.lastViolationTime < 4000) return;
              this.lastViolationTime = now;

              if (this.onViolation) {
                this.onViolation(
                  'VOICE_SPEAKING_ATTEMPT',
                  'Siswa terdeteksi berbicara / membacakan soal ujian secara bersuara (Dilarang bersuara / Voice AI)'
                );
              }
            }
          } else {
            // Decay speaking duration jika suara berhenti
            this.speakingDurationMs = Math.max(0, this.speakingDurationMs - 150);
          }
        }, 250);
      }

      // 5. Web Speech Recognition API (Speech-to-Text Sentinel jika didukung browser)
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          this.speechRecognition = new SpeechRecognitionClass();
          this.speechRecognition.continuous = true;
          this.speechRecognition.interimResults = true;
          this.speechRecognition.lang = 'id-ID';

          this.speechRecognition.onresult = (event) => {
            if (!this.isExamActive || this.isDestroyed || this.isPaused) return;

            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }

            const cleanTranscript = transcript.trim();
            // Jika kata yang terbaca lebih dari 8 karakter (indikasi membaca kalimat soal ke AI)
            if (cleanTranscript.length >= 10) {
              const now = Date.now();
              if (now - this.lastViolationTime < 4000) return;
              this.lastViolationTime = now;

              if (this.onViolation) {
                const preview = cleanTranscript.length > 35 ? cleanTranscript.slice(0, 35) + '...' : cleanTranscript;
                this.onViolation(
                  'VOICE_SPEAKING_ATTEMPT',
                  `Siswa terdeteksi membaca soal secara lisan: "${preview}" (Dilarang bersuara / Voice AI)`
                );
              }
            }
          };

          this.speechRecognition.onerror = (e) => {
            if (e.error === 'no-speech') return;
            // Jika terjadi konflik audio capture dengan Gemini Live:
            if (e.error === 'audio-capture') {
              if (this.onViolation && this.isExamActive && !this.isDestroyed && !this.isPaused) {
                const now = Date.now();
                if (now - this.lastViolationTime < 4000) return;
                this.lastViolationTime = now;

                this.onViolation(
                  'VOICE_ASSISTANT_ATTEMPT',
                  'Benturan perekaman suara terdeteksi pada mikrofon (Gemini Live / Voice AI)'
                );
              }
            }
          };

          this.speechRecognition.onend = () => {
            // Restart otomatis jika ujian masih aktif
            if (this.isExamActive && !this.isDestroyed && !this.isPaused) {
              try {
                this.speechRecognition.start();
              } catch (_) {}
            }
          };

          this.speechRecognition.start();
        } catch (_) {}
      }

    } catch (err) {
      console.warn('[AudioSecuritySentinel] Akses mikrofon tidak tersedia atau dibatasi:', err);
      // Graceful fallback: Sensor keamanan lain tetap berjalan optimal
    }
  }

  stop() {
    this.isDestroyed = true;

    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.onend = null;
        this.speechRecognition.stop();
      } catch (_) {}
      this.speechRecognition = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (_) {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.mediaStream = null;
    }
  }
}
