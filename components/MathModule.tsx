
import React, { useState, useRef } from 'react';
import { mathService } from '../services/mathService';
import { MathAnalysis, MathSession } from '../types/math';
import { Subject } from '../types';
import { srsService } from '../services/srsService';

interface MathModuleProps {
  userId: string;
  childId: string;
  childName: string;
  grade: string;
  onAwardPoints: (points: number) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const MathModule: React.FC<MathModuleProps> = ({ userId, childId, childName, grade, onAwardPoints, onActivityLog }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MathAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const result = await mathService.analyzeMathProblem(image, grade);
      setAnalysis(result);
      
      // Save to math history
      const sessionData = {
        id: crypto.randomUUID(),
        userId,
        childId,
        imageUrl: image,
        score: result.score,
        analysis: result,
        timestamp: Date.now()
      };

      try {
        await fetch(`api_study.php?action=save_math_session&userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        });
      } catch (e) {
        console.error("Error guardando sesión de matemáticas en el servidor:", e);
      }

      // Log activity for parent monitoring
      if (onActivityLog) {
        onActivityLog("Análisis Matemático", "Matemáticas", {
          text: result.generalFeedback,
          type: 'math_analysis',
          score: result.score,
          image: image
        });
      }

      if (result.score >= 7) {
        onAwardPoints(20);
      } else {
        onAwardPoints(10);
        // SRS: Schedule review for failed topic
        await srsService.scheduleReviews(childId, result.topic || "Matemáticas", "Matemáticas", sessionData.id);
      }
    } catch (err) {
      setError('No pudimos analizar la imagen. Asegúrate de que sea clara e inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-orange-50">
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-8 text-white">
          <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
            🔢 Matemáticas Visuales
          </h2>
          <p className="opacity-90 font-medium">¡Hola {childName}! Haz una foto a tu operación matemática para que la IA te explique cómo mejorar.</p>
        </div>

        <div className="p-8 space-y-8">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-orange-100 rounded-[2rem] p-16 text-center hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer group"
            >
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">📸</div>
              <h3 className="text-xl font-bold text-orange-900">Sube una foto de tu operación</h3>
              <p className="text-orange-400 mt-2">Pulsa aquí para usar la cámara o elegir una foto</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative rounded-[2rem] overflow-hidden shadow-lg border-4 border-white aspect-video bg-slate-100">
                <img src={image} alt="Operación" className="w-full h-full object-contain" />
                <button 
                  onClick={() => { setImage(null); setAnalysis(null); }}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all"
                >
                  ✕
                </button>
              </div>

              {!analysis && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className={`w-full py-5 rounded-2xl font-black text-white text-lg shadow-xl transition-all active:scale-95 ${
                    loading ? 'bg-slate-400' : 'bg-orange-600 hover:bg-orange-500'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analizando operación...
                    </span>
                  ) : '🔍 Analizar Operación'}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold">
              {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-orange-50 p-6 rounded-[2rem] text-center">
                  <div className="text-4xl font-black text-orange-600 mb-1">{analysis.score}/10</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-orange-400">Puntuación</div>
                </div>
                <div className="md:col-span-2 bg-amber-50 p-6 rounded-[2rem]">
                  <h4 className="font-black text-amber-900 mb-2">✨ Feedback de la IA</h4>
                  <p className="text-amber-800 italic leading-relaxed">"{analysis.generalFeedback}"</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                  Análisis Paso a Paso
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.steps.map((step, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border-2 transition-all shadow-sm ${
                      step.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paso {step.stepNumber}</span>
                        <span className={step.isCorrect ? 'text-emerald-500' : 'text-rose-500'}>
                          {step.isCorrect ? '✅ Correcto' : '❌ Error'}
                        </span>
                      </div>
                      <h5 className="font-black text-slate-800 mb-1">{step.description}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.errors.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
                    Errores Detectados
                  </h4>
                  <div className="space-y-3">
                    {analysis.errors.map((err, i) => (
                      <div key={i} className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                            {err.errorType}
                          </span>
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">En: {err.location}</span>
                        </div>
                        <p className="text-sm text-rose-900 font-medium mb-2">{err.explanation}</p>
                        <div className="bg-white/50 p-3 rounded-xl border border-rose-200">
                          <span className="text-[10px] font-black text-emerald-600 uppercase">Corrección:</span>
                          <p className="text-xs text-emerald-800 font-bold">{err.correction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                  Ejercicios Similares para Practicar
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.suggestedExercises.map((ex, i) => (
                    <div key={i} className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] hover:border-orange-200 transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                          {ex.difficulty}
                        </span>
                      </div>
                      <h5 className="font-black text-slate-800 mb-1">{ex.title}</h5>
                      <p className="text-sm font-black text-orange-600 mb-2">{ex.problem}</p>
                      {ex.solution && (
                        <details className="text-[10px] text-slate-400 cursor-pointer">
                          <summary className="hover:text-slate-600">Ver solución</summary>
                          <p className="mt-2 p-2 bg-slate-50 rounded-lg">{ex.solution}</p>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MathModule;
