import React, { useState } from 'react';
import { studyService } from '../services/studyService';
import { StudyTask, EvaluationResponse } from '../types/study';

interface StudyReviewProps {
  task: StudyTask;
  bookTitle: string;
  grade: string;
  onComplete: (evaluation: EvaluationResponse, summary: string, handwritingImage?: string, medicalEvaluation?: string) => void;
  onClose: () => void;
}

const StudyReview: React.FC<StudyReviewProps> = ({ task, bookTitle, grade, onComplete, onClose }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [handwritingImage, setHandwritingImage] = useState<string | null>(null);
  const [medicalEvaluation, setMedicalEvaluation] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHandwritingImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (summary.length < 20) {
      alert("¡Escribe un poquito más! Cuéntame con más detalle lo que has aprendido.");
      return;
    }

    setLoading(true);
    try {
      const result = await studyService.evaluateSummary(summary, task.topicTitle, bookTitle, grade);
      setEvaluation(result);
      
      let medEval = "";
      if (handwritingImage) {
        const hResult = await studyService.evaluateHandwriting(handwritingImage);
        medEval = hResult.evaluation;
        setMedicalEvaluation(medEval);
      }

      if (result.isPassed) {
        onComplete(result, summary, handwritingImage || undefined, medEval || undefined);
      }
    } catch (err) {
      console.error("Error evaluando resumen:", err);
      alert("Hubo un problema al conectar con el tutor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="bg-ewola p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">📝 Repaso de Tema</h2>
              <p className="opacity-90">{bookTitle} • {task.topicTitle}</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">✕</button>
          </div>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {!evaluation ? (
            <>
              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                <p className="text-sky-800 font-medium">
                  💡 ¡Hola! Cuéntame qué has aprendido hoy en este tema. No hace falta que sea perfecto, ¡lo importante es que lo expliques con tus palabras!
                </p>
              </div>

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Escribe aquí tu resumen..."
                className="w-full h-48 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-ewola outline-none resize-none transition-all text-lg"
              />

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">📸 Sube una foto de tu resumen escrito a mano (Opcional)</label>
                <p className="text-xs text-slate-500">¡Tu tutor podrá analizar tu letra y ver tu progreso!</p>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="handwriting-upload"
                  />
                  <label 
                    htmlFor="handwriting-upload"
                    className="flex-1 p-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-ewola hover:bg-sky-50 transition-all"
                  >
                    {handwritingImage ? (
                      <img src={handwritingImage} alt="Escritura" className="h-20 rounded-lg shadow-sm" />
                    ) : (
                      <>
                        <span className="text-2xl">📷</span>
                        <span className="text-xs font-bold text-slate-400">Toca para subir foto</span>
                      </>
                    )}
                  </label>
                  {handwritingImage && (
                    <button 
                      onClick={() => setHandwritingImage(null)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg text-sm font-bold"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !summary}
                className={`w-full p-4 rounded-2xl font-bold text-white shadow-lg transition-all ${
                  loading ? 'bg-slate-400' : 'bg-ewola hover:scale-[1.02] active:scale-95'
                }`}
              >
                {loading ? 'Analizando tu resumen...' : '🚀 ¡Enviar a mi Tutor!'}
              </button>
            </>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-yellow-400 flex items-center justify-center text-3xl shadow-inner">
                  ⭐
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">¡Buen trabajo!</h3>
                  <p className="text-slate-500">Tu tutor ha revisado tu resumen</p>
                </div>
                <div className="ml-auto text-3xl font-black text-ewola">
                  {evaluation.score}/10
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border-2 border-ewola/20 shadow-sm">
                <p className="text-slate-700 leading-relaxed italic">
                  "{evaluation.feedbackChild}"
                </p>
              </div>

              {!evaluation.isPassed && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-orange-800 text-sm">
                    ⚠️ **Nota del tutor:** Aún faltan algunos detalles importantes. ¡Vuelve a leer el tema y añade lo que falta para ganar tus puntos!
                  </p>
                </div>
              )}

              <button
                onClick={evaluation.isPassed ? onClose : () => setEvaluation(null)}
                className="w-full p-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-all"
              >
                {evaluation.isPassed ? 'Entendido, ¡a por más!' : '🔄 Intentar mejorar el resumen'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyReview;
