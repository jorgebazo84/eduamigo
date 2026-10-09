import React from 'react';
import { ScannedHomeworkRecord } from '../../types/worksheets';

interface RemedialGuidePrintViewProps {
  homeworkRecord: ScannedHomeworkRecord;
  onBack: () => void;
  onOpenReinforcementWorksheet?: () => void;
}

export const RemedialGuidePrintView: React.FC<RemedialGuidePrintViewProps> = ({
  homeworkRecord,
  onBack,
  onOpenReinforcementWorksheet,
}) => {
  const { remedialGuide } = homeworkRecord;

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
            ← Volver al Historial
          </button>
          <div>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Doc. Explicativo: {homeworkRecord.id}
            </span>
            <span className="ml-2 text-xs font-bold text-slate-500">
              Guía A4 de aclaración de dudas para el alumno y la familia
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenReinforcementWorksheet && (
            <button
              onClick={onOpenReinforcementWorksheet}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl border border-emerald-300 shadow-xs transition-all flex items-center gap-2"
            >
              <span>📑 Ir a la Ficha de Refuerzo A4</span>
              <span>→</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            🖨️ Imprimir Guía Explicativa (A4)
          </button>
        </div>
      </div>

      {/* Página física para imprimir (Estilo Documento Escolar A4) */}
      <div className="print-page bg-white mx-auto max-w-4xl p-8 sm:p-12 rounded-3xl shadow-xl border-2 border-slate-200 text-slate-900 font-sans print:border-none print:shadow-none print:p-4 print:max-w-none print:rounded-none space-y-6">
        {/* Cabecera Oficial */}
        <header className="border-b-2 border-slate-900 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-indigo-900 uppercase">
                  EduAmigo J21
                </span>
                <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                  GUÍA EXPLICATIVA Y REPASO ADAPTADO
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Ref: {homeworkRecord.id}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                {remedialGuide.title || `Explicación de Refuerzo: ${homeworkRecord.topic}`}
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                Materia: <strong className="text-indigo-800">{homeworkRecord.subject}</strong> • Tema: <strong className="text-slate-800">{homeworkRecord.topic}</strong>
                {homeworkRecord.bookTitle && ` • ${homeworkRecord.bookTitle}`}
              </p>
            </div>

            {/* Calificación y XP en la tarea de clase */}
            <div className="flex flex-col items-end bg-indigo-50 p-3 rounded-2xl border border-indigo-200 text-right">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                Revisión de Deberes
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-indigo-900">
                  {homeworkRecord.score.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-indigo-600">/ 10</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 mt-0.5">
                {homeworkRecord.correctExercises} de {homeworkRecord.totalExercises} actividades correctas
              </span>
            </div>
          </div>

          {/* DATOS DEL ALUMNO Y CURSO */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs font-bold print:bg-white print:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Alumno/a:</span>
              <span className="text-slate-900 font-black text-sm">
                {homeworkRecord.childName}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Fecha:</span>
              <span className="text-slate-900 font-black text-sm">
                {homeworkRecord.date}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:justify-end">
              <span className="text-slate-500 uppercase text-[10px] tracking-wider">Curso:</span>
              <span className="text-indigo-900 font-black text-sm">
                {homeworkRecord.grade}
              </span>
            </div>
          </div>
        </header>

        {/* 1. Diagnóstico pedagógico principal: Lo que no está entendiendo el niño */}
        <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200 space-y-2 print:bg-amber-50/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h2 className="text-sm font-black text-amber-900 uppercase tracking-wide">
              Punto Clave a Comprender (Diagnóstico del Profesor)
            </h2>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-semibold">
            {homeworkRecord.whatChildIsMissing}
          </p>
          <p className="text-[11px] text-slate-600 pt-1 border-t border-amber-200/80">
            <strong>Observación para la familia:</strong> {homeworkRecord.summaryDiagnosis}
          </p>
        </div>

        {/* 2. Explicación general adaptada a su curso */}
        <div className="space-y-2">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📖</span>
            <span>Explicación adaptada para {homeworkRecord.grade}:</span>
          </h2>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
            {remedialGuide.gradeAdaptedSummary}
          </div>
        </div>

        {/* 3. Conceptos clave con ejemplos resueltos paso a paso */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>💡</span>
            <span>Conceptos clave explicados paso a paso:</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {remedialGuide.coreConcepts.map((conceptItem, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className="text-xs font-black text-indigo-900">
                      {conceptItem.concept}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {conceptItem.explanation}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-indigo-50 mt-2">
                  <div className="p-2.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-[11px] font-mono text-indigo-950">
                    <span className="font-sans font-bold text-[10px] text-indigo-600 uppercase block mb-0.5">
                      ✏️ Ejemplo paso a paso:
                    </span>
                    {conceptItem.stepByStepExample}
                  </div>
                  {conceptItem.memoryTip && (
                    <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-start gap-1">
                      <span>🌟</span>
                      <span><strong>Truco para recordar:</strong> {conceptItem.memoryTip}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Tabla comparativa: El error que cometiste vs. La forma correcta */}
        {remedialGuide.mistakesAnalysis && remedialGuide.mistakesAnalysis.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Aprender de los errores: ¿Dónde estuvo la dificultad?</span>
            </h2>
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-black uppercase">
                    <th className="p-3 w-1/3">¿Qué ocurrió en la tarea?</th>
                    <th className="p-3 w-1/3">¿Por qué suele pasar?</th>
                    <th className="p-3 w-1/3 text-emerald-800">¿Cómo resolverlo correctamente?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {remedialGuide.mistakesAnalysis.map((m, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-3 text-red-900 font-semibold align-top">
                        ❌ {m.errorIdentified}
                      </td>
                      <td className="p-3 text-slate-600 align-top">
                        {m.whyItHappens}
                      </td>
                      <td className="p-3 text-emerald-900 font-bold bg-emerald-50/40 align-top">
                        ✅ {m.howToAvoidIt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Mensaje de motivación y llamada a la acción */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
              Mensaje del Tutor Pedagógico
            </span>
            <p className="text-xs text-indigo-950 font-bold leading-relaxed">
              {remedialGuide.congratulationAndAdvice}
            </p>
          </div>
          {onOpenReinforcementWorksheet && (
            <button
              onClick={onOpenReinforcementWorksheet}
              className="no-print px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md whitespace-nowrap transition-all flex items-center gap-1.5"
            >
              <span>📑 Practicar con la Ficha de Refuerzo A4</span>
              <span>→</span>
            </button>
          )}
        </div>

        {/* Pie de página oficial */}
        <footer className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <span>EduAmigo J21 • Tutoría LOMLOE Inteligente</span>
          <span>Imprime este documento para repasar en casa con lápiz y papel</span>
        </footer>
      </div>
    </div>
  );
};

export default RemedialGuidePrintView;
