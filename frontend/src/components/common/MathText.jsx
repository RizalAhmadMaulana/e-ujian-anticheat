import React from 'react';
import katex from 'katex';

/**
 * Komponen Renderer Teks & Rumus Matematika (LaTeX / KaTeX)
 * Mendeteksi secara cerdas rumus $...$ (inline) atau $$...$$ (display block)
 * dan menampilkannya dengan format tipografi matematika resmi.
 */
export default function MathText({ text, className = '' }) {
  if (!text || typeof text !== 'string') {
    return <span className={className}>{text || ''}</span>;
  }

  // Jika tidak ada tanda $ atau simbol LaTeX, render teks biasa
  if (!text.includes('$') && !text.includes('\\(') && !text.includes('\\[')) {
    return <span className={className}>{text}</span>;
  }

  // Helper render formula
  const renderFormula = (formula, displayMode = false) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return formula;
    }
  };

  // Tokenize regex untuk memisahkan teks biasa dan rumus matematika
  // 1. $$...$$ (Display Block)
  // 2. $...$ (Inline)
  const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
  const parts = text.split(regex);

  return (
    <span className={`math-text-container ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2);
          const html = renderFormula(formula, true);
          return (
            <span
              key={index}
              className="block my-2 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1);
          const html = renderFormula(formula, false);
          return (
            <span
              key={index}
              className="inline-block px-1 align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

