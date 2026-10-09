import React, { useState, useRef, useEffect } from 'react';
import { mathService } from '../services/mathService';
import { MathAnalysis } from '../types/math';
import { Subject } from '../types';
import { srsService } from '../services/srsService';
import { WorksheetHub } from './worksheets/WorksheetHub';
import { Book } from '../types/study';
import { Child } from '../types';

interface MathModuleProps {
  userId: string;
  childId: string;
  childName: string;
  grade: string;
  onAwardPoints: (points: number) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
  books?: Book[];
  childrenList?: Child[];
}

interface SpeedProblem {
  num1: number;
  num2: number;
  operator: '+' | '-' | '×' | '÷';
  answer: number;
  options: number[];
}

export const MathModule: React.FC<MathModuleProps> = ({
  userId,
  childId,
  childName,
  grade,
  onAwardPoints,
  onActivityLog,
  books = [],
  childrenList = []
}) => {
  const [activeTab, setActiveTab] = useState<'speed' | 'canvas' | 'photo' | 'worksheets'>('speed');

  // --- Photo & Analysis State ---
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MathAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Speed Math State ---
  const [speedGameActive, setSpeedGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [currentProblem, setCurrentProblem] = useState<SpeedProblem | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [feedbackEffect, setFeedbackEffect] = useState<'correct' | 'wrong' | null>(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<'all' | 'add_sub' | 'multi' | 'div'>('all');
  const timerRef = useRef<any>(null);

  // --- Canvas Scratchpad State ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#1e293b');
  const [penSize, setPenSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  // -------------------------------------------------------------
  // Speed Math Generator
  // -------------------------------------------------------------
  const generateProblem = (): SpeedProblem => {
    let op: '+' | '-' | '×' | '÷' = '+';
    if (selectedOperation === 'add_sub') {
      op = Math.random() > 0.5 ? '+' : '-';
    } else if (selectedOperation === 'multi') {
      op = '×';
    } else if (selectedOperation === 'div') {
      op = '÷';
    } else {
      const ops: ('+' | '-' | '×' | '÷')[] = ['+', '-', '×', '÷'];
      // If lower grade, stick to + and -
      if (grade.includes('1') || grade.includes('2')) {
        op = Math.random() > 0.4 ? '+' : '-';
      } else {
        op = ops[Math.floor(Math.random() * ops.length)];
      }
    }

    let n1 = 0;
    let n2 = 0;
    let ans = 0;

    if (op === '+') {
      const max = grade.includes('1') || grade.includes('2') ? 20 : 100;
      n1 = Math.floor(Math.random() * (max - 2)) + 2;
      n2 = Math.floor(Math.random() * (max - n1)) + 1;
      ans = n1 + n2;
    } else if (op === '-') {
      const max = grade.includes('1') || grade.includes('2') ? 20 : 100;
      n1 = Math.floor(Math.random() * max) + 5;
      n2 = Math.floor(Math.random() * n1) + 1;
      ans = n1 - n2;
    } else if (op === '×') {
      n1 = Math.floor(Math.random() * 9) + 2;
      n2 = Math.floor(Math.random() * 9) + 2;
      ans = n1 * n2;
    } else {
      // Division exact
      n2 = Math.floor(Math.random() * 8) + 2;
      ans = Math.floor(Math.random() * 10) + 1;
      n1 = n2 * ans;
    }

    // Generate 3 distractors
    const optionsSet = new Set<number>([ans]);
    while (optionsSet.size < 4) {
      const offset = (Math.floor(Math.random() * 6) + 1) * (Math.random() > 0.5 ? 1 : -1);
      const wrong = Math.max(0, ans + offset);
      optionsSet.add(wrong);
    }
    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return { num1: n1, num2: n2, operator: op, answer: ans, options };
  };

  const startSpeedGame = () => {
    setScore(0);
    setStreak(0);
    setHighestStreak(0);
    setTimeLeft(45);
    setGameFinished(false);
    setSpeedGameActive(true);
    setCurrentProblem(generateProblem());

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishSpeedGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishSpeedGame = () => {
    setSpeedGameActive(false);
    setGameFinished(true);
  };

  useEffect(() => {
    if (gameFinished) {
      // Award XP based on score and combo
      const earnedXP = Math.max(5, score * 3 + highestStreak * 2);
      onAwardPoints(earnedXP);

      if (onActivityLog) {
        onActivityLog("Reto de Cálculo Mental", "Matemáticas", {
          text: `Completado reto de cálculo mental con ${score} aciertos y racha de ${highestStreak} seguidos.`,
          type: 'math_speed_challenge',
          score,
          highestStreak,
          earnedXP
        });
      }
    }
  }, [gameFinished]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSpeedAnswer = (selected: number) => {
    if (!currentProblem || !speedGameActive) return;

    if (selected === currentProblem.answer) {
      setFeedbackEffect('correct');
      setScore(s => s + 1);
      setStreak(st => {
        const next = st + 1;
        if (next > highestStreak) setHighestStreak(next);
        return next;
      });
    } else {
      setFeedbackEffect('wrong');
      setStreak(0);
    }

    setTimeout(() => {
      setFeedbackEffect(null);
      setCurrentProblem(generateProblem());
    }, 300);
  };

  // -------------------------------------------------------------
  // Canvas Scratchpad Logic
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'canvas' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High DPI support
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
    }
  }, [activeTab]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.strokeStyle = isEraser ? '#ffffff' : penColor;
    ctx.lineWidth = isEraser ? penSize * 3 : penSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const analyzeCanvasWithAI = () => {
    if (!canvasRef.current) return;
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setImage(base64);
    setActiveTab('photo');
    handleDirectAnalyze(base64);
  };

  // -------------------------------------------------------------
  // Photo AI Analysis
  // -------------------------------------------------------------
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

  const handleDirectAnalyze = async (imgData: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mathService.analyzeMathProblem(imgData, grade);
      setAnalysis(result);

      const sessionData = {
        id: crypto.randomUUID(),
        userId,
        childId,
        imageUrl: imgData,
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
        console.error("Error guardando sesión de matemáticas:", e);
      }

      if (onActivityLog) {
        onActivityLog("Análisis Matemático", "Matemáticas", {
          text: result.generalFeedback,
          type: 'math_analysis',
          score: result.score,
          image: imgData
        });
      }

      if (result.score >= 7) {
        onAwardPoints(20);
      } else {
        onAwardPoints(10);
        await srsService.scheduleReviews(childId, result.topic || "Matemáticas", "Matemáticas", sessionData.id);
      }
    } catch (err) {
      setError('No pudimos analizar la imagen. Asegúrate de que los números sean legibles e inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-red-500 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="bg-white/20 backdrop-blur text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              Taller de Matemáticas J21
            </span>
            <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              🔢 ¡Hola {childName}!
            </h2>
            <p className="opacity-90 text-sm font-medium mt-1">
              Practica cálculo mental contra reloj, haz cuentas en la pizarra táctil o pide a la IA que revise tu cuaderno.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="bg-black/20 p-1.5 rounded-2xl flex gap-1 self-start sm:self-center border border-white/10">
            <button
              onClick={() => setActiveTab('speed')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'speed' ? 'bg-white text-orange-600 shadow-md' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              ⚡ Reto Rápido
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'canvas' ? 'bg-white text-orange-600 shadow-md' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              🎨 Pizarra Táctil
            </button>
            <button
              onClick={() => setActiveTab('photo')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'photo' ? 'bg-white text-orange-600 shadow-md' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              📸 Foto Cuaderno
            </button>
            <button
              onClick={() => setActiveTab('worksheets')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'worksheets' ? 'bg-white text-orange-600 shadow-md' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              📄 Hojas en Papel A4
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: SPEED MATH ARCADE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'speed' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-orange-50 space-y-6">
          {!speedGameActive && !gameFinished && (
            <div className="text-center py-8 max-w-lg mx-auto space-y-6">
              <div className="w-24 h-24 bg-orange-100 rounded-3xl mx-auto flex items-center justify-center text-5xl shadow-inner animate-bounce">
                ⏱️
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">Reto de Cálculo Mental</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Resuelve tantas operaciones como puedas en 45 segundos. ¡Mantén la racha para conseguir combos de puntos!
                </p>
              </div>

              {/* Operations selector */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOperation('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedOperation === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600'
                  }`}
                >
                  Todas las Operaciones
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOperation('add_sub')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedOperation === 'add_sub' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600'
                  }`}
                >
                  Sumas y Restas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOperation('multi')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedOperation === 'multi' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600'
                  }`}
                >
                  Tablas de Multiplicar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOperation('div')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedOperation === 'div' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600'
                  }`}
                >
                  Divisiones
                </button>
              </div>

              <button
                onClick={startSpeedGame}
                className="w-full py-4 rounded-2xl bg-orange-600 text-white text-lg font-black shadow-xl hover:bg-orange-500 transition-all transform active:scale-95"
              >
                🚀 ¡Empezar Reto (45s)!
              </button>
            </div>
          )}

          {speedGameActive && currentProblem && (
            <div className="space-y-6">
              {/* Status Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 block">Tiempo</span>
                  <span className={`text-2xl font-black ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
                    ⏳ {timeLeft}s
                  </span>
                </div>

                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Aciertos</span>
                  <span className="text-2xl font-black text-emerald-700">🎯 {score}</span>
                </div>

                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Racha Combo</span>
                  <span className="text-2xl font-black text-amber-700">
                    🔥 x{streak}
                  </span>
                </div>
              </div>

              {/* Problem Display */}
              <div className={`p-10 rounded-3xl border-2 text-center transition-all ${
                feedbackEffect === 'correct' 
                  ? 'bg-emerald-50 border-emerald-300 scale-105' 
                  : feedbackEffect === 'wrong' 
                  ? 'bg-rose-50 border-rose-300 scale-95' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-5xl sm:text-7xl font-black text-slate-800 tracking-wider">
                  {currentProblem.num1} {currentProblem.operator} {currentProblem.num2} = ?
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-4">
                {currentProblem.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSpeedAnswer(opt)}
                    className="py-5 sm:py-6 rounded-2xl bg-white border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 text-2xl sm:text-3xl font-black text-slate-800 shadow-md transition-all transform active:scale-95"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameFinished && (
            <div className="text-center py-8 space-y-6 animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-amber-100 rounded-full mx-auto flex items-center justify-center text-5xl shadow-lg">
                🏆
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-800">¡Reto Completado!</h3>
                <p className="text-slate-500 text-sm mt-1">Has demostrado gran velocidad mental.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block">Aciertos Totales</span>
                  <span className="text-2xl font-black text-slate-800">{score}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 block">Mejor Racha</span>
                  <span className="text-2xl font-black text-amber-600">🔥 {highestStreak}</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 col-span-2 sm:col-span-1">
                  <span className="text-xs font-bold text-emerald-600 block">Puntos Ganados</span>
                  <span className="text-2xl font-black text-emerald-700">+{Math.max(5, score * 3 + highestStreak * 2)} XP</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={startSpeedGame}
                  className="px-8 py-3 rounded-xl bg-orange-600 text-white font-black hover:bg-orange-500 shadow-lg transition-all"
                >
                  🔄 Jugar Otra Vez
                </button>
                <button
                  onClick={() => setActiveTab('canvas')}
                  className="px-8 py-3 rounded-xl bg-slate-100 text-slate-700 font-black hover:bg-slate-200 transition-all"
                >
                  ✏️ Ir a la Pizarra
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CANVAS SCRATCHPAD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'canvas' && (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-orange-50 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                🎨 Pizarra Táctil Libre
              </h3>
              <p className="text-xs text-slate-500">Usa tu dedo, lápiz o ratón para hacer cálculos intermedios o resolver cuentas.</p>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Color picker */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {['#1e293b', '#2563eb', '#dc2626', '#16a34a'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setPenColor(c); setIsEraser(false); }}
                    className={`w-6 h-6 rounded-lg transition-transform ${penColor === c && !isEraser ? 'scale-125 ring-2 ring-orange-500' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Eraser Toggle */}
              <button
                type="button"
                onClick={() => setIsEraser(!isEraser)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isEraser ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                🧹 Goma
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-rose-600 border border-slate-200 hover:bg-rose-50 transition-all"
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="relative border-2 border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-white touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[360px] sm:h-[450px] cursor-crosshair block"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <span className="text-xs text-slate-500 font-medium">
              💡 Puedes escribir aquí tus operaciones y pulsar el botón para que Gemini las revise.
            </span>
            <button
              onClick={analyzeCanvasWithAI}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-600 text-white font-black text-sm shadow-md hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
            >
              <span>✨ Analizar esta Pizarra con IA</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PHOTO ANALYZER (Cuaderno Físico) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'photo' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-orange-50 space-y-6">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-orange-100 rounded-[2rem] p-12 sm:p-16 text-center hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer group"
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📸</div>
              <h3 className="text-xl font-bold text-orange-900">Sube una foto de tu operación</h3>
              <p className="text-orange-400 mt-2 text-sm">Pulsa aquí para usar la cámara o elegir una foto de tu libreta</p>
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
              <div className="relative rounded-[2rem] overflow-hidden shadow-lg border-4 border-white aspect-video bg-slate-100 max-h-[350px] mx-auto">
                <img src={image} alt="Operación" className="w-full h-full object-contain" />
                <button 
                  onClick={() => { setImage(null); setAnalysis(null); }}
                  className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all"
                  title="Eliminar imagen"
                >
                  ✕
                </button>
              </div>

              {!analysis && (
                <button
                  onClick={() => handleDirectAnalyze(image)}
                  disabled={loading}
                  className={`w-full py-4 rounded-2xl font-black text-white text-base sm:text-lg shadow-xl transition-all active:scale-95 ${
                    loading ? 'bg-slate-400' : 'bg-orange-600 hover:bg-orange-500'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analizando con IA Multimodal...
                    </span>
                  ) : '🔍 Analizar Operación'}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-sm">
              {error}
            </div>
          )}

          {analysis && (
            <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-orange-50 p-6 rounded-[2rem] text-center border border-orange-100">
                  <div className="text-4xl font-black text-orange-600 mb-1">{analysis.score}/10</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-orange-400">Puntuación</div>
                </div>
                <div className="md:col-span-2 bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                  <h4 className="font-black text-amber-900 mb-1">✨ Feedback de la IA</h4>
                  <p className="text-amber-800 italic text-sm leading-relaxed">"{analysis.generalFeedback}"</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                  <span className="w-2 h-5 bg-orange-500 rounded-full"></span>
                  Análisis Paso a Paso
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.steps.map((step, i) => (
                    <div key={i} className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                      step.isCorrect ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paso {step.stepNumber}</span>
                        <span className={`text-xs font-bold ${step.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {step.isCorrect ? '✅ Correcto' : '❌ Error'}
                        </span>
                      </div>
                      <h5 className="font-black text-slate-800 text-sm mb-1">{step.description}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errors if any */}
              {analysis.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-2 h-5 bg-rose-500 rounded-full"></span>
                    Errores Detectados
                  </h4>
                  <div className="space-y-3">
                    {analysis.errors.map((err, i) => (
                      <div key={i} className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                            {err.errorType}
                          </span>
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">En: {err.location}</span>
                        </div>
                        <p className="text-xs text-rose-900 font-medium mb-2">{err.explanation}</p>
                        <div className="bg-white/70 p-2.5 rounded-xl border border-rose-200">
                          <span className="text-[10px] font-black text-emerald-600 uppercase">Corrección:</span>
                          <p className="text-xs text-emerald-800 font-bold">{err.correction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PRINTABLE WORKSHEETS & SCANNER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'worksheets' && (
        <div className="animate-in fade-in duration-300">
          <WorksheetHub
            childrenList={childrenList.length > 0 ? childrenList : [{ id: childId, name: childName, grade: grade as any, points: 0, streak: { current: 0, lastActive: 0, multiplier: 1 }, avatar: '👦', badges: [] }]}
            books={books}
            userRole="student"
            activeChildId={childId}
            onAwardPoints={(_cId, pts) => onAwardPoints(pts)}
          />
        </div>
      )}
    </div>
  );
};

export default MathModule;
