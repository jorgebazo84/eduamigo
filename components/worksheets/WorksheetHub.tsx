import React, { useState, useEffect } from 'react';
import { Child } from '../../types';
import { Book } from '../../types/study';
import { PrintableWorksheet, WorksheetCorrection, ScannedHomeworkRecord } from '../../types/worksheets';
import { worksheetService } from '../../services/worksheetService';
import { WorksheetWizard } from './WorksheetWizard';
import { PrintableWorksheetView } from './PrintableWorksheetView';
import { WorksheetScannerModal } from './WorksheetScannerModal';
import { HomeworkScannerModal } from './HomeworkScannerModal';
import { RemedialGuidePrintView } from './RemedialGuidePrintView';

interface WorksheetHubProps {
  childrenList: Child[];
  books: Book[];
  userRole?: string;
  activeChildId?: string | null;
  isParentUnlocked?: boolean;
  onRequireParentPin?: () => void;
  onAwardPoints?: (childId: string, points: number) => void;
}

export const WorksheetHub: React.FC<WorksheetHubProps> = ({
  childrenList,
  books,
  userRole = 'parent',
  activeChildId,
  isParentUnlocked = false,
  onRequireParentPin,
  onAwardPoints,
}) => {
  const [activeTab, setActiveTab] = useState<'worksheets' | 'homework'>('worksheets');
  const [worksheets, setWorksheets] = useState<PrintableWorksheet[]>([]);
  const [homeworkRecords, setHomeworkRecords] = useState<ScannedHomeworkRecord[]>([]);

  const [selectedWorksheet, setSelectedWorksheet] = useState<PrintableWorksheet | null>(null);
  const [selectedHomework, setSelectedHomework] = useState<ScannedHomeworkRecord | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [scanningWorksheet, setScanningWorksheet] = useState<PrintableWorksheet | null>(null);
  const [filterChildId, setFilterChildId] = useState<string>('all');
  const [reviewingHomework, setReviewingHomework] = useState<ScannedHomeworkRecord | null>(null);
  const [tutorCommentInput, setTutorCommentInput] = useState('');
  const [tutorStickerInput, setTutorStickerInput] = useState('🌟');
  const [bonusPointsInput, setBonusPointsInput] = useState(15);

  // Determinar si el usuario navega como alumno o como padre
  const isStudent = userRole === 'student' || (!isParentUnlocked && userRole !== 'parent' && userRole !== 'demo');
  const studentChildId = activeChildId || childrenList[0]?.id;
  const currentStudent = childrenList.find((c) => c.id === studentChildId) || childrenList[0];

  const loadData = () => {
    setWorksheets(worksheetService.getWorksheets());
    setHomeworkRecords(worksheetService.getHomeworkRecords());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWorksheetGenerated = (ws: PrintableWorksheet) => {
    loadData();
    setIsWizardOpen(false);
    setSelectedWorksheet(ws);
  };

  const handleHomeworkComplete = (record: ScannedHomeworkRecord) => {
    loadData();
    setIsHomeworkModalOpen(false);
    setSelectedHomework(record);
  };

  const handleCorrectionComplete = (ws: PrintableWorksheet, correction: WorksheetCorrection) => {
    loadData();
    if (selectedWorksheet && selectedWorksheet.id === ws.id) {
      setSelectedWorksheet({ ...ws, status: 'corrected', correction });
    }
    if (onAwardPoints && ws.childId && correction.awardedXp) {
      onAwardPoints(ws.childId, correction.awardedXp);
    }
  };

  const handleDeleteWorksheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar esta ficha de repaso?')) {
      worksheetService.deleteWorksheet(id);
      loadData();
      if (selectedWorksheet?.id === id) {
        setSelectedWorksheet(null);
      }
    }
  };

  const handleDeleteHomework = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar este registro de deberes corregidos?')) {
      worksheetService.deleteHomeworkRecord(id);
      loadData();
      if (selectedHomework?.id === id) {
        setSelectedHomework(null);
      }
    }
  };

  const handleSaveTutorFeedback = () => {
    if (!reviewingHomework) return;
    worksheetService.saveTutorFeedback(reviewingHomework.id, {
      tutorComment: tutorCommentInput || '¡Excelente trabajo y dedicación en tus tareas!',
      tutorSticker: tutorStickerInput,
      bonusPoints: bonusPointsInput,
    });
    if (onAwardPoints && reviewingHomework.childId && bonusPointsInput > 0) {
      onAwardPoints(reviewingHomework.childId, bonusPointsInput);
    }
    loadData();
    setReviewingHomework(null);
    setTutorCommentInput('');
  };

  // Filtrado de fichas y deberes
  const displayedWorksheets = isStudent
    ? worksheets.filter((w) => w.childId === studentChildId || (!w.childId && childrenList.length <= 1))
    : (filterChildId === 'all' ? worksheets : worksheets.filter((w) => w.childId === filterChildId));

  const displayedHomework = isStudent
    ? homeworkRecords.filter((h) => h.childId === studentChildId || (!h.childId && childrenList.length <= 1))
    : (filterChildId === 'all' ? homeworkRecords : homeworkRecords.filter((h) => h.childId === filterChildId));

  // 1. Si está viendo una Ficha A4 en pantalla completa / impresión
  if (selectedWorksheet) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <PrintableWorksheetView
          worksheet={selectedWorksheet}
          onBack={() => setSelectedWorksheet(null)}
          onOpenScanner={(ws) => setScanningWorksheet(ws)}
        />

        {scanningWorksheet && (
          <WorksheetScannerModal
            worksheet={scanningWorksheet}
            onClose={() => setScanningWorksheet(null)}
            onCorrectionComplete={handleCorrectionComplete}
            onAwardPoints={(pts) => {
              if (onAwardPoints && scanningWorksheet.childId) {
                onAwardPoints(scanningWorksheet.childId, pts);
              }
            }}
          />
        )}
      </div>
    );
  }

  // 2. Si está viendo el Documento Explicativo A4 (Documento 1)
  if (selectedHomework) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <RemedialGuidePrintView
          homeworkRecord={selectedHomework}
          onBack={() => setSelectedHomework(null)}
          onOpenReinforcementWorksheet={() => {
            const linkedWs = worksheets.find((w) => w.id === selectedHomework.reinforcementWorksheetId);
            if (linkedWs) {
              setSelectedWorksheet(linkedWs);
              setSelectedHomework(null);
            } else {
              alert('Ficha de refuerzo no encontrada en el almacenamiento.');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Superior Principal con Acciones Rápidas */}
      <div
        className={`p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white ${
          isStudent
            ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900'
            : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900'
        }`}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black bg-white/10 backdrop-blur-xs">
            {isStudent ? (
              <span>🎒 Mis Fichas & Deberes • {currentStudent?.name || 'Alumno'}</span>
            ) : (
              <span>🖨️ Centro de Fichas A4 & Corrección Óptica con IA</span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isStudent
              ? `Taller de Estudio y Tareas de ${currentStudent?.name || 'Alumno'}`
              : 'Taller de Hojas A4 & Corrector de Deberes de Clase'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isStudent
              ? 'Imprime tus fichas para resolverlas con lápiz o haz una foto a tus deberes de clase para que la IA los revise, te explique las dudas y te dé puntos ⭐.'
              : 'Genera fichas A4 de cualquier asignatura (Matemáticas con cuadrícula, Lengua pautada, Ciencias) o fotografía los deberes del cuaderno/clase: la IA los corrige, emite una Guía Explicativa adaptada a su curso y genera una Ficha A4 con ejercicios de refuerzo.'}
          </p>
        </div>

        {/* Botones de acción principales */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Botón común: Corregir Deberes de Clase / Casa */}
          <button
            onClick={() => setIsHomeworkModalOpen(true)}
            className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>📸 Corregir Deberes de Clase / Cuaderno</span>
          </button>

          {/* Botón para crear nueva ficha (Padres) o desbloquear PIN */}
          {!isStudent ? (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-5 py-3.5 bg-blue-500 hover:bg-blue-400 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>✨ Nueva Ficha A4 a la IA</span>
              <span>→</span>
            </button>
          ) : onRequireParentPin ? (
            <button
              onClick={onRequireParentPin}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-emerald-200 font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Desbloquear panel de padres con PIN"
            >
              <span>🔑 ¿Eres padre? Desbloquear</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Selector de Pestañas: 1. Fichas A4 Imprimibles vs 2. Deberes de Clase & Refuerzo */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('worksheets')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'worksheets'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <span>📑</span>
          <span>Fichas A4 Imprimibles</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'worksheets' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {displayedWorksheets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'homework'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <span>📸</span>
          <span>Deberes de Clase Corregidos & Guías de Refuerzo</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'homework' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {displayedHomework.length}
          </span>
        </button>
      </div>

      {/* Modal / Wizard de Creación de Fichas (Padres) */}
      {!isStudent && isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="my-8 w-full">
            <WorksheetWizard
              childrenList={childrenList}
              books={books}
              onWorksheetGenerated={handleWorksheetGenerated}
              onCancel={() => setIsWizardOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal de Corrección de Deberes de Clase con IA */}
      {isHomeworkModalOpen && (
        <HomeworkScannerModal
          childrenList={childrenList}
          books={books}
          selectedChildId={studentChildId}
          isStudent={isStudent}
          onClose={() => setIsHomeworkModalOpen(false)}
          onCorrectionComplete={handleHomeworkComplete}
          onOpenRemedialGuide={(rec) => setSelectedHomework(rec)}
          onOpenReinforcementWorksheet={(wsId) => {
            const ws = worksheets.find((w) => w.id === wsId);
            if (ws) setSelectedWorksheet(ws);
          }}
          onAwardPoints={(cId, pts) => {
            if (onAwardPoints) onAwardPoints(cId, pts);
          }}
        />
      )}

      {/* Modal de Escaneo de Ficha si se invoca desde la tarjeta */}
      {scanningWorksheet && (
        <WorksheetScannerModal
          worksheet={scanningWorksheet}
          onClose={() => setScanningWorksheet(null)}
          onCorrectionComplete={handleCorrectionComplete}
          onAwardPoints={(pts) => {
            if (onAwardPoints && scanningWorksheet.childId) {
              onAwardPoints(scanningWorksheet.childId, pts);
            }
          }}
        />
      )}

      {/* CONTENIDO DE LA PESTAÑA 1: FICHAS A4 IMPRIMIBLES */}
      {activeTab === 'worksheets' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {isStudent ? 'Tus Hojas de Repaso Asignadas' : 'Colección de Hojas de Ejercicios A4'} ({displayedWorksheets.length})
              </h3>
              <p className="text-xs text-slate-500">
                {isStudent
                  ? 'Imprime la ficha en papel para resolverla en tu mesa a lápiz y sube la foto al terminar para ganar puntos.'
                  : 'Hojas listas para imprimir en papel A4 (con cuadrícula de 5 mm o pauta escolar) o para ver las correcciones.'}
              </p>
            </div>

            {/* Filtro por Alumno */}
            {!isStudent && childrenList.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filtrar:</span>
                <select
                  value={filterChildId}
                  onChange={(e) => setFilterChildId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los alumnos</option>
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {displayedWorksheets.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center text-3xl">
                {isStudent ? '🎒' : '📄'}
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-black text-slate-800">
                  {isStudent
                    ? 'Aún no tienes fichas asignadas por tus padres'
                    : 'Aún no has generado ninguna hoja de ejercicios'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isStudent
                    ? 'Tus padres te prepararán hojas de repaso para imprimir en papel. También puedes usar el botón de arriba para corregir una foto de tus deberes del colegio.'
                    : 'Crea fichas adaptadas al libro escolar de tus hijos o fotografía los deberes del colegio para generar una ficha de refuerzo automática.'}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                {!isStudent ? (
                  <button
                    onClick={() => setIsWizardOpen(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Crear primera ficha de repaso
                  </button>
                ) : null}
                <button
                  onClick={() => setIsHomeworkModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  📸 Fotografiar Deberes de Clase
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedWorksheets.map((ws) => {
                const isMath = (ws.subject || '').toLowerCase().includes('matem');
                const isRuled = ws.formatType === 'open_questions_ruled';
                const isReinforcement = ws.originType === 'homework_reinforcement';

                return (
                  <div
                    key={ws.id}
                    onClick={() => setSelectedWorksheet(ws)}
                    className="group cursor-pointer bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative"
                  >
                    <div>
                      {/* Fila superior: ID, Materia, Etiqueta Refuerzo y Estado */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            {ws.id}
                          </span>
                          {isReinforcement && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                              🎯 Refuerzo Deberes
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isMath ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {isRuled ? '📝 Pauta' : '📐 Cuadrícula'}
                          </span>
                        </div>

                        {ws.status === 'corrected' ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                            ✅ Nota: {ws.correction?.score.toFixed(1)}/10
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            🖨️ Lista para imprimir
                          </span>
                        )}
                      </div>

                      {/* Título y Materia */}
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {ws.subject}: {ws.topic}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {ws.bookTitle}
                      </p>

                      {/* Datos del Alumno y Fecha */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>👦 {ws.childName} ({ws.grade})</span>
                        <span>📅 {ws.date}</span>
                      </div>

                      {/* Conteo de ejercicios */}
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <span>
                          {ws.exercises.length} {isRuled ? 'preguntas pautadas' : 'operaciones con cuadrícula'}
                        </span>
                        <span>•</span>
                        <span>
                          {ws.pedagogicalPreferences?.subtractionsMethod === 'written_subtraction'
                            ? 'Resta escrita'
                            : (ws.pedagogicalPreferences?.activityType || ws.subject)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorksheet(ws);
                        }}
                        className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                      >
                        🖨️ Ver e Imprimir
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setScanningWorksheet(ws);
                        }}
                        className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                      >
                        📸 {ws.status === 'corrected' ? 'Ver Corrección' : 'Corregir Tarea'}
                      </button>

                      {!isStudent && (
                        <button
                          onClick={(e) => handleDeleteWorksheet(ws.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Eliminar ficha"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA 2: DEBERES DE CLASE CORREGIDOS & GUÍAS DE REFUERZO */}
      {activeTab === 'homework' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Historial de Deberes de Clase Corregidos ({displayedHomework.length})
              </h3>
              <p className="text-xs text-slate-500">
                Hojas de ejercicios del colegio y cuadernos revisados con IA, acompañados de su Guía Explicativa A4 y su Ficha de Refuerzo personalizada.
              </p>
            </div>

            <button
              onClick={() => setIsHomeworkModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📸 Subir Nueva Foto de Deberes</span>
            </button>
          </div>

          {displayedHomework.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-3xl">
                📸
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-black text-slate-800">
                  No hay hojas de deberes corregidas todavía
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cuando tu hijo termine sus deberes de clase o del cuaderno, saca una foto desde aquí. La IA revisará cada paso, te dirá qué concepto no está entendiendo y generará tanto una <strong>guía explicativa para imprimir</strong> como una <strong>ficha de ejercicios de refuerzo</strong>.
                </p>
              </div>
              <button
                onClick={() => setIsHomeworkModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>📸 Fotografiar y Corregir Deberes Ahora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedHomework.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Fila superior: ID, Fecha, Calificación */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                          {item.id}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          📅 {item.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                          Nota: {item.score.toFixed(1)}/10
                        </span>
                        <span className="text-xs font-black px-2 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px]">
                          +{item.awardedXp} XP
                        </span>
                      </div>
                    </div>

                    {/* Alumno, Asignatura y Tema */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {item.completedByStudent ? '🎒 Trabajo Autónomo del Alumno' : '👨‍🏫 Registrado con Tutor'}
                        </span>
                        {item.effortLevel && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            item.effortLevel === 'alto' ? 'bg-emerald-100 text-emerald-800' :
                            item.effortLevel === 'medio' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Esfuerzo: {item.effortLevel === 'alto' ? '🔥 Alto' : item.effortLevel === 'medio' ? '⚡ Normal' : '💨 Rápido'}
                          </span>
                        )}
                        {item.interestLevel && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            item.interestLevel === 'muy_motivado' ? 'bg-purple-100 text-purple-800' :
                            item.interestLevel === 'positivo' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            Actitud: {item.interestLevel === 'muy_motivado' ? '🤩 Con ganas' : item.interestLevel === 'positivo' ? '😊 Tranquilo' : '🤯 Le costó'}
                          </span>
                        )}
                        {item.legibilityStatus === 'dudas_aclaradas' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✨ Aclarado por el alumno (Cero inventos)
                          </span>
                        )}
                        {item.legibilityStatus === 'dificil' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            ⚠️ Trazo dudoso
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-900">
                        {item.subject}: {item.topic}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Alumno: <strong className="text-slate-800">{item.childName}</strong> ({item.grade})
                        {item.notes && ` • Nota: "${item.notes}"`}
                      </p>

                      {item.childSelfReflection && (
                        <p className="mt-1.5 p-2 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 font-medium">
                          💬 <em>Reflexión del alumno:</em> "{item.childSelfReflection}"
                        </p>
                      )}

                      {item.tutorFeedback && (
                        <div className="mt-2 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-start gap-2">
                          <span className="text-xl">{item.tutorFeedback.tutorSticker || '🌟'}</span>
                          <div className="text-[11px] text-amber-950">
                            <span className="font-bold text-amber-900 block">
                              Revisado por tutor {item.tutorFeedback.bonusPoints ? `(+${item.tutorFeedback.bonusPoints} pts extra)` : ''}:
                            </span>
                            "{item.tutorFeedback.tutorComment}"
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Foto en miniatura + Diagnóstico de errores */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 items-center">
                      <div className="col-span-1 rounded-xl overflow-hidden border border-slate-300 max-h-24 bg-black">
                        <img
                          src={item.imageUrl}
                          alt="Foto deberes"
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90"
                          onClick={() => setSelectedHomework(item)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">
                          🎯 Lo que necesita comprender:
                        </span>
                        <p className="text-[11px] text-slate-800 font-medium line-clamp-3 leading-snug">
                          {item.whatChildIsMissing}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Acciones principales: Documento 1 y Documento 2 */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Documento 1: Guía Explicativa */}
                      <button
                        onClick={() => setSelectedHomework(item)}
                        className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-black text-xs rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>📄 Imprimir Guía Explicativa (A4)</span>
                      </button>

                      {/* Documento 2: Ficha de Refuerzo */}
                      <button
                        onClick={() => {
                          const linked = worksheets.find((w) => w.id === item.reinforcementWorksheetId);
                          if (linked) {
                            setSelectedWorksheet(linked);
                          } else {
                            alert('Abriendo ficha de refuerzo vinculada...');
                          }
                        }}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>📑 Imprimir Ficha Refuerzo (A4)</span>
                      </button>
                    </div>

                    {!isStudent && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setReviewingHomework(item);
                            setTutorCommentInput(item.tutorFeedback?.tutorComment || '');
                            setTutorStickerInput(item.tutorFeedback?.tutorSticker || '🌟');
                            setBonusPointsInput(item.tutorFeedback?.bonusPoints || 15);
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>✍️</span>
                          <span>{item.tutorFeedback ? 'Editar Feedback de Tutor' : 'Validar Esfuerzo & Premiar Alumno'}</span>
                        </button>

                        <button
                          onClick={(e) => handleDeleteHomework(item.id, e)}
                          className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE FEEDBACK Y REVISIÓN DEL TUTOR */}
      {reviewingHomework && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍🏫</span>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Validar Esfuerzo de {reviewingHomework.childName}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {reviewingHomework.subject} • {reviewingHomework.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewingHomework(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Resumen del trabajo del alumno */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Nota obtenida por IA:</span>
                <span className="font-black text-emerald-700 text-sm">{reviewingHomework.score.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Esfuerzo declarado:</span>
                <span className="font-bold text-slate-800 uppercase text-[11px]">
                  {reviewingHomework.effortLevel || 'Alto'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-600">Actitud / Interés:</span>
                <span className="font-bold text-slate-800 uppercase text-[11px]">
                  {reviewingHomework.interestLevel || 'Positivo'}
                </span>
              </div>
              {reviewingHomework.childSelfReflection && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-500 text-[10px] uppercase block">Duda o sensación del alumno:</span>
                  <p className="text-slate-800 italic mt-0.5">"{reviewingHomework.childSelfReflection}"</p>
                </div>
              )}
            </div>

            {/* Mensaje de ánimo del tutor */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 block">
                💬 Mensaje o felicitación del tutor/padre:
              </label>
              <textarea
                rows={3}
                value={tutorCommentInput}
                onChange={(e) => setTutorCommentInput(e.target.value)}
                placeholder="Ej: ¡Muy orgulloso de cómo has resuelto los ejercicios con constancia! Sigue así."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Selector de Sticker y Puntos Extra */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 block">
                  🏅 Insignia / Sticker:
                </label>
                <div className="flex gap-2 text-xl bg-slate-50 p-1.5 rounded-xl border border-slate-200 justify-around">
                  {['🌟', '🏆', '🚀', '💪', '🎯'].map((stk) => (
                    <button
                      key={stk}
                      type="button"
                      onClick={() => setTutorStickerInput(stk)}
                      className={`p-1 rounded-lg transition-transform ${
                        tutorStickerInput === stk ? 'scale-125 bg-amber-200' : 'hover:scale-110'
                      }`}
                    >
                      {stk}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 block">
                  ⭐ Puntos Extra de Recompensa:
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bonusPointsInput}
                  onChange={(e) => setBonusPointsInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReviewingHomework(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTutorFeedback}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <span>💾 Guardar Feedback & Enviar Puntos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorksheetHub;
