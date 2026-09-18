
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon, Timer, Coffee, Brain, Play, Pause, RotateCcw, X, Coins, ShieldCheck } from 'lucide-react';

interface PomodoroTimerProps {
  onAwardPoints: (points: number) => void;
  onClose: () => void;
}

type Mode = 'study' | 'shortBreak' | 'longBreak';

const MODES: Record<Mode, { label: string; duration: number; color: string; icon: LucideIcon }> = {
  study: { label: 'Estudio Profundo', duration: 25 * 60, color: 'bg-rose-600', icon: Brain },
  shortBreak: { label: 'Descanso Corto', duration: 5 * 60, color: 'bg-emerald-600', icon: Coffee },
  longBreak: { label: 'Descanso Largo', duration: 15 * 60, color: 'bg-blue-600', icon: Timer },
};

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onAwardPoints, onClose }) => {
  const [mode, setMode] = useState<Mode>('study');
  const [timeLeft, setTimeLeft] = useState(MODES.study.duration);
  const [isActive, setIsActive] = useState(false);
  const [isConcentrationMode, setIsConcentrationMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleComplete = () => {
    setIsActive(false);
    if (mode === 'study') {
      const points = isConcentrationMode ? 50 : 20;
      onAwardPoints(points);
      // Play a sound or notification here if possible
    }
    
    // Switch to break automatically
    if (mode === 'study') {
      setMode('shortBreak');
      setTimeLeft(MODES.shortBreak.duration);
    } else {
      setMode('study');
      setTimeLeft(MODES.study.duration);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].duration);
  };

  const changeMode = (newMode: Mode) => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(MODES[newMode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / MODES[mode].duration) * 100;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed inset-0 z-[500] flex items-center justify-center p-4 ${isConcentrationMode && isActive ? 'bg-slate-950/95 backdrop-blur-xl' : 'bg-slate-900/40 backdrop-blur-sm'}`}
      >
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 relative">
          {/* Header */}
          <div className={`${MODES[mode].color} p-8 text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-6">
              <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                {React.createElement(MODES[mode].icon, { size: 24, className: "animate-pulse" })}
                <span className="text-xs font-black uppercase tracking-widest opacity-80">{MODES[mode].label}</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight">Modo Pomodoro</h2>
            </div>

            {/* Background pattern */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="p-10 flex flex-col items-center">
            {/* Mode Selector */}
            <div className="flex gap-2 mb-10 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {(Object.keys(MODES) as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {m === 'study' ? 'Estudio' : m === 'shortBreak' ? 'Corto' : 'Largo'}
                </button>
              ))}
            </div>

            {/* Timer Display */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-10">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke={mode === 'study' ? '#e11d48' : mode === 'shortBreak' ? '#10b981' : '#2563eb'}
                  strokeWidth="12"
                  strokeDasharray="754"
                  animate={{ strokeDashoffset: 754 - (754 * progress) / 100 }}
                  transition={{ duration: 1, ease: "linear" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black text-slate-900 tabular-nums tracking-tighter">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Restante</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mb-10">
              <button 
                onClick={resetTimer}
                className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <RotateCcw size={20} />
              </button>
              
              <button 
                onClick={toggleTimer}
                className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all ${MODES[mode].color}`}
              >
                {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>

              <div className="w-12 h-12" /> {/* Spacer */}
            </div>

            {/* Concentration Mode Toggle */}
            <button 
              onClick={() => setIsConcentrationMode(!isConcentrationMode)}
              className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${
                isConcentrationMode 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  isConcentrationMode ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300'
                }`}>
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">Modo Concentración</p>
                  <p className="text-[10px] font-bold opacity-60 uppercase">Bloquea distracciones y duplica monedas</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors ${isConcentrationMode ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <motion.div 
                  animate={{ x: isConcentrationMode ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
            </button>

            {/* Rewards Info */}
            <div className="mt-8 flex items-center gap-2 px-6 py-3 bg-amber-50 rounded-2xl border border-amber-100">
              <Coins size={16} className="text-amber-600" />
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider">
                Recompensa: {isConcentrationMode ? '50' : '20'} Monedas por sesión
              </span>
            </div>
          </div>
        </div>

        {/* Distraction Blocking Overlay Info */}
        {isConcentrationMode && isActive && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 text-center text-white/60"
          >
            <p className="text-sm font-bold">Modo Concentración Activo</p>
            <p className="text-[10px] uppercase tracking-widest mt-1">Mantente enfocado para ganar tus monedas</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PomodoroTimer;
