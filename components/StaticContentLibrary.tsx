
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { STATIC_LESSONS, StaticLesson } from '../data/staticContent';
import { GoogleGenAI } from "@google/genai";
import { Brain, Info, Sparkles, X, ChevronRight, BookOpen } from 'lucide-react';

interface StaticContentLibraryProps {
  grade: string;
}

const StaticContentLibrary: React.FC<StaticContentLibraryProps> = ({ grade }) => {
  const [selectedLesson, setSelectedLesson] = useState<StaticLesson | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const filteredLessons = STATIC_LESSONS.filter(l => l.gradeRange.includes(grade) || true); // For now show all, or filter by grade

  const askAiToExplain = async (lesson: StaticLesson) => {
    setLoadingAi(true);
    setAiExplanation(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Eres un tutor experto para niños de ${grade}. 
        Explica de forma sencilla y divertida el siguiente esquema visual: "${lesson.title}".
        Contexto del esquema: ${lesson.fullExplanation}.
        Conceptos clave a resaltar: ${lesson.keyConcepts.join(', ')}.
        Usa un lenguaje cercano, con analogías y ejemplos que un niño de esta edad entienda perfectamente.`,
      });
      setAiExplanation(response.text || "No pude generar la explicación en este momento.");
    } catch (error) {
      console.error(error);
      setAiExplanation("Hubo un error al conectar con el tutor IA. ¡Inténtalo de nuevo!");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-emerald-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-black mb-4">Biblioteca de Esquemas Visuales 🖼️</h2>
          <p className="opacity-90 max-w-lg text-xs md:text-sm font-bold uppercase tracking-widest">
            Contenido verificado y esquemas fijos explicados por IA
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl">🧬</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLessons.map((lesson) => (
          <motion.div
            key={lesson.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedLesson(lesson)}
            className="bg-white rounded-[2rem] border border-emerald-50 shadow-sm hover:shadow-md cursor-pointer overflow-hidden group"
          >
            <div className="h-40 overflow-hidden relative">
              <img 
                src={lesson.diagramUrl} 
                alt={lesson.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <span className="text-white font-black text-lg">{lesson.title}</span>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-500 text-xs font-bold mb-4 line-clamp-2">{lesson.description}</p>
              <div className="flex flex-wrap gap-2">
                {lesson.keyConcepts.slice(0, 2).map(c => (
                  <span key={c} className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedLesson && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <BookOpen size={24} />
                  <h3 className="text-xl font-black">{selectedLesson.title}</h3>
                </div>
                <button onClick={() => { setSelectedLesson(null); setAiExplanation(null); }} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="rounded-[2rem] overflow-hidden shadow-lg border-4 border-emerald-50">
                      <img 
                        src={selectedLesson.diagramUrl} 
                        alt={selectedLesson.title} 
                        className="w-full h-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-emerald-900 font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <Info size={14} /> Conceptos Clave
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {selectedLesson.keyConcepts.map(c => (
                          <span key={c} className="bg-emerald-50 text-emerald-700 font-black text-xs px-4 py-2 rounded-2xl border border-emerald-100">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                      <h4 className="text-slate-900 font-black mb-4">Resumen del Esquema</h4>
                      <p className="text-slate-600 leading-relaxed font-medium">
                        {selectedLesson.fullExplanation}
                      </p>
                    </div>

                    {!aiExplanation && !loadingAi && (
                      <button
                        onClick={() => askAiToExplain(selectedLesson)}
                        className="w-full bg-emerald-600 text-white p-6 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <Sparkles size={24} />
                        ¡Tutor IA, explícame este esquema!
                      </button>
                    )}

                    {loadingAi && (
                      <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-emerald-700 font-black text-sm animate-pulse">El tutor IA está analizando el esquema...</p>
                      </div>
                    )}

                    {aiExplanation && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[2.5rem] border-2 border-emerald-100 shadow-sm relative"
                      >
                        <div className="absolute -top-4 -left-4 bg-emerald-600 text-white p-3 rounded-2xl shadow-lg">
                          <Brain size={20} />
                        </div>
                        <h4 className="text-emerald-900 font-black mb-4 ml-6">Explicación del Tutor IA</h4>
                        <div className="prose prose-emerald max-w-none text-emerald-800 font-medium leading-relaxed whitespace-pre-wrap">
                          {aiExplanation}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaticContentLibrary;
