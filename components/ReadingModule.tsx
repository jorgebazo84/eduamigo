import React, { useState, useRef, useEffect } from 'react';
import { readingService } from '../services/readingService';
import { ReadingAnalysis } from '../types/reading';
import { Subject } from '../types';
import { srsService } from '../services/srsService';
import { offlineStorageService } from '../services/offlineStorageService';

interface ReadingModuleProps {
  userId: string;
  childId: string;
  childName: string;
  grade: string;
  onAwardPoints: (points: number) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const SAMPLE_TEXTS: { [key: string]: { title: string; text: string; level: string }[] } = {
  primaria_baja: [
    {
      title: "El conejo saltarín",
      text: "El pequeño conejo blanco saltaba por el bosque verde. De repente, encontró una zanahoria gigante y se puso muy feliz.",
      level: "1º - 2º Primaria"
    },
    {
      title: "El dragón de burbujas",
      text: "Había una vez un dragón que no echaba fuego, sino burbujas de jabón de muchos colores. Todos los niños del reino querían jugar con él.",
      level: "1º - 2º Primaria"
    }
  ],
  primaria_media: [
    {
      title: "El misterio del faro",
      text: "Al anochecer, la luz dorada del faro comenzó a girar sobre las olas del mar. Un delfín curioso saltó saludando a los marineros que regresaban al puerto.",
      level: "3º - 4º Primaria"
    },
    {
      title: "La abeja exploradora",
      text: "Maya era una abeja muy trabajadora que buscaba las flores silvestres más dulces en lo alto de la colina para llevar néctar a su colmena.",
      level: "3º - 4º Primaria"
    }
  ],
  primaria_alta: [
    {
      title: "Viaje al espacio",
      text: "Los astronautas miraban la Tierra desde la cúpula de la nave espacial. Nuestro planeta brillaba como una canica azul y blanca suspendida en el silencio del cosmos.",
      level: "5º - 6º Primaria"
    },
    {
      title: "El reloj de sol romano",
      text: "Hace dos mil años, los antiguos romanos utilizaban la sombra proyectada por el sol para medir las horas del día en las plazas públicas.",
      level: "5º - 6º Primaria"
    }
  ]
};

const ReadingModule: React.FC<ReadingModuleProps> = ({
  userId,
  childId,
  childName,
  grade,
  onAwardPoints,
  onActivityLog
}) => {
  const [textToRead, setTextToRead] = useState<string>(SAMPLE_TEXTS.primaria_baja[0].text);
  const [selectedCategory, setSelectedCategory] = useState<string>("primaria_baja");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<ReadingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlayingModel, setIsPlayingModel] = useState<boolean>(false);

  // Live Speech Recognition & Fluency Metrics
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [recognizedWords, setRecognizedWords] = useState<Set<number>>(new Set());
  const [liveWPM, setLiveWPM] = useState<number>(0);
  const [pauseDetected, setPauseDetected] = useState<boolean>(false);
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState<boolean>(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const speechRecognizerRef = useRef<any>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const pauseTimerRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Check speech recognition support
  useEffect(() => {
    const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setHasSpeechRecognition(!!SpeechClass);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Split target text into words for live alignment
  const targetWords = textToRead.split(/\s+/).filter(Boolean);

  const normalizeWord = (w: string) =>
    w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡!]/g, "").trim();

  // Read text with browser Text-To-Speech as a model
  const handlePlayModelReading = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingModel) {
      window.speechSynthesis.cancel();
      setIsPlayingModel(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'es-ES';
    utterance.rate = 0.88; // slightly slower for instructional clarity
    utterance.onend = () => setIsPlayingModel(false);
    utterance.onerror = () => setIsPlayingModel(false);
    setIsPlayingModel(true);
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      const now = Date.now();
      startTimeRef.current = now;
      lastSpeechTimeRef.current = now;
      setDuration(0);
      setLiveTranscript("");
      setRecognizedWords(new Set());
      setLiveWPM(0);
      setPauseDetected(false);
      setError(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Duration & WPM ticker
      timerIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsedSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
          setDuration(elapsedSec);
        }
      }, 500);

      // Initialize live speech recognition if supported
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechClass) {
        try {
          const recognizer = new SpeechClass();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = 'es-ES';

          recognizer.onresult = (event: any) => {
            lastSpeechTimeRef.current = Date.now();
            setPauseDetected(false);

            let currentTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript + ' ';
            }
            setLiveTranscript(currentTranscript.trim());

            // Match words against target text
            const spokenTokens = currentTranscript.toLowerCase().split(/\s+/).map(normalizeWord);
            const matched = new Set<number>();
            let lastFoundIdx = -1;

            spokenTokens.forEach((token) => {
              for (let i = lastFoundIdx + 1; i < targetWords.length; i++) {
                if (normalizeWord(targetWords[i]) === token) {
                  matched.add(i);
                  lastFoundIdx = i;
                  break;
                }
              }
            });

            setRecognizedWords(matched);

            // Calculate live Words Per Minute (WPM)
            if (startTimeRef.current) {
              const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
              if (elapsedMinutes > 0.05) {
                const wpm = Math.round(matched.size / elapsedMinutes);
                setLiveWPM(wpm);
              }
            }
          };

          recognizer.onerror = (err: any) => {
            console.warn('[SpeechRecognition] Live tracking non-critical warning:', err.error);
          };

          recognizer.start();
          speechRecognizerRef.current = recognizer;

          // Pause detector: detect if silence exceeds 3.5s
          pauseTimerRef.current = setInterval(() => {
            if (isRecording && Date.now() - lastSpeechTimeRef.current > 3500) {
              setPauseDetected(true);
            }
          }, 1000);
        } catch (recErr) {
          console.warn('Native speech recognition could not start:', recErr);
        }
      }
    } catch (err) {
      setError("No se pudo acceder al micrófono. Por favor, asegúrate de dar permisos.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);

    if (speechRecognizerRef.current) {
      try {
        speechRecognizerRef.current.stop();
      } catch {}
      speechRecognizerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      if (startTimeRef.current) {
        setDuration(Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000)));
      }
    }
  };

  const handleAnalyze = async () => {
    if (!audioBlob && recognizedWords.size === 0) return;
    setLoading(true);
    setError(null);

    const isOnline = offlineStorageService.getOnlineStatus();
    const coveragePercent = Math.round((recognizedWords.size / Math.max(1, targetWords.length)) * 100);

    try {
      let result: ReadingAnalysis;

      if (!isOnline || !audioBlob) {
        // Offline / Local Evaluation Mode
        const localScore = Math.min(10, Math.max(4, Math.round(coveragePercent / 10)));
        result = {
          score: localScore,
          fluency: liveWPM > 0 ? `Ritmo de ${liveWPM} palabras por minuto. Buena continuidad.` : 'Lectura pausada y cuidadosa.',
          intonation: 'Entonación adecuada con pausas reflexivas.',
          accuracy: `Has leído correctamente el ${coveragePercent}% del texto.`,
          comprehensionScore: localScore,
          comprehensionFeedback: `Demuestras buena atención a las palabras del texto. ¡Sigue así!`,
          generalFeedback: `¡Gran trabajo, ${childName}! Has completado la lectura en modo autónomo (${liveWPM || 45} PPM).`,
          transcription: liveTranscript || textToRead,
          suggestedExercises: [
            {
              title: "Lectura en eco",
              description: "Vuelve a escuchar el modelo y lee justo después a la misma velocidad.",
              text: textToRead,
              difficulty: "fácil"
            },
            {
              title: "Desafío de rapidez",
              description: "Intenta leer el mismo párrafo mejorando tu tiempo en 5 segundos.",
              text: textToRead,
              difficulty: "medio"
            }
          ]
        };
      } else {
        // Online Gemini multimodal audio evaluation
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string).split(',')[1];
            resolve(res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });

        result = await readingService.analyzeReading(base64Audio, textToRead, grade);
      }

      setAnalysis(result);

      // Prepare session payload
      const sessionId = crypto.randomUUID();
      const sessionData = {
        id: sessionId,
        userId,
        childId,
        audioUrl: audioUrl,
        score: result.score,
        analysis: result,
        timestamp: Date.now(),
        duration: duration || 10,
        transcription: result.transcription || liveTranscript
      };

      // Save to server or queue if offline
      if (isOnline) {
        try {
          await fetch(`api_study.php?action=save_reading_session&userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
          });
        } catch (e) {
          console.warn('Error guardando en servidor, guardando en cola local:', e);
          offlineStorageService.queueActivity('reading_session', `api_study.php?action=save_reading_session&userId=${userId}`, sessionData);
        }
      } else {
        offlineStorageService.queueActivity('reading_session', `api_study.php?action=save_reading_session&userId=${userId}`, sessionData);
      }

      // Log for parent review
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

      // Award points & SRS review
      if (result.score >= 7) {
        onAwardPoints(25);
      } else {
        onAwardPoints(15);
        await srsService.scheduleReviews(childId, `Lectura: ${textToRead.substring(0, 20)}...`, "Lengua", sessionId);
      }
    } catch (err) {
      console.error('Error analizando lectura:', err);
      setError("No se pudo completar el análisis completo online. Se ha guardado tu lectura en el historial local.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = Math.round((recognizedWords.size / Math.max(1, targetWords.length)) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-emerald-50">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  V.1.1.0 • Live Voice Tracking
                </span>
              </div>
              <h2 className="text-3xl font-black mb-1 flex items-center gap-3">
                📖 Taller de Lectura Guiada
              </h2>
              <p className="opacity-90 font-medium text-sm">
                ¡Hola {childName}! Lee en voz alta. La aplicación detectará tu voz y ritmo en tiempo real.
              </p>
            </div>

            <button
              onClick={handlePlayModelReading}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md self-start md:self-auto ${
                isPlayingModel
                  ? 'bg-amber-400 text-amber-950 animate-pulse'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
              }`}
            >
              {isPlayingModel ? '⏹️ Detener audio' : '🔊 Escuchar Ejemplo'}
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Level & Text Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Nivel:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setSelectedCategory('primaria_baja');
                    setTextToRead(SAMPLE_TEXTS.primaria_baja[0].text);
                    setAnalysis(null);
                    setAudioUrl(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === 'primaria_baja' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  1º-2º Primaria
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('primaria_media');
                    setTextToRead(SAMPLE_TEXTS.primaria_media[0].text);
                    setAnalysis(null);
                    setAudioUrl(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === 'primaria_media' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  3º-4º Primaria
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('primaria_alta');
                    setTextToRead(SAMPLE_TEXTS.primaria_alta[0].text);
                    setAnalysis(null);
                    setAudioUrl(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === 'primaria_alta' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  5º-6º Primaria
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                const list = SAMPLE_TEXTS[selectedCategory] || SAMPLE_TEXTS.primaria_baja;
                const nextIdx = (list.findIndex((t) => t.text === textToRead) + 1) % list.length;
                setTextToRead(list[nextIdx].text);
                setAnalysis(null);
                setAudioUrl(null);
                setRecognizedWords(new Set());
              }}
              className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition"
            >
              🔄 Otro texto de este nivel
            </button>
          </div>

          {/* Interactive Live Reading Card */}
          <div className="bg-emerald-50/70 p-8 rounded-[2rem] border-2 border-emerald-100 relative">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Texto para leer
              </span>

              {isRecording && (
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                    ⏱️ {duration}s • {liveWPM} PPM
                  </span>
                  <span className="bg-teal-100 text-teal-800 text-[11px] font-black px-3 py-1 rounded-full">
                    {progressPercent}% completado
                  </span>
                </div>
              )}
            </div>

            {/* Live Word Highlighting */}
            <p className="text-2xl font-serif leading-loose text-slate-800">
              {targetWords.map((word, idx) => {
                const isRead = recognizedWords.has(idx);
                return (
                  <span
                    key={idx}
                    className={`inline-block px-1.5 py-0.5 rounded-lg transition-all duration-200 mr-1.5 mb-1 ${
                      isRead
                        ? 'bg-emerald-300/80 text-emerald-950 font-bold shadow-sm'
                        : isRecording
                        ? 'text-slate-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </p>

            {/* Pause gentle encouragement */}
            {pauseDetected && isRecording && (
              <div className="mt-4 p-3 bg-amber-100/90 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <span>🌟</span>
                <span>¡Vas fenomenal, {childName}! Respira hondo y continúa cuando quieras.</span>
              </div>
            )}
          </div>

          {/* Microphone & Recording Controls */}
          <div className="flex flex-col items-center gap-6">
            {!audioUrl ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  id="reading-record-toggle-btn"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all active:scale-95 ${
                    isRecording
                      ? 'bg-rose-500 animate-pulse text-white ring-8 ring-rose-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-emerald-200'
                  }`}
                  title={isRecording ? 'Pulsa para terminar de leer' : 'Pulsa para empezar a leer'}
                >
                  {isRecording ? '⏹️' : '🎤'}
                </button>
                <span className="text-xs font-black text-slate-600">
                  {isRecording ? 'GRABANDO Y ESCUCHANDO... ¡PULSA PARA PARAR!' : 'PULSA PARA EMPEZAR A LEER'}
                </span>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <audio src={audioUrl} controls className="w-full" />
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioBlob(null);
                      setAnalysis(null);
                      setRecognizedWords(new Set());
                      setLiveWPM(0);
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    🔄 Repetir Lectura
                  </button>
                  {!analysis && (
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-500 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Analizando con IA...' : '🔍 Analizar y Evaluar Lectura'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-xs">
              {error}
            </div>
          )}

          {/* Analysis Results Display */}
          {analysis && (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 pt-6 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-[2rem] text-center shadow-lg">
                  <div className="text-5xl font-black mb-1">{analysis.score}/10</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                    Puntuación Global
                  </div>
                  {liveWPM > 0 && (
                    <div className="mt-3 text-xs bg-white/20 py-1 px-3 rounded-full font-bold">
                      🚀 {liveWPM} Palabras / min
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 bg-teal-50/80 p-6 rounded-[2rem] border border-teal-100 flex flex-col justify-center">
                  <h4 className="font-black text-teal-950 mb-2 flex items-center gap-2">
                    <span>✨</span> Retroalimentación Pedagógica
                  </h4>
                  <p className="text-teal-900 italic leading-relaxed text-sm">
                    "{analysis.generalFeedback}"
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-emerald-500 rounded-full"></span>
                    Fluidez y Pronunciación
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-emerald-600 uppercase">Fluidez</span>
                      <p className="text-xs text-slate-700 font-medium mt-1">{analysis.fluency}</p>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-teal-600 uppercase">Entonación</span>
                      <p className="text-xs text-slate-700 font-medium mt-1">{analysis.intonation}</p>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                      <span className="text-[10px] font-black text-cyan-600 uppercase">Precisión</span>
                      <p className="text-xs text-slate-700 font-medium mt-1">{analysis.accuracy}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-amber-500 rounded-full"></span>
                    Comprensión del Texto
                  </h4>
                  <div className="bg-amber-50/80 p-6 rounded-[2rem] border border-amber-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-3xl font-black text-amber-600">
                        {analysis.comprehensionScore}/10
                      </div>
                      <div className="h-2.5 flex-1 bg-amber-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-1000"
                          style={{ width: `${analysis.comprehensionScore * 10}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed italic">
                      {analysis.comprehensionFeedback}
                    </p>
                  </div>
                </div>
              </div>

              {analysis.suggestedExercises && analysis.suggestedExercises.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-indigo-500 rounded-full"></span>
                    Retos Recomendados para la Próxima Vez
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.suggestedExercises.map((ex, i) => (
                      <div
                        key={i}
                        className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-emerald-200 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-black text-slate-800 text-sm">{ex.title}</h5>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            {ex.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{ex.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingModule;
