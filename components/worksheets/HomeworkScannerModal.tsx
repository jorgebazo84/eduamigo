import React, { useState, useRef } from 'react';
import { Child } from '../../types';
import { Book } from '../../types/study';
import { ScannedHomeworkRecord } from '../../types/worksheets';
import { worksheetService } from '../../services/worksheetService';

interface HomeworkScannerModalProps {
  childrenList: Child[];
  books?: Book[];
  selectedChildId?: string;
  isStudent?: boolean;
  onClose: () => void;
  onCorrectionComplete: (record: ScannedHomeworkRecord) => void;
  onOpenRemedialGuide?: (record: ScannedHomeworkRecord) => void;
  onOpenReinforcementWorksheet?: (worksheetId: string) => void;
  onAwardPoints?: (childId: string, points: number) => void;
}

export const HomeworkScannerModal: React.FC<HomeworkScannerModalProps> = ({
  childrenList,
  books = [],
  selectedChildId,
  isStudent = false,
  onClose,
  onCorrectionComplete,
  onOpenRemedialGuide,
  onOpenReinforcementWorksheet,
  onAwardPoints,
}) => {
  const [childId, setChildId] = useState<string>(
    selectedChildId || childrenList[0]?.id || ''
  );
  const [subject, setSubject] = useState<string>('Matemáticas');
  const [parentNotes, setParentNotes] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [effortLevel, setEffortLevel] = useState<'alto' | 'medio' | 'bajo'>('alto');
  const [interestLevel, setInterestLevel] = useState<'muy_motivado' | 'positivo' | 'le_cuesta_o_bloqueo'>('positivo');
  const [childSelfReflection, setChildSelfReflection] = useState<string>('');

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [correctionResult, setCorrectionResult] = useState<ScannedHomeworkRecord | null>(null);
  const [pendingClarificationRecord, setPendingClarificationRecord] = useState<ScannedHomeworkRecord | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({});
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [editingExerciseText, setEditingExerciseText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentChild = childrenList.find((c) => c.id === childId) || childrenList[0];

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('No se pudo acceder a la cámara. Puedes subir una fotografía desde la galería o archivos de tu dispositivo.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setImagePreview(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview || !currentChild) return;
    setIsProcessing(true);
    setError(null);

    // Animación de pasos pedagógicos
    setProcessingStep('1. Analizando escritura a mano con Visión IA y verificando legibilidad...');
    const stepTimer1 = setTimeout(() => {
      setProcessingStep('2. Detectando aciertos, fallos y obstáculos de aprendizaje...');
    }, 2200);
    const stepTimer2 = setTimeout(() => {
      setProcessingStep('3. Redactando guía explicativa adaptada a su curso (Doc. 1)...');
    }, 4500);
    const stepTimer3 = setTimeout(() => {
      setProcessingStep('4. Diseñando ficha A4 de ejercicios de refuerzo a medida (Doc. 2)...');
    }, 6800);

    try {
      const record = await worksheetService.correctHomeworkPhoto({
        child: {
          id: currentChild.id,
          name: currentChild.name,
          grade: currentChild.grade,
        },
        subject,
        grade: currentChild.grade,
        bookTitle: selectedBook || undefined,
        notes: parentNotes || undefined,
        imageBase64: imagePreview,
        completedByStudent: isStudent,
        effortLevel,
        interestLevel,
        childSelfReflection: childSelfReflection || undefined,
      });

      // Protocolo de Cero Invenciones: Si la IA tiene dudas sobre números/letras ilegibles
      if (record.hasReadingDoubts && record.clarificationQuestions && record.clarificationQuestions.length > 0) {
        setPendingClarificationRecord(record);
        const initialAnswers: Record<number, string> = {};
        record.clarificationQuestions.forEach((q) => {
          initialAnswers[q.exerciseIndex] = q.suggestedOptions?.[0] || '';
        });
        setClarificationAnswers(initialAnswers);
        return;
      }

      setCorrectionResult(record);
      onCorrectionComplete(record);

      if (onAwardPoints && record.awardedXp) {
        onAwardPoints(record.childId, record.awardedXp);
      }
    } catch (err: any) {
      console.error('Error analyzing homework:', err);
      setError('Ocurrió un error al procesar la imagen con la IA. Por favor, asegúrate de que la foto tenga buena iluminación y vuelve a intentarlo.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsProcessing(false);
    }
  };

  const handleConfirmClarifications = async () => {
    if (!imagePreview || !currentChild) return;
    setIsProcessing(true);
    setError(null);
    setProcessingStep('Reevaluando con tus aclaraciones confirmadas (100% rigor sin inventos)...');

    try {
      const record = await worksheetService.correctHomeworkPhoto({
        child: {
          id: currentChild.id,
          name: currentChild.name,
          grade: currentChild.grade,
        },
        subject,
        grade: currentChild.grade,
        bookTitle: selectedBook || undefined,
        notes: parentNotes || undefined,
        imageBase64: imagePreview,
        completedByStudent: isStudent,
        effortLevel,
        interestLevel,
        childSelfReflection: childSelfReflection || undefined,
        userClarifications: clarificationAnswers,
      });

      setPendingClarificationRecord(null);
      setCorrectionResult(record);
      onCorrectionComplete(record);

      if (onAwardPoints && record.awardedXp) {
        onAwardPoints(record.childId, record.awardedXp);
      }
    } catch (err: any) {
      console.error('Error applying clarifications:', err);
      setError('Ocurrió un error al aplicar las aclaraciones. Se mostrará el borrador inicial.');
      if (pendingClarificationRecord) {
        setCorrectionResult(pendingClarificationRecord);
        setPendingClarificationRecord(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipClarifications = () => {
    if (pendingClarificationRecord) {
      setCorrectionResult(pendingClarificationRecord);
      onCorrectionComplete(pendingClarificationRecord);
      if (onAwardPoints && pendingClarificationRecord.awardedXp) {
        onAwardPoints(pendingClarificationRecord.childId, pendingClarificationRecord.awardedXp);
      }
      setPendingClarificationRecord(null);
    }
  };

  const handleSaveInlineClarification = (exerciseIndex: number) => {
    if (!correctionResult || !editingExerciseText.trim()) return;
    const updated = worksheetService.clarifyExerciseReading(
      correctionResult.id,
      exerciseIndex,
      editingExerciseText.trim()
    );
    if (updated) {
      setCorrectionResult({ ...updated });
      onCorrectionComplete(updated);
    }
    setEditingExerciseIndex(null);
    setEditingExerciseText('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isStudent ? '🎒' : '📸'}</span>
              <h3 className="text-xl font-black text-slate-900">
                {isStudent
                  ? `Mis Deberes Autónomos: ¡Valida, Aprende y Sigue Avanzando!`
                  : 'Corrector de Deberes & Fichas de Clase con IA'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isStudent
                ? 'Sube una foto de lo que has hecho a lápiz. La IA te dirá qué tienes bien, te explicará con cariño lo que no hayas entendido y te preparará una ficha para afianzarlo. Todo queda guardado para que tu tutor/padres vean tu esfuerzo ⭐.'
                : 'Sube una foto del cuaderno o ficha de clase. La IA la corregirá, redactará un documento explicativo y preparará una ficha de refuerzo A4 para imprimir.'}
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 font-black p-2 text-lg rounded-xl hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Paso Interactivo de Aclaración si la IA detecta dudas de lectura */}
        {pendingClarificationRecord ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl border-2 border-amber-300 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🔍</span>
                <div>
                  <h4 className="text-base font-black text-amber-950">
                    {isStudent
                      ? '¡La IA tiene dudas con algunos trazos y no quiere inventarse nada!'
                      : 'Dudas de lectura detectadas: Protocolo de Cero Invención'}
                  </h4>
                  <p className="text-xs text-amber-900 mt-0.5">
                    {isStudent
                      ? 'Para no bajarte nota por error ni inventarnos lo que pusiste, ¿puedes decirnos qué pone en estos ejercicios?'
                      : 'La IA ha detectado trazos confusos, números borrosos o tachones. Para garantizar 100% de rigor pedagógico sin alucinaciones, por favor aclara los siguientes puntos:'}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de preguntas de aclaración generadas por la IA */}
            <div className="space-y-4">
              {pendingClarificationRecord.clarificationQuestions?.map((q) => (
                <div
                  key={q.exerciseIndex}
                  className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-800 bg-white border border-slate-300 px-3 py-1 rounded-xl shadow-2xs">
                      Ejercicio #{q.exerciseIndex}
                    </span>
                    {q.unclearSnippet && (
                      <span className="text-[11px] font-mono bg-amber-100 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-200">
                        🔎 Fragmento borroso: <strong>{q.unclearSnippet}</strong>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                    ❓ {q.question}
                  </p>

                  {/* Opciones rápidas si la IA detectó interpretaciones posibles */}
                  {q.suggestedOptions && q.suggestedOptions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Opciones rápidas que parecen encajar:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {q.suggestedOptions.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setClarificationAnswers((prev) => ({
                                ...prev,
                                [q.exerciseIndex]: opt,
                              }))
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                              clarificationAnswers[q.exerciseIndex] === opt
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            "{opt}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campo de texto para escribir la respuesta exacta del alumno */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider block mb-1.5">
                      ✏️ Lo que realmente escribió el alumno a lápiz:
                    </label>
                    <input
                      type="text"
                      value={clarificationAnswers[q.exerciseIndex] || ''}
                      onChange={(e) =>
                        setClarificationAnswers((prev) => ({
                          ...prev,
                          [q.exerciseIndex]: e.target.value,
                        }))
                      }
                      placeholder="Escribe el número, palabra u operación exacta..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSkipClarifications}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer order-2 sm:order-1"
              >
                Continuar con la estimación aproximada de la IA
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmClarifications}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{processingStep || 'Reevaluando...'}</span>
                  </>
                ) : (
                  <>
                    <span>✅ Confirmar Aclaraciones y Corregir con Exactitud</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : !correctionResult ? (
          <div className="space-y-5">
            {/* Banner de Autonomía del Alumno */}
            {isStudent && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                <span className="text-3xl">🚀</span>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-emerald-900">
                    ¡Autonomía y superación personal de {currentChild?.name}!
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    No necesitas esperar a nadie: la IA te corrige al momento para que no te quedes atascado. Al terminar, tu tutor podrá ver cómo has trabajado y felicitarte.
                  </p>
                </div>
              </div>
            )}

            {/* 1. Selección de Alumno y Asignatura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 block">
                  👦 {isStudent ? 'Estudiante:' : 'Alumno / Hijo:'}
                </label>
                <select
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  disabled={isStudent}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-80"
                >
                  {childrenList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 block">
                  📚 Asignatura principal:
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Matemáticas">Matemáticas (Cálculo, Problemas, Divisiones)</option>
                  <option value="Lengua Castellana">Lengua Castellana (Comprensión, Gramática, Ortografía)</option>
                  <option value="Ciencias de la Naturaleza">Ciencias de la Naturaleza</option>
                  <option value="Ciencias Sociales">Ciencias Sociales</option>
                  <option value="Inglés">Inglés (Reading, Writing, Grammar)</option>
                  <option value="Otra">Otra / Detectar automáticamente</option>
                </select>
              </div>
            </div>

            {/* Autoevaluación de Esfuerzo e Interés para el Alumno / Tutor */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider block">
                ⭐ ¿Cómo te has sentido haciendo esta tarea? (Quedará registrado para tu tutor):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    💪 Esfuerzo y dedicación:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEffortLevel('alto')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                        effortLevel === 'alto'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🔥 Mucho
                    </button>
                    <button
                      type="button"
                      onClick={() => setEffortLevel('medio')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                        effortLevel === 'medio'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ⚡ Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setEffortLevel('bajo')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${
                        effortLevel === 'bajo'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      💨 Rápido
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    🎯 Interés y motivación:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInterestLevel('muy_motivado')}
                      className={`py-1.5 px-1.5 rounded-xl text-[10px] font-black transition-all truncate ${
                        interestLevel === 'muy_motivado'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🤩 Con ganas
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterestLevel('positivo')}
                      className={`py-1.5 px-1.5 rounded-xl text-[10px] font-black transition-all truncate ${
                        interestLevel === 'positivo'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      😊 Tranquilo
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterestLevel('le_cuesta_o_bloqueo')}
                      className={`py-1.5 px-1.5 rounded-xl text-[10px] font-black transition-all truncate ${
                        interestLevel === 'le_cuesta_o_bloqueo'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🤯 Me costó
                    </button>
                  </div>
                </div>
              </div>

              {/* Sensación o duda del alumno */}
              <div>
                <input
                  type="text"
                  value={childSelfReflection}
                  onChange={(e) => setChildSelfReflection(e.target.value)}
                  placeholder="¿Alguna duda concreta o algo que quieras contarle a tu tutor? (Opcional)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notas opcionales del tutor o tema del libro */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 block">
                📝 Notas de contexto opcionales (página del libro, tema del examen, etc.):
              </label>
              <input
                type="text"
                value={parentNotes}
                onChange={(e) => setParentNotes(e.target.value)}
                placeholder="Ej: Ejercicios 2 y 3 de divisiones de clase, o deberes del cuaderno"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Captura de Foto: Cámara o Subir Archivo */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
              {isCameraActive ? (
                <div className="w-full space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 max-h-80 mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>📸 Tomar Foto Ahora</span>
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="w-full space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 max-h-80 mx-auto inline-block shadow-sm">
                    <img
                      src={imagePreview}
                      alt="Vista previa deberes"
                      className="max-h-80 w-auto object-contain mx-auto"
                    />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setImagePreview(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      🔄 Cambiar / Tomar otra foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center text-3xl">
                    📸
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-800">
                      Fotografía la hoja del cuaderno o ficha de clase
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Asegúrate de que haya buena luz y se lean bien los números o letras manuscritas a lápiz.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={startCamera}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>📷 Abrir Cámara</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-black text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>📁 Subir Foto o Archivo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Botón de Analizar */}
            {imagePreview && (
              <div className="pt-2">
                <button
                  disabled={isProcessing}
                  onClick={handleAnalyze}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold">{processingStep || 'Analizando deberes con IA...'}</span>
                    </>
                  ) : (
                    <>
                      <span>🔍 Corregir Deberes y Generar Fichas Imprimibles con IA</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             VISTA DE RESULTADOS DE LA CORRECCIÓN CON LOS DOS DOCUMENTOS GENERADOS
             ========================================================================= */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Tarjeta de Calificación y XP */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black bg-white/20 uppercase tracking-wider">
                  <span>Evaluación Diagnóstica LOMLOE</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{correctionResult.score.toFixed(1)}</span>
                  <span className="text-sm font-bold opacity-80">/ 10</span>
                </div>
                <p className="text-xs font-semibold text-emerald-100">
                  {correctionResult.correctExercises} de {correctionResult.totalExercises} actividades resueltas correctamente.
                </p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs font-black bg-white text-emerald-800 px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-sm">
                  ⭐ +{correctionResult.awardedXp} XP ganados
                </span>
                <p className="text-[11px] text-emerald-100">
                  {correctionResult.subject}: <strong>{correctionResult.topic}</strong>
                </p>
                <div className="pt-0.5">
                  {correctionResult.legibilityStatus === 'dudas_aclaradas' ? (
                    <span className="text-[10px] font-black bg-emerald-800/80 text-white px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-300/40">
                      ✨ Caligrafía aclarada por ti (Cero inventos)
                    </span>
                  ) : correctionResult.legibilityStatus === 'dificil' ? (
                    <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      ⚠️ Trazo dudoso en foto
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-white/20 text-white px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      🔍 Escritura nítida (100% verificada)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN ESTRELLA: LOS 2 DOCUMENTOS IMPRIMIBLES GENERADOS */}
            <div className="p-5 bg-gradient-to-br from-indigo-50 via-blue-50 to-emerald-50 rounded-3xl border-2 border-indigo-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-indigo-900 flex items-center gap-1.5">
                    <span>🖨️</span>
                    <span>Documentos Oficiales Preparados para Imprimir (A4)</span>
                  </h4>
                  <p className="text-xs text-indigo-700">
                    Ajustados al nivel de <strong>{correctionResult.grade}</strong> y a los errores detectados en la foto:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DOCUMENTO 1: GUÍA EXPLICATIVA ADAPTADA */}
                <div className="bg-white p-5 rounded-2xl border-2 border-indigo-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase">
                        Documento 1 • A4
                      </span>
                      <span className="text-lg">📄</span>
                    </div>
                    <h5 className="text-sm font-black text-slate-900">
                      Guía Explicativa & Aclaración de Dudas
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Explica al niño con cariño, analogías y ejemplos paso a paso exactamente <strong>lo que no entendió</strong> en la tarea de clase para repasar en casa.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenRemedialGuide) {
                        onOpenRemedialGuide(correctionResult);
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>👁️ Ver e Imprimir Guía Explicativa</span>
                  </button>
                </div>

                {/* DOCUMENTO 2: FICHA DE REFUERZO A4 */}
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        Documento 2 • A4
                      </span>
                      <span className="text-lg">📑</span>
                    </div>
                    <h5 className="text-sm font-black text-slate-900">
                      Ficha A4 de Ejercicios de Refuerzo
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Nuevos ejercicios personalizados (con cuadrícula escolar de 5 mm o pauta) con código QR de seguimiento para que practique los fallos a lápiz.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenReinforcementWorksheet && correctionResult.reinforcementWorksheetId) {
                        onOpenReinforcementWorksheet(correctionResult.reinforcementWorksheetId);
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🖨️ Ver e Imprimir Ficha de Refuerzo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnóstico Pedagógico Profundo */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <span>🎯</span>
                <span>Lo que específicamente no está entendiendo el alumno:</span>
              </h4>
              <p className="text-xs text-amber-950 font-bold leading-relaxed">
                {correctionResult.whatChildIsMissing}
              </p>
              <p className="text-[11px] text-slate-600 pt-1 border-t border-amber-200">
                {correctionResult.summaryDiagnosis}
              </p>
            </div>

            {/* Desglose Ejercicio por Ejercicio Detectado en la Foto */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800">
                Ejercicios detectados en el cuaderno o ficha de clase ({correctionResult.exercises.length}):
              </h4>
              <div className="space-y-2.5">
                {correctionResult.exercises.map((ex) => (
                  <div
                    key={ex.index}
                    className={`p-3.5 rounded-2xl border text-xs ${
                      ex.status === 'correct'
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : ex.status === 'partial'
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-red-50/60 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-black text-slate-900">
                        {ex.status === 'correct' ? '✅' : ex.status === 'partial' ? '⚠️' : '❌'}{' '}
                        Ejercicio #{ex.index}: {ex.statement}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-white border border-slate-200">
                        {ex.status === 'correct' ? 'Correcto' : ex.status === 'partial' ? 'A repasar' : 'Incorrecto'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono mt-1">
                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200">
                        <span className="font-sans font-bold text-[9px] text-slate-500 uppercase block">
                          Respuesta en el cuaderno:
                        </span>
                        {ex.studentAnswer}
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200 text-emerald-800">
                        <span className="font-sans font-bold text-[9px] text-emerald-600 uppercase block">
                          Solución esperada:
                        </span>
                        {ex.correctSolution}
                      </div>
                    </div>

                    {ex.rootError && (
                      <p className="text-[11px] text-amber-900 font-bold mt-2">
                        🔍 <strong>Dificultad detectada:</strong> {ex.rootError}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-700 mt-1">
                      💡 {ex.teacherExplanation}
                    </p>

                    {/* Alerta de duda de caligrafía o trazo dudoso */}
                    {ex.isAmbiguousOrUnclear && (
                      <div className="mt-2.5 p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-[11px] text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-bold">⚠️ Duda de caligrafía: </span>
                          <span>{ex.unclearReason || 'El trazo o número en la foto original genera dudas.'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExerciseIndex(ex.index);
                            setEditingExerciseText(ex.studentAnswer);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-400 font-black text-[10px] rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                        >
                          ✏️ Aclarar trazo
                        </button>
                      </div>
                    )}

                    {/* Tag de aclaración verificada por el usuario */}
                    {ex.userClarification && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 flex items-center justify-between">
                        <span>✨ Aclarado por el alumno/tutor: <strong>"{ex.userClarification}"</strong></span>
                        <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-black">Cero Alucinaciones</span>
                      </div>
                    )}

                    {/* Formulario Inline de corrección manual de lectura */}
                    {editingExerciseIndex === ex.index ? (
                      <div className="mt-2.5 p-3 bg-white rounded-xl border-2 border-blue-400 shadow-sm space-y-2">
                        <label className="text-[10px] font-black uppercase text-blue-900 block">
                          ✏️ Indicar lo que realmente escribió el alumno a lápiz:
                        </label>
                        <input
                          type="text"
                          value={editingExerciseText}
                          onChange={(e) => setEditingExerciseText(e.target.value)}
                          placeholder="Escribe la respuesta real del cuaderno..."
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingExerciseIndex(null)}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineClarification(ex.index)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-lg shadow-xs cursor-pointer"
                          >
                            Guardar Aclaración
                          </button>
                        </div>
                      </div>
                    ) : (
                      !ex.isAmbiguousOrUnclear && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExerciseIndex(ex.index);
                              setEditingExerciseText(ex.studentAnswer);
                            }}
                            className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>✏️ ¿La IA leyó mal este trazo? Corregir lectura</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de Guardar y Cerrar */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Cerrar y Ver Historial
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkScannerModal;
