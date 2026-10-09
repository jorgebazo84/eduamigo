import React, { useState, useRef } from 'react';
import { PrintableWorksheet, WorksheetCorrection } from '../../types/worksheets';
import { worksheetService } from '../../services/worksheetService';

interface WorksheetScannerModalProps {
  worksheet: PrintableWorksheet;
  onClose: () => void;
  onCorrectionComplete: (worksheet: PrintableWorksheet, correction: WorksheetCorrection) => void;
  onAwardPoints?: (points: number) => void;
}

export const WorksheetScannerModal: React.FC<WorksheetScannerModalProps> = ({
  worksheet,
  onClose,
  onCorrectionComplete,
  onAwardPoints,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<WorksheetCorrection | null>(worksheet.correction || null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('No se pudo acceder a la cámara. Puedes subir una foto desde tu galería o archivos.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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
    if (!imagePreview) return;
    setIsProcessing(true);
    setError(null);

    try {
      const correction = await worksheetService.correctWorksheetPhoto(worksheet, imagePreview);
      setCorrectionResult(correction);
      onCorrectionComplete(worksheet, correction);
      if (onAwardPoints && correction.awardedXp) {
        onAwardPoints(correction.awardedXp);
      }
    } catch (err: any) {
      console.error('Error analyzing worksheet photo:', err);
      setError('Ocurrió un error al procesar la imagen con la IA. Por favor verifica que la foto tenga buena luz e inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📸</span>
              <h3 className="text-xl font-black text-slate-900">
                Corrección Óptica con IA
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ficha: <strong className="text-slate-800">{worksheet.id}</strong> • Alumno/a: <strong className="text-blue-600">{worksheet.childName}</strong>
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 font-black p-2 text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* Vista previa / Captura */}
        {!correctionResult ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Fotografía la ficha que rellenó tu hijo en papel. La IA analizará sus trazos a mano, las restas intermedias, la bajada de cifras y emitirá un informe pedagógico detallado.
            </p>

            {/* Selector de modo: Cámara o Archivo */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
              {isCameraActive ? (
                <div className="w-full space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 max-h-72 mx-auto">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md"
                    >
                      📸 Disparar Foto
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Cancelar Cámara
                    </button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="w-full space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-slate-100 max-h-72 mx-auto border border-slate-200">
                    <img src={imagePreview} alt="Captura Ficha" className="w-full h-auto max-h-72 object-contain mx-auto" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setImagePreview(null)}
                      className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Repetir foto
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center text-2xl">
                    📷
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-800">
                      Sube o toma una foto de la hoja
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Asegúrate de que los números y restas se lean con claridad
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      📸 Usar Cámara
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      📁 Subir Imagen
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
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Analizando trazos manuscritos y restas con IA...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍 Corregir Ficha Manuscrita Ahora</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* RESULTADO DE LA CORRECCIÓN */
          <div className="space-y-6">
            {/* Tarjeta de Calificación y XP */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                  Evaluación Óptica LOMLOE
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-900">
                    {correctionResult.score.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">/ 10</span>
                </div>
                <p className="text-xs text-emerald-800 font-semibold">
                  {correctionResult.correctExercises} de {correctionResult.totalExercises} operaciones resueltas correctamente.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-black bg-amber-100 text-amber-900 px-3 py-1 rounded-full inline-flex items-center gap-1">
                  ⭐ +{correctionResult.awardedXp} XP sumados
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Recompensa automática</p>
              </div>
            </div>

            {/* Diagnóstico para Padres */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>👨‍👩‍👧 Diagnóstico Pedagógico para la Familia:</span>
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {correctionResult.summaryDiagnosis}
              </p>
              <p className="text-[11px] text-blue-800 bg-blue-50 p-2 rounded-xl border border-blue-100">
                💡 <strong>Observación de proceso:</strong> {correctionResult.pedagogicalInsight}
              </p>
            </div>

            {/* Análisis Ejercicio por Ejercicio */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800">
                Desglose Operación por Operación:
              </h4>
              <div className="space-y-2.5">
                {correctionResult.exerciseCorrections.map((ex) => (
                  <div
                    key={ex.index}
                    className={`p-3 rounded-xl border text-xs ${
                      ex.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-slate-900">
                        Ejercicio #{ex.index}: {ex.isCorrect ? '✅ Correcto' : '⚠️ Requiere atención'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ex.studentAnswer}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5">
                      {ex.stepAnalysis}
                    </p>
                    {ex.feedback && (
                      <p className="text-[10px] text-blue-700 font-bold mt-1">
                        💬 {ex.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Áreas de Refuerzo Sugeridas */}
            {correctionResult.areasToReinforce?.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <h5 className="text-xs font-black text-amber-900 mb-1.5">
                  🎯 Puntos sugeridos para el siguiente repaso:
                </h5>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                  {correctionResult.areasToReinforce.map((area, idx) => (
                    <li key={idx}>{area}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón de cierre */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md"
              >
                Entendido y Guardar Informe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
