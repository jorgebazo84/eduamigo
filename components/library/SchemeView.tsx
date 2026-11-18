import React from 'react';
import type { Scheme } from '../../services/libraryService';

const COLORS = [
  { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a' },
  { bg: '#ecfdf5', border: '#10b981', text: '#064e3b' },
  { bg: '#fff7ed', border: '#f97316', text: '#7c2d12' },
  { bg: '#f5f3ff', border: '#8b5cf6', text: '#3b0764' },
  { bg: '#fdf2f8', border: '#ec4899', text: '#831843' },
  { bg: '#fefce8', border: '#eab308', text: '#713f12' },
];

/** Esquema visual del tema: idea central y ramas con sus puntos. Se imprime en una hoja A4 apaisada. */
export const SchemeView: React.FC<{ scheme: Scheme; subject: string; grade: string; onClose: () => void }> = ({ scheme, subject, grade, onClose }) => {
  const n = scheme.branches.length;
  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm overflow-y-auto p-4" role="dialog" data-testid="scheme">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body * { visibility: hidden !important; } #print-scheme, #print-scheme * { visibility: visible !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } #print-scheme { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; } .no-print { display: none !important; } }`}</style>
      <div className="max-w-5xl mx-auto">
        <div className="no-print flex justify-end gap-2 mb-3">
          <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-sm" data-testid="print-scheme">🖨️ Imprimir o guardar PDF</button>
          <button onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-xl font-black text-sm">Cerrar</button>
        </div>
        <div id="print-scheme" className="bg-white rounded-3xl p-8 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">EduAmigo · {subject} · {grade}</p>
          {/* Idea central */}
          <div className="flex justify-center mt-3">
            <div className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-2xl font-black text-center shadow-lg" data-testid="scheme-central">{scheme.central}</div>
          </div>
          {/* Conectores */}
          <svg className="w-full h-10" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true">
            {scheme.branches.map((_, i) => {
              const x = ((i + 0.5) / n) * 1000;
              return <path key={i} d={`M500 0 C500 25, ${x} 15, ${x} 40`} stroke={COLORS[i % COLORS.length].border} strokeWidth="3" fill="none" />;
            })}
          </svg>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {scheme.branches.map((b, i) => {
              const c = COLORS[i % COLORS.length];
              return (
                <div key={i} className="rounded-2xl p-3 border-2" style={{ background: c.bg, borderColor: c.border }} data-testid="scheme-branch">
                  <p className="font-black text-center mb-2" style={{ color: c.text }}>{b.title}</p>
                  <ul className="space-y-1.5">
                    {b.points.map((p, j) => (
                      <li key={j} className="text-[13px] leading-snug text-slate-800 bg-white/80 rounded-lg px-2 py-1.5 border" style={{ borderColor: `${c.border}55` }}>{p}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-400 text-center mt-4">Resumen del tema hecho con la explicación de EduAmigo. Compruébalo con tu libro de texto.</p>
        </div>
      </div>
    </div>
  );
};

export default SchemeView;
