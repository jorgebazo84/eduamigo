import React from 'react';
import { PrintableWorksheet } from '../../types/worksheets';

interface PrintableWorksheetViewProps {
  worksheet: PrintableWorksheet;
  onBack: () => void;
  onOpenScanner?: (worksheet: PrintableWorksheet) => void;
}

export const PrintableWorksheetView: React.FC<PrintableWorksheetViewProps> = ({
  worksheet,
  onBack,
  onOpenScanner,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Barra de herramientas superior (oculta al imprimir) */}
      <div className="no-print bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            ← Volver a Fichas
          </button>
          <div>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              ID: {worksheet.id}
            </span>
            <span className="ml-2 text-xs font-bold text-slate-500">
              Formato A4 optimizado para escritura a mano
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            🖨️ Imprimir Ficha (A4)
          </button>
          <button
            onClick={() => onOpenScanner(worksheet)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            📸 Corregir con Foto IA
          </button>
        </div>
      </div>

      {/* Hoja física para imprimir (Estilo papel escolar A4) */}
      <div className="print-page bg-white mx-auto max-w-4xl p-8 sm:p-12 rounded-3xl shadow-xl border-2 border-slate-200 text-slate-900 font-sans print:border-none print:shadow-none print:p-4 print:max-w-none print:rounded-none">
        {/* Cabecera oficial obligatoria con Alumno y Fecha visibles */}
        <header className="border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-blue-900 uppercase">
                  EduAmigo J21
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  worksheet.originType === 'homework_reinforcement'
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {worksheet.originType === 'homework_reinforcement'
                    ? '🎯 FICHA DE REFUERZO PERSONALIZADA'
                    : 'FICHA DE REPASO CURRICULAR'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                {worksheet.subject}: {worksheet.topic}
              </h1>
              {worksheet.subtitle && (
                <p className="text-xs font-semibold text-slate-600">
                  {worksheet.subtitle} • {worksheet.bookTitle}
                </p>
              )}
            </div>

            {/* Código QR y Código de Identificación de Ficha */}
            <div className="flex flex-col items-center bg-slate-50 p-2.5 rounded-xl border border-slate-300 text-center">
              {worksheet.qrCodeDataUrl ? (
                <img
                  src={worksheet.qrCodeDataUrl}
                  alt="QR Ficha"
                  className="w-20 h-20 object-contain"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  QR CODE
                </div>
              )}
              <span className="text-[10px] font-mono font-black text-slate-800 mt-1">
                {worksheet.id}
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                Escanear para corregir
              </span>
            </div>
          </div>

          {/* DATOS VISUALES DEL ALUMNO Y FECHA (CRÍTICO) */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs font-bold print:bg-white print:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Alumno/a:</span>
              <span className="text-slate-900 font-black text-sm underline decoration-slate-400 decoration-2 underline-offset-4">
                {worksheet.childName || '__________________________'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Fecha:</span>
              <span className="text-slate-900 font-black text-sm">
                {worksheet.date || new Date().toLocaleDateString('es-ES')}
              </span>
            </div>

            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Curso:</span>
              <span className="text-blue-900 font-black text-sm">
                {worksheet.grade}
              </span>
            </div>
          </div>
        </header>

        {/* Instrucciones pedagógicas breves para el alumno */}
        <div className="mb-6 flex items-start gap-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 print:bg-transparent print:border-slate-400 print:text-slate-800">
          <span className="text-base">✏️</span>
          <div>
            <p className="font-black">Instrucciones para el estudiante:</p>
            <p className="text-[11px] leading-relaxed">
              {worksheet.formatType === 'open_questions_ruled' || !worksheet.subject.toLowerCase().includes('matem') ? (
                'Lee con atención cada enunciado y responde a mano con letra clara y cuidada en los renglones pautados. Cuidas las mayúsculas y la ortografía.'
              ) : (
                <>
                  Realiza las operaciones a lápiz en el espacio de cuadrícula indicado abajo.
                  {worksheet.pedagogicalPreferences?.subtractionsMethod === 'written_subtraction' 
                    ? ' Escribe las restas paso a paso hacia abajo y baja cada cifra del dividendo con cuidado y orden.' 
                    : ' Calcula los pasos y anota el cociente y resto final en cada recuadro.'}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Texto de lectura o contexto (si existe, para Lengua, Ciencias, Inglés) */}
        {worksheet.readingContext && (
          <div className="mb-6 p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/40 print:bg-white print:border-slate-800 text-slate-800">
            <div className="flex items-center gap-2 font-black text-blue-900 print:text-black uppercase text-[11px] tracking-wider mb-2">
              <span>📖</span>
              <span>Texto de Lectura y Comprensión</span>
            </div>
            <p className="text-xs leading-relaxed font-serif text-slate-900 whitespace-pre-line">
              {worksheet.readingContext}
            </p>
          </div>
        )}

        {/* Grid de Ejercicios: Cuadrícula para Mates o Renglones Pautados para Cualquier Otra Asignatura */}
        <div className={`grid ${worksheet.exercises.length <= 4 ? 'grid-cols-1 md:grid-cols-2 gap-8' : 'grid-cols-1 md:grid-cols-2 gap-6'}`}>
          {worksheet.exercises.map((exercise) => {
            const isRuledText = exercise.exerciseType === 'ruled_text' || worksheet.formatType === 'open_questions_ruled';
            // Limpieza estricta de puntos de miles en enunciados matemáticos (ej: "8496 ÷ 4" en lugar de "8.496 ÷ 4")
            const cleanPrompt = exercise.prompt.replace(/(\d)\.(\d{3})/g, '$1$2');
            const cleanDividend = exercise.dividend ? String(exercise.dividend).replace(/\./g, '') : '';

            return (
              <div
                key={exercise.index}
                className="border-2 border-slate-300 rounded-2xl p-4 bg-white flex flex-col justify-between print:border-slate-800 print:rounded-lg"
                style={{ minHeight: isRuledText ? '260px' : '340px' }}
              >
                {/* Encabezado del Ejercicio */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-2 mb-3 gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex-shrink-0 flex items-center justify-center print:border print:border-black mt-0.5">
                      {exercise.index}
                    </span>
                    <div className="flex-1">
                      <p className={`text-slate-900 ${isRuledText ? 'text-xs sm:text-sm font-black leading-snug' : 'text-lg sm:text-xl font-black tracking-wider font-mono'}`}>
                        {cleanPrompt}
                      </p>
                      {exercise.subprompt && (
                        <p className="text-[11px] font-medium text-slate-500 mt-1 italic">
                          {exercise.subprompt}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                    Actividad #{exercise.index}
                  </span>
                </div>

                {/* Zona de Trabajo del Alumno */}
                {isRuledText ? (
                  /* Renglones Pautados Escolares para Lengua, Ciencias, Inglés, etc. */
                  <div className="flex-1 flex flex-col justify-around py-3 px-1">
                    {Array.from({ length: exercise.linesCount || 4 }).map((_, lineIdx) => (
                      <div key={lineIdx} className="relative py-3.5 border-b-2 border-slate-300 print:border-slate-800">
                        {/* Línea punteada de ayuda caligráfica (estilo Montessori / pauta escolar) */}
                        <div className="absolute top-1.5 inset-x-0 border-b border-dashed border-blue-100 print:border-slate-200 pointer-events-none" />
                      </div>
                    ))}
                    <div className="text-right pt-2">
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none">
                        Respuesta manuscrita a lápiz
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Zona de Cuadrícula de 5 mm para Operaciones Matemáticas */
                  <>
                    <div className="relative flex-1 rounded-lg border border-slate-300 overflow-hidden bg-white mb-3" style={{ minHeight: '220px' }}>
                      {/* Cuadrícula sutil de fondo */}
                      <div
                        className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                          backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                        }}
                      />

                      {/* Guía de colocación limpia SIN puntos separadores de miles */}
                      <div className="relative p-2 text-slate-400 text-[11px] font-mono select-none">
                        <div className="inline-flex items-center text-slate-600 font-bold text-base tracking-widest pl-1 pt-1">
                          <span>{cleanDividend || 'Dividendo'}</span>
                          <span className="border-l-2 border-b-2 border-slate-800 px-3 py-0.5 ml-2 font-black text-slate-900 text-sm">
                            {exercise.divisor || 'Divisor'}
                          </span>
                        </div>
                      </div>

                      {/* Marca de agua tenue */}
                      <div className="absolute bottom-2 right-2 text-[9px] font-bold text-slate-300 uppercase tracking-widest pointer-events-none">
                        Espacio para restas y bajadas de cifras
                      </div>
                    </div>

                    {/* Casilla final de Cociente y Resto */}
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                      <div className="border border-slate-300 rounded p-1.5 bg-slate-50 print:bg-white">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Cociente:</span>
                        <div className="h-5"></div>
                      </div>
                      <div className="border border-slate-300 rounded p-1.5 bg-slate-50 print:bg-white">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Resto:</span>
                        <div className="h-5"></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Pie de página con verificación y firma */}
        <footer className="mt-8 pt-4 border-t border-slate-300 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            <span>Ficha generada por <strong>EduAmigo Tutor Inteligente</strong></span>
            <span className="mx-2">•</span>
            <span>Estándar curricular LOMLOE</span>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span>Firma del Tutor/Familia: ____________________</span>
            </div>
            <div>
              <span>Puntuación: ____ / 10</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Reglas CSS para impresión limpia en A4 */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};
