import React from 'react';

/** Ficha de práctica con pauta para imprimir (o guardar como PDF). */
const PracticeSheetPrint: React.FC<{ title: string; childName: string; content: string; onClose: () => void }> = ({ title, childName, content, onClose }) => {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm overflow-y-auto p-4" role="dialog" data-testid="practice-sheet">
      <style>{`@media print { body * { visibility: hidden !important; } #print-sheet, #print-sheet * { visibility: visible !important; } #print-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; } .no-print { display: none !important; } }
      .pauta { height: 2.6rem; border-bottom: 1px solid #94a3b8; position: relative; }
      .pauta::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed #cbd5e1; }`}</style>
      <div className="max-w-2xl mx-auto">
        <div className="no-print flex justify-end gap-2 mb-3">
          <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-sm">🖨️ Imprimir o guardar PDF</button>
          <button onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-xl font-black text-sm">Cerrar</button>
        </div>
        <div id="print-sheet" className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">
          <div className="flex justify-between items-end border-b-2 border-slate-200 pb-3 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">EduAmigo · Ficha de práctica</p>
              <h2 className="text-2xl font-black">{title}</h2>
            </div>
            <p className="text-sm text-slate-500">Nombre: {childName} · Fecha: ____________</p>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="mb-4">
              <p className="text-2xl tracking-wide" style={{ fontFamily: '"Comic Sans MS", "Comic Neue", cursive' }}>{l}</p>
              <div className="pauta" /><div className="pauta" />
            </div>
          ))}
          <div className="pauta" /><div className="pauta" /><div className="pauta" />
        </div>
      </div>
    </div>
  );
};

export default PracticeSheetPrint;
