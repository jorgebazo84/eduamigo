
import React, { useState, useEffect, useRef } from 'react';
import { Modality } from '@google/genai';
import { ai } from '../services/geminiService';
import { GradeLevel, Subject } from '../types';

interface OralPracticeProps {
  grade: GradeLevel;
  subject: Subject;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const OralPractice: React.FC<OralPracticeProps> = ({ grade, subject, onActivityLog }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);

  const startSession = async () => {
    setIsActive(true);
    setTranscription('Conectando con tu tutor oral...');
    startTimeRef.current = Date.now();
    
    // In a real implementation, we would set up the full AudioContext and WebSocket 
    // stream as per the Live API guidelines. This is a simplified UI representation.
    setTimeout(() => {
        setTranscription('¡Hola! Soy tu tutor de ' + subject + '. ¿Qué te gustaría practicar hoy hablando?');
    }, 1500);
  };

  const stopSession = () => {
    setIsActive(false);
    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    
    // Log activity for parent monitoring
    if (onActivityLog) {
      onActivityLog(`Sesión de Práctica Oral: ${subject}`, subject, {
        text: `El alumno ha completado una sesión de práctica oral de ${subject}.`,
        type: 'oral_practice',
        subject,
        duration,
        transcription: transcription
      });
    }
    
    setTranscription('');
    if (sessionRef.current) sessionRef.current.close();
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-indigo-100 p-10 text-center space-y-8 animate-in zoom-in duration-500">
      <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-6xl shadow-2xl transition-all duration-1000 ${isActive ? 'bg-indigo-600 scale-110 animate-pulse' : 'bg-gray-100 grayscale'}`}>
        {isActive ? '🎙️' : '🔇'}
      </div>
      
      <div>
        <h2 className="text-3xl font-black text-indigo-900">Práctica Oral Live</h2>
        <p className="text-indigo-400 font-bold">Habla directamente con Gemini para mejorar tu fluidez.</p>
      </div>

      <div className="bg-indigo-50 min-h-[100px] p-6 rounded-3xl border border-indigo-100 flex items-center justify-center">
        <p className="text-indigo-900 font-black italic">
          {isActive ? transcription : 'Pulsa el botón para empezar a hablar.'}
        </p>
      </div>

      <button 
        onClick={isActive ? stopSession : startSession}
        className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all transform active:scale-95 ${isActive ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}
      >
        {isActive ? 'Terminar Sesión ⏹️' : 'Empezar a Hablar 🚀'}
      </button>

      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
        Usa Gemini Live para practicar Inglés o repasar temas hablando.
      </p>
    </div>
  );
};

export default OralPractice;
