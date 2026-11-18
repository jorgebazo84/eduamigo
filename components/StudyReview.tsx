import React, { useState } from 'react';
import { reviewService, ExplainFeedback } from '../services/reviewService';
import { StudyTask, EvaluationResponse } from '../types/study';

interface StudyReviewProps {
  task: StudyTask;
  bookTitle: string;
  bookSubject?: string;
  childId: string;
  grade: string;
  onComplete: (evaluation: EvaluationResponse, summary: string) => void;
  onClose: () => void;
}

// El niño explica el tema con sus palabras y el tutor (Claude, en el servidor) le comenta el contenido.
// Solo se valora lo que ha entendido: ni la letra ni la persona.
const StudyReview: React.FC<StudyReviewProps> = ({ task, bookTitle, bookSubject, childId, onComplete, onClose }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [feedback, setFeedback] = useState<ExplainFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (summary.trim().length < 20) {
      setError('¡Escribe un poquito más! Cuéntame con más detalle lo que has aprendido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const f = await reviewService.explain({ childId, subject: bookSubject, topic: task.topicTitle, text: summary });
      const result: EvaluationResponse = {
        score: 0,
        feedbackChild: [f.praise, f.tip].filter(Boolean).join(' '),
        feedbackParent: f.missing ? `Le falta o confunde: ${f.missing}` : 'Ha explicado lo esencial del tema.',
        conceptsMissed: f.missing ? [f.missing] : [],
        isPassed: f.understood,
      };
      setFeedback(f);
      setEvaluation(result);
      if (result.isPassed) onComplete(result, summary);
    } catch (err: any) {
      setError(err?.message || 'Hubo un problema al conectar con el tutor. Inténtalo de nuevo.');
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

              {error && <p role="alert" className="text-sm font-bold text-rose-600">{error}</p>}

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
              </div>

              <div className="bg-white p-6 rounded-2xl border-2 border-ewola/20 shadow-sm">
                {feedback?.praise && <p className="text-slate-700 leading-relaxed">🌟 {feedback.praise}</p>}
                {feedback?.missing && <p className="text-amber-800 leading-relaxed mt-2">🔎 {feedback.missing}</p>}
                {feedback?.tip && <p className="text-sky-800 leading-relaxed mt-2">💡 {feedback.tip}</p>}
              </div>

              {!evaluation.isPassed && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-orange-800 text-sm">
                    ⚠️ Aún faltan algunos detalles importantes. ¡Vuelve a leer el tema y añade lo que falta para ganar tus puntos!
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
