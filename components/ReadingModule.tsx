
import React, { useState, useRef, useEffect } from 'react';
import { readingService } from '../services/readingService';
import { ReadingAnalysis, ReadingSession } from '../types/reading';
import { Subject } from '../types';
import { srsService } from '../services/srsService';

interface ReadingModuleProps {
  userId: string;
  childId: string;
  childName: string;
  grade: string;
  onAwardPoints: (points: number) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const ReadingModule: React.FC<ReadingModuleProps> = ({ userId, childId, childName, grade, onAwardPoints, onActivityLog }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ReadingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textToRead, setTextToRead] = useState("El pequeño conejo blanco saltaba por el bosque verde. De repente, encontró una zanahoria gigante y se puso muy feliz.");
  const [duration, setDuration] = useState<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("No se pudo acceder al micrófono. Por favor, asegúrate de dar permisos.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      if (startTimeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const result = await readingService.analyzeReading(base64Audio, textToRead, grade);
        setAnalysis(result);
        
        // Save to reading history
        const sessionData = {
          id: crypto.randomUUID(),
          userId,
          childId,
          audioUrl: audioUrl,
          score: result.score,
          analysis: result,
          timestamp: Date.now(),
          duration: duration,
          transcription: result.transcription
        };

        try {
          await fetch(`api_study.php?action=save_reading_session&userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
          });
        } catch (e) {
          console.error("Error guardando sesión de lectura en el servidor:", e);
        }

        // Log activity for parent monitoring
        if (onActivityLog) {
          onActivityLog(`Taller de Lectura: ${textToRead.substring(0, 30)}...`, "Lengua", {
            text: result.generalFeedback,
            type: 'reading_analysis',
            score: result.score,
            audio: audioUrl,
            duration: duration,
            transcription: result.transcription
          });
        }

        // Award points based on score
        if (result.score >= 7) {
          onAwardPoints(20);
        } else {
          onAwardPoints(10);
          // SRS: Schedule review for failed reading
          await srsService.scheduleReviews(childId, `Lectura: ${textToRead.substring(0, 20)}...`, "Lengua", sessionData.id);
        }
      };
    } catch (err) {
      setError("Error al analizar la lectura. Inténtalo de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-emerald-50">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
          <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
            📖 Taller de Lectura
          </h2>
          <p className="opacity-90 font-medium">¡Hola {childName}! Lee el texto en voz alta para que la IA te ayude a mejorar.</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="bg-emerald-50 p-8 rounded-[2rem] border-2 border-emerald-100 relative">
            <div className="absolute -top-4 left-8 bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Texto para leer
            </div>
            <p className="text-xl font-serif leading-relaxed text-emerald-900 italic">
              "{textToRead}"
            </p>
            <button 
              onClick={() => setTextToRead("Había una vez un dragón que no echaba fuego, sino burbujas de jabón. Todos los niños del reino querían jugar con él.")}
              className="mt-4 text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
            >
              🔄 Cambiar texto
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            {!audioUrl ? (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all active:scale-95 ${
                  isRecording ? 'bg-rose-500 animate-pulse text-white' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>
            ) : (
              <div className="w-full space-y-4">
                <audio src={audioUrl} controls className="w-full" />
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setAudioUrl(null); setAudioBlob(null); setAnalysis(null); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    🔄 Repetir
                  </button>
                  {!analysis && (
                    <button 
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-500 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Analizando...' : '🔍 Analizar Lectura'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {isRecording && <p className="text-rose-500 font-black text-xs animate-pulse">GRABANDO... ¡LEE EL TEXTO!</p>}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold">
              {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 p-6 rounded-[2rem] text-center">
                  <div className="text-4xl font-black text-emerald-600 mb-1">{analysis.score}/10</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Puntuación</div>
                </div>
                <div className="md:col-span-2 bg-teal-50 p-6 rounded-[2rem]">
                  <h4 className="font-black text-teal-900 mb-2">✨ Feedback de la IA</h4>
                  <p className="text-teal-800 italic leading-relaxed">"{analysis.generalFeedback}"</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                    Análisis de Fluidez
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-emerald-500 uppercase">Fluidez</span>
                      <p className="text-sm text-slate-700 font-medium">{analysis.fluency}</p>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-teal-500 uppercase">Entonación</span>
                      <p className="text-sm text-slate-700 font-medium">{analysis.intonation}</p>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-cyan-500 uppercase">Precisión</span>
                      <p className="text-sm text-slate-700 font-medium">{analysis.accuracy}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                    Comprensión Lectora
                  </h4>
                  <div className="bg-amber-50 p-6 rounded-[2rem]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-2xl font-black text-amber-600">{analysis.comprehensionScore}/10</div>
                      <div className="h-2 flex-1 bg-amber-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${analysis.comprehensionScore * 10}%` }}></div>
                      </div>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed italic">{analysis.comprehensionFeedback}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                  Ejercicios Recomendados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.suggestedExercises.map((ex, i) => (
                    <div key={i} className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] hover:border-emerald-200 transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-600">
                          {ex.difficulty}
                        </span>
                      </div>
                      <h5 className="font-black text-slate-800 mb-1">{ex.title}</h5>
                      <p className="text-xs text-slate-500 leading-relaxed">{ex.description}</p>
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

export default ReadingModule;
