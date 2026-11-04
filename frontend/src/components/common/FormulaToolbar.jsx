import React from 'react';
import { Sigma, Sparkles } from 'lucide-react';

/**
 * Toolbar Bantuan Simbol & Rumus Matematika / Sains Cepat untuk Guru
 * Menyisipkan format LaTeX standar langsung ke posisi kursor form input.
 */
export default function FormulaToolbar({ onInsertFormula }) {
  const formulaButtons = [
    { label: '√x', formula: '$\\sqrt{x}$', tip: 'Akar Kuadrat' },
    { label: 'a/b', formula: '$\\frac{a}{b}$', tip: 'Pecahan' },
    { label: 'x²', formula: '$x^{2}$', tip: 'Pangkat' },
    { label: 'x₁', formula: '$x_{1}$', tip: 'Subskrip Indeks' },
    { label: '±', formula: '$\\pm$', tip: 'Plus Minus' },
    { label: '≤', formula: '$\\le$', tip: 'Kurang Dari Sama Dengan' },
    { label: '≥', formula: '$\\ge$', tip: 'Lebih Dari Sama Dengan' },
    { label: '×', formula: '$\\times$', tip: 'Perkalian' },
    { label: '÷', formula: '$\\div$', tip: 'Pembagian' },
    { label: 'π', formula: '$\\pi$', tip: 'Pi' },
    { label: 'α', formula: '$\\alpha$', tip: 'Alpha' },
    { label: 'β', formula: '$\\beta$', tip: 'Beta' },
    { label: 'θ', formula: '$\\theta$', tip: 'Theta' },
    { label: '∑', formula: '$\\sum_{i=1}^{n}$', tip: 'Sigma Penjumlahan' },
    { label: '∫', formula: '$\\int f(x) dx$', tip: 'Integral' },
    { label: '°', formula: '$^{\\circ}$', tip: 'Derajat' },
    { label: 'x̄', formula: '$\\bar{x}$', tip: 'Rata-rata (Mean)' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 rounded-xl border border-slate-200/80 mb-2">
      <div className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-200/60 mr-1">
        <Sigma className="w-3.5 h-3.5 text-indigo-600" />
        <span>Rumus LaTeX:</span>
      </div>
      {formulaButtons.map((btn, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onInsertFormula?.(btn.formula)}
          title={btn.tip}
          className="px-2 py-1 text-xs font-semibold bg-white hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg border border-slate-300 shadow-sm transition active:scale-95"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

