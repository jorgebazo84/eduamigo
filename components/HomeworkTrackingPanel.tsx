import React, { useState, useEffect } from 'react';
import { Child } from '../types';
import { ScannedHomeworkRecord, PrintableWorksheet } from '../types/worksheets';
import { worksheetService } from '../services/worksheetService';
import { RemedialGuidePrintView } from './worksheets/RemedialGuidePrintView';
import { PrintableWorksheetView } from './worksheets/PrintableWorksheetView';

interface HomeworkTrackingPanelProps {
  childrenList: Child[];
  onAwardPoints?: (childId: string, points: number) => void;
}

export const HomeworkTrackingPanel: React.FC<HomeworkTrackingPanelProps> = ({
  childrenList,
  onAwardPoints
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(childrenList[0]?.id || 'all');
  const [records, setRecords] = useState<ScannedHomeworkRecord[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<ScannedHomeworkRecord | null>(null);
  const [selectedWorksheet, setSelectedWorksheet] = useState<PrintableWorksheet | null>(null);

  // Estados para validación y feedback del tutor
  const [feedbackHomeworkId, setFeedbackHomeworkId] = useState<string | null>(null);
  const [tutorNote, setTutorNote] = useState<string>('');
  const [tutorBadge, setTutorBadge] = useState<string>('🌟');
  const [bonusPoints, setBonusPoints] = useState<number>(15);

  const loadData = () => {
    setRecords(worksheetService.getHomeworkRecords());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = selectedChildId === 'all'
    ? records
    : records.filter((r) => r.childId === selectedChildId);

  // Métricas agregadas
  const totalHomework = filteredRecords.length;
  const avgScore = totalHomework > 0
    ? (filteredRecords.reduce((acc, curr) => acc + curr.score, 0) / totalHomework).toFixed(1)
    : '0.0';
  const highEffortCount = filteredRecords.filter((r) => r.effortLevel === 'alto').length;
  const autonomousCount = filteredRecords.filter((r) => r.completedByStudent).length;
  const reviewedCount = filteredRecords.filter((r) => !!r.tutorFeedback).length;

  const handleSaveTutorFeedback = (hw: ScannedHomeworkRecord) => {
    worksheetService.saveTutorFeedback(hw.id, {
      tutorComment: tutorNote || '¡Gran esfuerzo y autonomía resolviendo tus deberes!',
      tutorSticker: tutorBadge,
      bonusPoints,
    });
    if (onAwardPoints && hw.childId && bonusPoints > 0) {
      onAwardPoints(hw.childId, bonusPoints);
    }
    setFeedbackHomeworkId(null);
    setTutorNote('');
    loadData();
  };

  // 1. Si está viendo la Guía Explicativa A4 (Documento 1)
  if (selectedHomework) {
    return (
      <div className="space-y-4">
        <RemedialGuidePrintView
          homeworkRecord={selectedHomework}
          onBack={() => setSelectedHomework(null)}
          onOpenReinforcementWorksheet={() => {
            const linked = worksheetService.getWorksheets().find((w) => w.id === selectedHomework.reinforcementWorksheetId);
            if (linked) {
              setSelectedWorksheet(linked);
              setSelectedHomework(null);
            }
          }}
        />
      </div>
    );
  }

  // 2. Si está viendo la Ficha de Refuerzo A4 (Documento 2)
  if (selectedWorksheet) {
    return (
      <div className="space-y-4">
        <PrintableWorksheetView
          worksheet={selectedWorksheet}
          onBack={() => setSelectedWorksheet(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabecera con selector de hijo */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-blue-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-2">
            <span>🎒 Supervisión Tutorial & Registro Histórico</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
            Seguimiento de Deberes, Esfuerzo e Interés Autónomo
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Aquí quedan almacenadas todas las fotos de cuadernos y fichas que tus hijos escanean por su cuenta. Puedes auditar sus fallos conceptuales, valorar su constancia y recompensarles con notas de cariño y puntos extra.
          </p>
        </div>

        {/* Selector de Hijo */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedChildId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              selectedChildId === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({childrenList.length})
          </button>
          {childrenList.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChildId(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedChildId === c.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{c.avatar || '👦'}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de Métricas de Esfuerzo, Autonomía y Dificultades */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
            Tareas Escaneadas
          </span>
          <p className="text-3xl font-black text-slate-900">{totalHomework}</p>
          <span className="text-[10px] text-slate-500 font-bold">Hojas de cuaderno/ficha</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">
            Nota Media IA
          </span>
          <p className="text-3xl font-black text-emerald-700">{avgScore} <span className="text-xs text-slate-400">/ 10</span></p>
          <span className="text-[10px] text-slate-500 font-bold">Evaluación LOMLOE</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-wider">
            Autonomía del Niño
          </span>
          <p className="text-3xl font-black text-indigo-700">{autonomousCount}</p>
          <span className="text-[10px] text-slate-500 font-bold">Hechas por iniciativa propia</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-600 block tracking-wider">
            Alto Esfuerzo 🔥
          </span>
          <p className="text-3xl font-black text-amber-600">{highEffortCount}</p>
          <span className="text-[10px] text-slate-500 font-bold">Dedicación máxima</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-black uppercase text-purple-600 block tracking-wider">
            Revisadas por Tutor
          </span>
          <p className="text-3xl font-black text-purple-700">{reviewedCount} <span className="text-xs text-slate-400">/ {totalHomework}</span></p>
          <span className="text-[10px] text-slate-500 font-bold">Con feedback y stickers</span>
        </div>
      </div>

      {/* Lista de Registros con Diagnóstico de Errores, Documento 1 y Documento 2 */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-3">
          <div className="text-4xl">📸</div>
          <h4 className="text-base font-black text-slate-800">
            Aún no hay deberes registrados para este alumno
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            El niño puede pulsar en la pestaña <strong>«Fichas A4»</strong> o en <strong>«Tutor Visual»</strong> para sacar una foto a sus deberes de clase con el móvil o tablet. La app los validará al instante y quedarán guardados aquí con su diagnóstico y material imprimible.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800">
              Historial de Hojas Corregidas y Diagnóstico Pedagógico ({filteredRecords.length})
            </h4>
            <span className="text-xs text-slate-400 font-bold">Ordenadas de más recientes a antiguas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecords.map((item) => {
              const isReviewed = !!item.tutorFeedback;
              return (
                <div
                  key={item.id}
                  className="bg-white border-2 border-slate-200 hover:border-blue-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Fila superior: ID, Fecha, Nota y XP */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
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

                    {/* Etiquetas de esfuerzo e interés */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {item.completedByStudent ? '🎒 Trabajo Autónomo' : '👨‍🏫 Guiado'}
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
                      {isReviewed && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-1">
                          <span>{item.tutorFeedback?.tutorSticker || '🌟'}</span>
                          <span>Revisado por Tutor</span>
                        </span>
                      )}
                      {item.legibilityStatus === 'dudas_aclaradas' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✨ Caligrafía aclarada (Cero inventos)
                        </span>
                      )}
                      {item.legibilityStatus === 'dificil' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          ⚠️ Trazo dudoso
                        </span>
                      )}
                    </div>

                    {/* Alumno y Tema */}
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        {item.subject}: {item.topic}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Alumno: <strong className="text-slate-800">{item.childName}</strong> ({item.grade})
                        {item.notes && ` • Nota: "${item.notes}"`}
                      </p>
                    </div>

                    {/* Reflexión del propio alumno */}
                    {item.childSelfReflection && (
                      <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider flex items-center gap-1">
                          <span>💬</span>
                          <span>Sensación / Duda que dejó el alumno:</span>
                        </span>
                        <p className="text-blue-950 italic font-medium leading-relaxed">
                          "{item.childSelfReflection}"
                        </p>
                      </div>
                    )}

                    {/* Foto en miniatura + Diagnóstico de lo que no entendió */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 items-center">
                      <div className="col-span-1 rounded-xl overflow-hidden border border-slate-300 max-h-24 bg-black">
                        <img
                          src={item.imageUrl}
                          alt="Foto de la tarea"
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedHomework(item)}
                          title="Haz clic para ver la guía explicativa"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">
                          🎯 Obstáculo pedagógico detectado:
                        </span>
                        <p className="text-[11px] text-slate-800 font-medium line-clamp-3 leading-snug">
                          {item.whatChildIsMissing}
                        </p>
                      </div>
                    </div>

                    {/* Feedback ya guardado del tutor */}
                    {item.tutorFeedback && (
                      <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                        <span className="text-2xl">{item.tutorFeedback.tutorSticker || '🌟'}</span>
                        <div className="space-y-0.5 text-xs text-amber-950">
                          <p className="font-bold text-amber-900">
                            Tu feedback como tutor {item.tutorFeedback.bonusPoints ? `(+${item.tutorFeedback.bonusPoints} pts enviados)` : ''}:
                          </p>
                          <p className="italic">"{item.tutorFeedback.tutorComment}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones del Tutor: Imprimir Guía A4, Imprimir Refuerzo A4 o Dejar Feedback */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedHomework(item)}
                        className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-black text-xs rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>📄 Ver Guía Explicativa (A4)</span>
                      </button>

                      <button
                        onClick={() => {
                          const linked = worksheetService.getWorksheets().find((w) => w.id === item.reinforcementWorksheetId);
                          if (linked) {
                            setSelectedWorksheet(linked);
                          } else {
                            alert('Abriendo ficha de refuerzo vinculada...');
                          }
                        }}
                        className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl border border-emerald-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>📑 Ver Ficha Refuerzo (A4)</span>
                      </button>
                    </div>

                    {/* Botón para dar feedback / premiar al niño */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => {
                          setFeedbackHomeworkId(item.id);
                          setTutorNote(item.tutorFeedback?.tutorComment || '');
                          setTutorBadge(item.tutorFeedback?.tutorSticker || '🌟');
                          setBonusPoints(item.tutorFeedback?.bonusPoints || 15);
                        }}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>✍️</span>
                        <span>{isReviewed ? 'Editar Mensaje / Puntos' : 'Reconocer Esfuerzo & Recompensar'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este registro de deberes?')) {
                            worksheetService.deleteHomeworkRecord(item.id);
                            loadData();
                          }
                        }}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>

                    {/* Formulario desplegable inline de Feedback */}
                    {feedbackHomeworkId === item.id && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
                        <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                          📝 Mensaje de reconocimiento para {item.childName}:
                        </span>
                        <textarea
                          rows={2}
                          value={tutorNote}
                          onChange={(e) => setTutorNote(e.target.value)}
                          placeholder="Ej: ¡Excelente constancia resolviendo las divisiones por ti mismo!"
                          className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                        />
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-lg bg-white p-1 rounded-xl border border-amber-200">
                            {['🌟', '🏆', '🚀', '💪', '🎯'].map((stk) => (
                              <button
                                key={stk}
                                type="button"
                                onClick={() => setTutorBadge(stk)}
                                className={`p-1 rounded-lg transition-transform ${
                                  tutorBadge === stk ? 'scale-125 bg-amber-200' : 'hover:scale-110'
                                }`}
                              >
                                {stk}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-900">⭐ Puntos extra:</span>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={bonusPoints}
                              onChange={(e) => setBonusPoints(Number(e.target.value))}
                              className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-800"
                            />
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => setFeedbackHomeworkId(null)}
                              className="px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveTutorFeedback(item)}
                              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black shadow-xs"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeworkTrackingPanel;
