import React, { useState, useRef } from 'react';
import { Child, HistoryItem, ExamResult, AcademicGrade, DailyStudyReport } from '../types';

interface AcademicReportPDFProps {
  children: Child[];
  history: HistoryItem[];
  examHistory: ExamResult[];
  academicGrades: AcademicGrade[];
  dailyReports: DailyStudyReport[];
}

export const AcademicReportPDF: React.FC<AcademicReportPDFProps> = ({
  children,
  history,
  examHistory,
  academicGrades,
  dailyReports
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id || '');
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

  if (!selectedChild) {
    return (
      <div className="bg-white p-8 rounded-[2rem] text-center text-slate-400">
        No hay alumnos configurados.
      </div>
    );
  }

  // Filter items by time range
  const now = Date.now();
  const cutoff = period === 'week' ? now - 7 * 86400000 : period === 'month' ? now - 30 * 86400000 : 0;

  const childHistory = history.filter(h => h.childId === selectedChild.id && h.timestamp >= cutoff);
  const childExams = examHistory.filter(e => e.childId === selectedChild.id && e.timestamp >= cutoff);
  const childGrades = academicGrades.filter(g => g.childId === selectedChild.id);
  const childReports = dailyReports.filter(r => r.childId === selectedChild.id && r.timestamp >= cutoff);

  // Metrics
  const totalQueries = childHistory.length;
  const totalExams = childExams.length;
  const avgExamScore = totalExams > 0 
    ? (childExams.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 10, 0) / totalExams).toFixed(1)
    : 'N/A';

  // Math metrics
  const mathItems = childHistory.filter(h => h.subject === 'Matemáticas' || (h.answer && (h.answer as any).type === 'math_analysis'));
  const readingItems = childHistory.filter(h => h.subject === 'Lengua' || (h.answer && (h.answer as any).type === 'reading_session'));
  const englishItems = childHistory.filter(h => h.subject === 'Inglés' || (h.answer && ((h.answer as any).type === 'english_lesson' || (h.answer as any).type === 'english_speaking')));

  const handlePrint = () => {
    window.print();
  };

  const copyForTutor = () => {
    const text = `📊 INFORME DE SEGUIMIENTO EDUCATIVO - ${selectedChild.name.toUpperCase()} (${selectedChild.grade})
Fecha: ${new Date().toLocaleDateString('es-ES')}
Periodo: ${period === 'week' ? 'Últimos 7 días' : period === 'month' ? 'Últimos 30 días' : 'Curso completo'}

1. RESUMEN ACADÉMICO:
- Puntuación media en exámenes y controles: ${avgExamScore} / 10
- Sesiones de estudio registradas: ${childReports.length}
- Consultas y dudas resueltas con IA: ${totalQueries}
- Racha de constancia diaria: ${selectedChild.streak?.current || 0} días

2. PROGRESO POR ÁREAS:
- Matemáticas: ${mathItems.length} ejercicios/retos practicados.
- Lectura y Lengua: ${readingItems.length} textos analizados.
- Inglés: ${englishItems.length} sesiones de Speaking y comprensión.

3. OBSERVACIONES:
El alumno muestra gran motivación y constancia mediante el sistema de retos y estudio activo EduAmigo J21.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Controls Bar - Hidden when printing */}
      <div className="print:hidden bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400">Alumno:</label>
          <div className="flex gap-2">
            {children.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedChildId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  selectedChild.id === c.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.avatar} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400">Periodo:</label>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${period === 'week' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              7 Días
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${period === 'month' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              30 Días
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${period === 'all' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              Todo
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyForTutor}
            className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5"
          >
            <span>{copied ? '✅ ¡Copiado!' : '📋 Copiar Resumen'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all flex items-center gap-1.5"
          >
            <span>🖨️ Guardar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document (A4 Styling) */}
      <div 
        ref={printRef}
        className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full space-y-8 text-slate-800"
      >
        {/* Document Header */}
        <div className="border-b-2 border-blue-600 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎓</span>
              <h1 className="text-2xl font-black text-blue-900 tracking-tight">EduAmigo J21</h1>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Informe Oficial de Rendimiento Académico
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-500 block">Fecha de Emisión:</span>
            <span className="text-sm font-black text-slate-700">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Student Profile Overview */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Alumno / Alumna</span>
            <span className="text-base font-black text-blue-900 flex items-center gap-1 mt-0.5">
              {selectedChild.avatar} {selectedChild.name}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Curso Académico</span>
            <span className="text-base font-bold text-slate-800 block mt-0.5">{selectedChild.grade}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Racha de Constancia</span>
            <span className="text-base font-black text-amber-600 block mt-0.5">🔥 {selectedChild.streak?.current || 0} Días Activo</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block">Periodo Evaluado</span>
            <span className="text-sm font-bold text-slate-700 block mt-0.5">
              {period === 'week' ? 'Última semana' : period === 'month' ? 'Último mes' : 'Curso completo'}
            </span>
          </div>
        </div>

        {/* Executive Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 text-center">
            <span className="text-xs font-bold text-blue-600 block mb-1">Media en Exámenes y Tests</span>
            <span className="text-3xl font-black text-blue-900">{avgExamScore} <span className="text-sm text-slate-400">/ 10</span></span>
            <span className="text-[10px] text-slate-500 block mt-1">{totalExams} pruebas realizadas</span>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
            <span className="text-xs font-bold text-emerald-600 block mb-1">Dudas y Consultas con IA</span>
            <span className="text-3xl font-black text-emerald-900">{totalQueries}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Interacciones de aprendizaje</span>
          </div>

          <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
            <span className="text-xs font-bold text-purple-600 block mb-1">Puntos de Motivación</span>
            <span className="text-3xl font-black text-purple-900">⭐ {selectedChild.points}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Acumulados por esfuerzo</span>
          </div>
        </div>

        {/* Detailed Breakdown by Subject */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
            Desglose Pedagógico por Competencias
          </h3>

          <div className="space-y-3">
            {/* Math */}
            <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  🔢 Competencia Matemática y Lógica
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {mathItems.length} actividades
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Práctica en cálculo mental contra reloj, resolución en pizarra digital y detección asistida de errores paso a paso.
              </p>
            </div>

            {/* Language & Reading */}
            <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  📖 Comprensión Lectora y Expresión
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {readingItems.length} actividades
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lecturas cronometradas con seguimiento de velocidad (palabras por minuto), fluidez oral y cuestionarios de comprensión.
              </p>
            </div>

            {/* English Academy */}
            <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  🇬🇧 Lengua Inglesa (Speaking & Listening)
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {englishItems.length} actividades
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Entrenamiento con audio nativo y reconocimiento de voz en tiempo real para perfeccionar pronunciación y vocabulario.
              </p>
            </div>
          </div>
        </div>

        {/* Official Grades from School (if registered) */}
        {childGrades.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
              Calificaciones Escolares Registradas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {childGrades.map(g => (
                <div key={g.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block">{g.subject}</span>
                  <span className="text-lg font-black text-slate-800">{g.value}</span>
                  <span className="text-[10px] text-slate-500 block">{g.term}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pedagogical Conclusions & Signatures */}
        <div className="pt-6 border-t border-slate-200 space-y-8">
          <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-1">
              💡 Recomendación Pedagógica del Tutor IA:
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Se recomienda continuar reforzando las sesiones de lectura diaria de 10 minutos y mantener la racha de estudio para afianzar los hábitos de concentración y autonomía personal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-slate-400">
            <div className="border-t border-dashed border-slate-300 pt-3">
              Firma del Tutor / Padres
            </div>
            <div className="border-t border-dashed border-slate-300 pt-3">
              Sello del Sistema EduAmigo J21
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicReportPDF;
