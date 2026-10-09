
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
  const [spokenText, setSpokenText] = useState('');
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);

  const speakTutorResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = subject === 'Inglés' ? 'en-US' : 'es-ES';
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startSession = async () => {
    setIsActive(true);
    setTranscription('¡Micrófono activo! Habla con claridad...');
    setSpokenText('');
    startTimeRef.current = Date.now();

    const welcomeMsg = subject === 'Inglés' 
      ? 'Hello! I am your oral English tutor. Tell me about your favorite animal or hobby!' 
      : `¡Hola! Soy tu tutor oral de ${subject}. ¿Qué tema te gustaría repasar hoy en voz alta?`;
    
    speakTutorResponse(welcomeMsg);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = subject === 'Inglés' ? 'en-US' : 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let currentSpoken = '';
          for (let i = 0; i < event.results.length; i++) {
            currentSpoken += event.results[i][0].transcript + ' ';
          }
          const clean = currentSpoken.trim();
          setSpokenText(clean);
          setTranscription(`Te estoy escuchando: "${clean}"`);
        };

        recognition.onerror = (e: any) => {
          console.warn("Oral practice recognition notice:", e.error);
        };

        recognition.onend = () => {
          if (isActive) {
            try { recognition.start(); } catch (_) {}
          }
        };

        recognition.start();
      } catch (err) {
        console.error("Speech recognition startup error:", err);
      }
    }
  };

  const stopSession = () => {
    setIsActive(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    
    // Log activity for parent monitoring
    if (onActivityLog) {
      onActivityLog(`Sesión de Práctica Oral: ${subject}`, subject, {
        text: `El alumno ha completado una sesión de práctica oral de ${subject}.`,
        type: 'oral_practice',
        subject,
        duration,
        transcription: spokenText || transcription
      });
    }
    
    setTranscription(spokenText ? `¡Excelente práctica! Has dicho: "${spokenText}"` : 'Sesión finalizada.');
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
