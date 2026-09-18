
import React, { useState, useEffect, useMemo } from 'react';
import { Region, GradeLevel, Subject, SyllabusTopic, TopicDetail, Exercise } from '../types';
import { getSyllabus, getTopicDetail, generateSpeech } from '../services/geminiService';
import { FALLBACK_SYLLABUS } from '../data/fallbackData';

interface LibraryBrowserProps {
  region: Region;
  grade: GradeLevel;
  setGrade: (g: GradeLevel) => void;
  onViewChange?: (mode: any) => void;
}

const subjects: { name: Subject; icon: string; color: string }[] = [
  { name: 'Matemáticas', icon: '🔢', color: 'blue' },
  { name: 'Ciencias Naturales', icon: '🌿', color: 'green' },
  { name: 'Historia', icon: '📜', color: 'amber' },
  { name: 'Lengua y Literatura', icon: '📖', color: 'rose' },
  { name: 'Geografía', icon: '🗺️', color: 'emerald' },
  { name: 'Física y Química', icon: '🧪', color: 'indigo' },
  { name: 'Inglés', icon: '🇬🇧', color: 'violet' },
  { name: 'Arte', icon: '🎨', color: 'pink' },
];

const GRADES: GradeLevel[] = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO',
  '1º Bachillerato', '2º Bachillerato'
];

const LibraryBrowser: React.FC<LibraryBrowserProps> = ({ region, grade, setGrade, onViewChange }) => {
  const [localGrade, setLocalGrade] = useState<GradeLevel>(grade);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabus, setSyllabus] = useState<SyllabusTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetail | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLocalGrade(grade);
  }, [grade]);

  useEffect(() => {
    if (selectedSubject) {
      loadSyllabus();
      setTopicDetail(null);
      setUserAnswers({});
      setShowFeedback({});
      setError(null);
      setSearchQuery('');
    }
  }, [selectedSubject, region, localGrade]);

  const loadSyllabus = async () => {
    if (!selectedSubject) return;
    
    setLoading(true);
    setError(null);
    setIsFallbackMode(false);
    try {
      const data = await getSyllabus(region, localGrade, selectedSubject);
      setSyllabus(data);
      const fallbackForThis = FALLBACK_SYLLABUS[localGrade]?.[selectedSubject];
      if (fallbackForThis && JSON.stringify(data) === JSON.stringify(fallbackForThis)) {
        setIsFallbackMode(true);
      }
    } catch (e: any) {
      setError('Error al conectar con la red. Mostrando temario básico.');
      setSyllabus(FALLBACK_SYLLABUS[localGrade]?.[selectedSubject] || []);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (topicTitle: string, sub: string) => {
    if (!selectedSubject) return;

    setLoading(true);
    setError(null);
    setUserAnswers({});
    setShowFeedback({});
    try {
      const detail = await getTopicDetail(region, localGrade, selectedSubject, topicTitle, sub);
      setTopicDetail(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (detail.summary.includes('límite de cuota')) setIsFallbackMode(true);
    } catch (e: any) {
      setError('Error al cargar la lección. Reintenta en unos instantes.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSyllabus = useMemo(() => {
    if (!searchQuery.trim()) return syllabus;
    const query = searchQuery.toLowerCase();
    return syllabus.filter(topic => 
      topic.title.toLowerCase().includes(query) || 
      topic.subtopics.some(sub => sub.toLowerCase().includes(query))
    );
  }, [syllabus, searchQuery]);

  const handleAnswerSelect = (exerciseId: string, optionIndex: number) => {
    if (showFeedback[exerciseId]) return;
    setUserAnswers(prev => ({ ...prev, [exerciseId]: optionIndex }));
  };

  const checkAnswer = (exerciseId: string) => {
    if (userAnswers[exerciseId] === undefined) return;
    setShowFeedback(prev => ({ ...prev, [exerciseId]: true }));
  };

  if (topicDetail) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        <button 
          onClick={() => setTopicDetail(null)}
          className="text-blue-600 font-bold flex items-center gap-2 hover:translate-x-[-4px] transition-transform text-sm"
        >
          ← Volver al temario
        </button>

        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-blue-50">
          <div className="bg-blue-600 p-6 md:p-8 text-white relative">
             <div className="flex justify-between items-start">
               <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{topicDetail.title}</h2>
                  <p className="text-xs md:text-sm opacity-80 font-medium uppercase tracking-widest">{selectedSubject} • {grade}</p>
               </div>
               <button 
                 onClick={() => generateSpeech(`${topicDetail.title}. ${topicDetail.content}.`)}
                 className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl transition-all"
                 title="Escuchar lección"
               >
                 🔊
               </button>
             </div>
          </div>

          <div className="p-6 md:p-10 space-y-10">
            <section>
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                Lección Interactiva
              </h3>
              <div className="prose prose-blue max-w-none text-blue-800 leading-relaxed text-lg whitespace-pre-wrap">
                {topicDetail.content}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-[2rem]">
                <h4 className="font-bold text-blue-900 mb-4">📌 Conceptos Clave</h4>
                <ul className="space-y-2">
                  {topicDetail.keyPoints.map((p, i) => (
                    <li key={i} className="flex gap-2 text-blue-800 text-sm italic">
                      <span className="text-blue-500 font-bold">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-50 p-6 rounded-[2rem]">
                <h4 className="font-bold text-green-900 mb-4">💡 Ejemplos Reales</h4>
                <ul className="space-y-2">
                  {topicDetail.examples.map((e, i) => (
                    <li key={i} className="flex gap-2 text-green-800 text-sm">
                      <span className="text-green-500 font-bold">★</span> {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {topicDetail.exercises && topicDetail.exercises.length > 0 && (
              <section className="space-y-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-8 bg-yellow-500 rounded-full"></span>
                  Minijuegos de Repaso
                </h3>
                <div className="space-y-6">
                  {topicDetail.exercises.map((ex, idx) => {
                    const exKey = ex.id || idx.toString();
                    return (
                      <div key={exKey} className="bg-white border-2 border-blue-50 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-lg font-bold text-blue-900 mb-4">{idx + 1}. {ex.question}</p>
                        <div className="grid grid-cols-1 gap-2">
                          {ex.options.map((opt, oIdx) => {
                            const isSelected = userAnswers[exKey] === oIdx;
                            const isCorrect = ex.correctIndex === oIdx;
                            const hasFeedback = showFeedback[exKey];
                            
                            let classes = "p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ";
                            if (isSelected) classes += "border-blue-500 bg-blue-50 ";
                            else classes += "border-transparent bg-gray-50 hover:bg-blue-50/50 ";
                            
                            if (hasFeedback) {
                              if (isCorrect) classes = "p-4 rounded-2xl border-2 text-left flex items-center gap-3 border-green-500 bg-green-50 ";
                              else if (isSelected) classes = "p-4 rounded-2xl border-2 text-left flex items-center gap-3 border-red-500 bg-red-50 ";
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleAnswerSelect(exKey, oIdx)}
                                disabled={hasFeedback}
                                className={classes}
                              >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border'}`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="font-medium text-blue-900">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                        {!showFeedback[exKey] && userAnswers[exKey] !== undefined && (
                          <button
                            onClick={() => checkAnswer(exKey)}
                            className="mt-4 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg animate-in fade-in"
                          >
                            Verificar
                          </button>
                        )}
                        {showFeedback[exKey] && (
                          <div className={`mt-4 p-4 rounded-2xl animate-in slide-in-from-top-2 duration-300 ${userAnswers[exKey] === ex.correctIndex ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            <p className="font-bold mb-1">{userAnswers[exKey] === ex.correctIndex ? '✨ ¡Impresionante!' : '💡 No te preocupes, aprende:'}</p>
                            <p className="text-sm opacity-90">{ex.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="bg-indigo-600 p-8 rounded-[2rem] text-white text-center">
               <h4 className="font-bold text-xl mb-2">🎓 ¡Buen trabajo!</h4>
               <p className="opacity-80 italic">"{topicDetail.summary}"</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-blue-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl md:text-3xl font-bold">Biblioteca de Estudio 📚</h2>
            <button 
              onClick={() => onViewChange?.('static-library')}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all border border-white/10"
            >
              🖼️ Ver Esquemas Visuales
            </button>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase opacity-70">Asignatura</label>
              <select 
                value={selectedSubject || ''}
                onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="" disabled className="text-slate-900">Selecciona asignatura</option>
                {subjects.map(s => <option key={s.name} value={s.name} className="text-slate-900">{s.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase opacity-70">Curso</label>
              <select 
                value={localGrade}
                onChange={(e) => setLocalGrade(e.target.value as GradeLevel)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {GRADES.map(g => <option key={g} value={g} className="text-slate-900">{g}</option>)}
              </select>
            </div>
          </div>

          <p className="opacity-90 max-w-lg mt-6 text-xs md:text-sm font-medium">
            {selectedSubject 
              ? `Explorando el currículo oficial de ${selectedSubject} para ${localGrade} en ${region}.`
              : `Selecciona una asignatura para ver el temario oficial de ${localGrade} en ${region}.`
            }
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl">📖</div>
      </div>

      {!selectedSubject && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {subjects.map(s => (
            <button
              key={s.name}
              onClick={() => setSelectedSubject(s.name)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                selectedSubject === s.name 
                ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' 
                : 'bg-white border-blue-50 text-blue-900 hover:border-blue-200'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-[10px] font-bold text-center leading-tight">{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {selectedSubject && (
        <div className="relative group animate-in slide-in-from-top-4 duration-300">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar tema de ${selectedSubject}...`}
            className="w-full bg-white border-2 border-blue-100 rounded-2xl px-12 py-4 focus:border-blue-500 transition-all outline-none text-blue-900 shadow-sm"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl grayscale group-focus-within:grayscale-0 transition-all">🔍</span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-600 font-bold animate-pulse text-sm">Sincronizando con el currículo oficial...</p>
        </div>
      )}

      {selectedSubject && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
          {filteredSyllabus.length > 0 ? filteredSyllabus.map((topic, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm hover:shadow-md transition-all group">
               <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                 <span className="bg-blue-50 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">{idx + 1}</span>
                 {topic.title}
               </h3>
               <div className="space-y-2">
                 {topic.subtopics.map((sub, sIdx) => {
                    const matchesSearch = searchQuery && sub.toLowerCase().includes(searchQuery.toLowerCase());
                    return (
                      <button 
                        key={sIdx}
                        onClick={() => loadDetail(topic.title, sub)}
                        className={`w-full text-left p-3 rounded-xl transition-all group/btn flex justify-between items-center text-xs font-bold ${
                          matchesSearch 
                            ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-900' 
                            : 'bg-blue-50/50 hover:bg-blue-600 hover:text-white text-blue-800'
                        }`}
                      >
                        {sub}
                        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">📖</span>
                      </button>
                    );
                 })}
               </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-blue-50">
               <p className="text-blue-400 font-medium">No hemos encontrado temas que coincidan con "{searchQuery}"</p>
               <button 
                 onClick={() => setSearchQuery('')}
                 className="mt-4 text-blue-600 font-bold hover:underline"
               >
                 Ver todo el temario
               </button>
            </div>
          )}
        </div>
      )}

      {!selectedSubject && (
        <div className="bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-[2.5rem] p-16 text-center">
           <div className="text-5xl mb-4">📚</div>
           <h3 className="text-lg font-bold text-blue-900">Tu Biblioteca Personal</h3>
           <p className="text-blue-400 text-sm max-w-xs mx-auto mt-2">Explora los temas oficiales de {region} adaptados a tu curso de {grade}.</p>
        </div>
      )}
    </div>
  );
};

export default LibraryBrowser;
