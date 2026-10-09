import React, { useState, useEffect } from 'react';
import { Child } from '../../types';
import { Book } from '../../types/study';
import { PrintableWorksheet, WorksheetInquiryQuestion } from '../../types/worksheets';
import { worksheetService } from '../../services/worksheetService';

interface WorksheetWizardProps {
  childrenList: Child[];
  books: Book[];
  onWorksheetGenerated: (worksheet: PrintableWorksheet) => void;
  onCancel: () => void;
}

const SUBJECT_PRESETS = [
  {
    id: 'Matemáticas',
    name: 'Matemáticas',
    shortName: 'Mates',
    icon: '🔢',
    badge: 'Cuadrícula 5mm',
    color: 'border-blue-500 bg-blue-50 text-blue-900',
    defaultPrompt: 'Quiero que repase divisiones con resto cero de una cifra y cuadrícula amplia para operar a lápiz',
  },
  {
    id: 'Lengua Castellana y Literatura',
    name: 'Lengua Castellana',
    shortName: 'Lengua',
    icon: '📖',
    badge: 'Renglones dobles',
    color: 'border-amber-500 bg-amber-50 text-amber-900',
    defaultPrompt: 'Comprensión lectora con texto breve adaptado, preguntas a mano en renglones y repaso gramatical',
  },
  {
    id: 'Ciencias de la Naturaleza',
    name: 'C. de la Naturaleza',
    shortName: 'C. Naturaleza',
    icon: '🌿',
    badge: 'Pauta escolar',
    color: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    defaultPrompt: 'Conceptos clave de la unidad actual con preguntas de desarrollo para escribir a lápiz',
  },
  {
    id: 'Ciencias Sociales',
    name: 'Ciencias Sociales',
    shortName: 'C. Sociales',
    icon: '🌍',
    badge: 'Pauta escolar',
    color: 'border-purple-500 bg-purple-50 text-purple-900',
    defaultPrompt: 'Preguntas explicativas sobre geografía o historia para responder en renglones pautados',
  },
  {
    id: 'Inglés',
    name: 'Inglés (English)',
    shortName: 'English',
    icon: '🇬🇧',
    badge: 'Reading & Writing',
    color: 'border-rose-500 bg-rose-50 text-rose-900',
    defaultPrompt: 'Reading comprehension with short text, written questions in English and vocabulary practice',
  },
];

export const WorksheetWizard: React.FC<WorksheetWizardProps> = ({
  childrenList,
  books,
  onWorksheetGenerated,
  onCancel,
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(childrenList[0]?.id || '');
  const selectedChild = childrenList.find(c => c.id === selectedChildId) || childrenList[0];

  const [subject, setSubject] = useState<string>('Matemáticas');
  const [userPrompt, setUserPrompt] = useState<string>('Quiero que repase divisiones con resto cero de una cifra y cuadrícula amplia para operar a lápiz');
  const [selectedBookTitle, setSelectedBookTitle] = useState<string>('');
  
  // Preguntas clave
  const [questions, setQuestions] = useState<WorksheetInquiryQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar libros que coincidan con la materia o el alumno
  const matchingBooks = books.filter(b => {
    const childMatch = !selectedChild || b.childId === selectedChild.id;
    const subLower = subject.toLowerCase();
    const bookSubLower = (b.subject || '').toLowerCase();
    const subjectMatch = bookSubLower.includes(subLower.slice(0, 4)) || subLower.includes(bookSubLower.slice(0, 4));
    return childMatch && subjectMatch;
  });

  useEffect(() => {
    if (matchingBooks.length > 0) {
      setSelectedBookTitle(matchingBooks[0].title + (matchingBooks[0].publisher ? ` (${matchingBooks[0].publisher})` : ''));
    } else {
      setSelectedBookTitle(`${subject} ${selectedChild?.grade || '6º Primaria'} - Proyecto Editorial Oficial`);
    }
  }, [subject, selectedChild, books]);

  // Manejar cambio de asignatura con prompts predefinidos y reseteo limpio de respuestas
  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    const preset = SUBJECT_PRESETS.find(p => p.id === newSubject || p.name === newSubject);
    const newPrompt = preset ? preset.defaultPrompt : `Repaso general de la unidad actual de ${newSubject}`;
    setUserPrompt(newPrompt);

    if (selectedChild) {
      const qs = worksheetService.getPedagogicalQuestions(
        selectedChild.grade,
        newSubject,
        newPrompt,
        selectedBookTitle
      );
      setQuestions(qs);

      // Asignar respuestas recomendadas limpias sin mezclar con las del asunto anterior
      const cleanDefaults: Record<string, string> = {};
      qs.forEach(q => {
        const rec = q.options.find(o => o.isRecommended) || q.options[0];
        if (rec) {
          cleanDefaults[q.id] = rec.value;
        }
      });
      setAnswers(cleanDefaults);
    }
  };

  // Actualizar las preguntas pedagógicas cuando cambia el prompt o el curso
  useEffect(() => {
    if (selectedChild) {
      const qs = worksheetService.getPedagogicalQuestions(
        selectedChild.grade,
        subject,
        userPrompt,
        selectedBookTitle
      );
      setQuestions(qs);

      // Pre-rellenar respuestas recomendadas respetando únicamente las que coincidan con el nuevo listado de preguntas
      const cleanDefaults: Record<string, string> = {};
      qs.forEach(q => {
        const rec = q.options.find(o => o.isRecommended) || q.options[0];
        if (rec) {
          cleanDefaults[q.id] = rec.value;
        }
      });

      setAnswers(prev => {
        const updated = { ...cleanDefaults };
        Object.keys(prev).forEach(key => {
          const matchingQuestion = qs.find(q => q.id === key);
          if (matchingQuestion && matchingQuestion.options.some(o => o.value === prev[key])) {
            updated[key] = prev[key];
          }
        });
        return updated;
      });
    }
  }, [selectedChild, subject, userPrompt, selectedBookTitle]);

  const handleGenerate = async () => {
    if (!selectedChild) {
      setError('Por favor selecciona un alumno.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const count = parseInt(answers.exercisesCount || '4', 10);
      const isMath = subject.toLowerCase().includes('matem');
      const divisionsType = isMath ? (answers.divisionsType || 'remainder_zero_single_digit') as any : undefined;
      const subtractionsMethod = isMath ? (answers.subtractionsMethod || 'written_subtraction') as any : undefined;
      const includeZeroInQuotient = isMath ? (answers.includeZeroInQuotient === 'yes') : undefined;
      const activityType = answers.activityType;

      const dynamicTopic = userPrompt.trim()
        ? (userPrompt.length > 50 ? userPrompt.slice(0, 50) + '...' : userPrompt)
        : (isMath ? 'Divisiones con resta y espacio ergonómico' : `Repaso curricular de ${subject}`);

      const worksheet = await worksheetService.generateWorksheet({
        childId: selectedChild.id,
        childName: selectedChild.name,
        grade: selectedChild.grade,
        subject: subject,
        bookTitle: selectedBookTitle || 'Libro Escolar de Referencia',
        topic: dynamicTopic,
        divisionsType,
        subtractionsMethod,
        includeZeroInQuotient,
        exercisesCount: count,
        activityType,
        parentNotes: userPrompt,
      });

      onWorksheetGenerated(worksheet);
    } catch (err: any) {
      console.error('Error generating worksheet:', err);
      setError(err.message || 'Error al generar la ficha. Por favor revisa la conexión e inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-blue-100 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Encabezado del Asistente */}
      <div className="border-b border-slate-100 pb-5 flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-xl mb-2">
            <span>✨ Asistente de Fichas Escritas</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Crear Hoja de Repaso Imprimible
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Diseñada con espacio real de cuadrícula para que los niños operen a lápiz, con código QR para corrección automática con IA.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 text-lg font-black p-2"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
          ⚠️ {error}
        </div>
      )}

      {/* Paso 1: Configuración del Alumno, Asignatura y Libro Escolar */}
      <div className="space-y-5 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
            <span>1️⃣ Alumno, Asignatura y Cuaderno</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
            Curso: {selectedChild?.grade || 'Primaria'}
          </span>
        </div>

        {/* Selector de Alumno */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Hijo / Alumno destinatario de la ficha:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {childrenList.map((c) => {
              const isChildSelected = c.id === selectedChildId;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isChildSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-black shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-bold'
                  }`}
                >
                  <span className="text-lg">{c.avatar || '👦'}</span>
                  <div className="min-w-0">
                    <p className="text-xs truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-normal">{c.grade}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector Visual de Asignatura */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
            <span>Selecciona la Asignatura:</span>
            <span className="text-[11px] text-blue-600 font-semibold">
              {subject.includes('Matem') ? '📐 Formato Cuadrícula Matemática' : '📝 Formato Pauta con Renglones'}
            </span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {SUBJECT_PRESETS.map((preset) => {
              const isSelected = subject === preset.id || subject === preset.name;
              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => handleSubjectChange(preset.id)}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-white ring-2 ring-blue-500/30 shadow-md transform -translate-y-0.5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <span className="text-2xl mb-1">{preset.icon}</span>
                  <span className={`text-xs font-black leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                    {preset.shortName}
                  </span>
                  <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {preset.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Libro registrado o manual */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Libro de Texto Escolar Registrado:</span>
            <span className="text-[10px] text-blue-600 font-normal">Aparecerá impreso en la cabecera A4</span>
          </label>
          <input
            type="text"
            value={selectedBookTitle}
            onChange={(e) => setSelectedBookTitle(e.target.value)}
            placeholder="Ej: Matemáticas 6º Primaria - Ed. Santillana Proyecto Saber Hacer"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Petición del Padre */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            ¿Qué necesitas que repase tu hijo en esta ficha?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Ej: Quiero que repase divisiones con resto cero de una cifra o preguntas clave del tema"
              className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Paso 2: Preguntas Clave Pedagógicas de la IA */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
            2
          </span>
          <h3 className="text-base font-black text-slate-900">
            Preguntas Clave del Tutor IA (Ajustes Pedagógicos y Espacio Físico)
          </h3>
        </div>

        <p className="text-xs text-slate-500 -mt-3">
          La IA adapta la dificultad según los libros habituales de {selectedChild?.grade || 'Primaria'} y asegura que haya espacio de sobra en papel para escribir restas y bajar números.
        </p>

        <div className="space-y-5">
          {questions.map((q) => (
            <div key={q.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div>
                <p className="text-xs font-black text-slate-800">{q.question}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">{q.pedagogicalContext}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-black ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {opt.label}
                        </span>
                        {opt.isRecommended && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-black transition-all"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="px-7 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generando Ficha y Código QR...</span>
            </>
          ) : (
            <>
              <span>📄 Generar Ficha Imprimible con IA</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
