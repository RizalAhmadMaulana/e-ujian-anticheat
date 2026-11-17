import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import 'katex/dist/katex.min.css';

// Proteksi Mutlak: Netralkan Web Speech Recognition & Microphone di tingkat global peramban
// Menjamin 100% TIDAK ADA notifikasi izin mikrofon ("ujian.mentariku.org ingin menggunakan mikrofon Anda")
// dan TIDAK ADA suara system earcon Google Chime ("tuting tunting") di HP Android maupun Laptop
if (typeof window !== 'undefined') {
  try {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  } catch (_) {}
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


