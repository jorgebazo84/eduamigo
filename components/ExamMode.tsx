
import React, { useState, useEffect, useRef } from 'react';
import { GradeLevel, Subject, SyllabusTopic, Exercise, ExamResult } from '../types';
import { getSyllabus, generateExam, analyzeExamResults } from '../services/geminiService';
import { srsService } from '../services/srsService';

interface ExamModeProps {
  grade: GradeLevel;
  subject: Subject;
  region: string;
  childId: string; // Added missing prop to link exam results to a child.
  onSaveResult: (result: ExamResult) => void;
  initialTopic?: string;
  initialSubject?: Subject;
  onCompleteSRS?: (reviewId: string) => void;
  srsReviewId?: string;
}

const GRADES: GradeLevel[] = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO',
  '1º Bachillerato', '2º Bachillerato'
];

const SUBJECTS: Subject[] = [
  'Matemáticas', 'Ciencias Naturales', 'Historia', 'Lengua y Literatura', 
  'Inglés', 'Geografía', 'Física y Química', 'Arte'
];

const ExamMode: React.FC<ExamModeProps> = ({ grade, subject, region, childId, onSaveResult, initialTopic, initialSubject, onCompleteSRS, srsReviewId }) => {
  const [localGrade, setLocalGrade] = useState<GradeLevel>(grade);
  const [localSubject, setLocalSubject] = useState<Subject>(initialSubject || subject);
  const [syllabus, setSyllabus] = useState<SyllabusTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Exercise[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [examFinished, setExamFinished] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialTopic) {
      startExam(initialTopic);
    }
  }, [initialTopic]);

  useEffect(() => {
    setLocalGrade(grade);
    if (!initialSubject) setLocalSubject(subject);
  }, [grade, subject, initialSubject]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getSyllabus(region as any, localGrade, localSubject);
      setSyllabus(data);
      setLoading(false);
    };
    load();
  }, [localGrade, localSubject, region]);

  const startExam = async (topic: string) => {
    setLoading(true);
    setSelectedTopic(topic);
    const examQuestions = await generateExam(localGrade, localSubject, topic);
    setQuestions(examQuestions);
    setAnswers([]);
    setCurrentIdx(0);
    setExamFinished(false);
    setLoading(false);
    startTimeRef.current = Date.now();
  };

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = optionIdx;
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx(currentIdx + 1), 300);
    } else {
      finishExam(newAnswers);
    }
  };

  const finishExam = async (finalAnswers: number[]) => {
    setLoading(true);
    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const analysis = await analyzeExamResults(localGrade, localSubject, selectedTopic!, questions, finalAnswers);
    const score = analysis.score || 0;
    const totalQuestions = questions.length;
    // Calculate points based on correct answers and perfect score bonus.
    const pointsEarned = (score * 10) + (score === totalQuestions ? 50 : 0);
    
    // Construct the complete ExamResult object including missing childId and pointsEarned.
    const fullResult: ExamResult = {
      id: crypto.randomUUID(),
      childId,
      grade: localGrade, 
      subject: localSubject, 
      topic: selectedTopic!,
      score,
      totalQuestions,
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      studyGuideContent: analysis.studyGuideContent || "",
      timestamp: Date.now(),
      pointsEarned,
      duration
    };
    setResult(fullResult);
    onSaveResult(fullResult);
    
    // SRS: If score is less than 70%, schedule reviews
    const percentage = (score / totalQuestions) * 10;
    if (percentage < 7) {
      await srsService.scheduleReviews(childId, selectedTopic!, localSubject, fullResult.id);
    }

    // If this was an SRS review, mark it as completed
    if (onCompleteSRS && srsReviewId) {
      onCompleteSRS(srsReviewId);
    }

    setExamFinished(true);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-600 font-bold animate-pulse">Preparando tu examen personalizado...</p>
      </div>
    );
  }

  if (examFinished && result) {
    return (
      <div className="space-y-8 animate-in fade-in zoom-in duration-500 pb-20">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border-t-8 border-blue-600 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-blue-900 mb-2">¡Examen Finalizado!</h2>
          <div className="flex items-center justify-center gap-4 my-6">
            <div className="bg-blue-50 px-8 py-4 rounded-3xl">
              <p className="text-sm font-bold text-blue-400 uppercase">Puntuación</p>
              <p className="text-5xl font-black text-blue-600">{result.score}/{result.totalQuestions}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
              <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">🌟 Tus Puntos Fuertes</h3>
              <ul className="space-y-2">
                {result.strengths?.map((s, i) => <li key={i} className="text-green-800 text-sm flex gap-2"><span>✅</span> {s}</li>)}
              </ul>
            </div>
            <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
              <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">🚀 Puntos a Reforzar</h3>
              <ul className="space-y-2">
                {result.weaknesses?.map((w, i) => <li key={i} className="text-red-800 text-sm flex gap-2"><span>🎯</span> {w}</li>)}
              </ul>
            </div>
          </div>

          <button 
            onClick={() => { setSelectedTopic(null); setExamFinished(false); }}
            className="mt-10 bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all"
          >
            Hacer otro examen
          </button>
        </div>
      </div>
    );
  }

  if (selectedTopic && questions.length > 0) {
    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;
    
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right duration-300">
        <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-blue-50">
          <div className="flex justify-between items-center mb-8">
            <span className="text-xs font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full">PREGUNTA {currentIdx + 1} DE {questions.length}</span>
            <span className="text-xs text-blue-400 font-bold uppercase">{selectedTopic}</span>
          </div>
          
          <h3 className="text-2xl font-bold text-blue-900 mb-10 leading-snug">{q.question}</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className="w-full text-left p-6 rounded-2xl bg-gray-50 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-blue-900 group flex items-center gap-4"
              >
                <span className="w-10 h-10 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">¡Es hora de repasar! ✍️</h2>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase opacity-70">Asignatura</label>
              <select 
                value={localSubject}
                onChange={(e) => setLocalSubject(e.target.value as Subject)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {SUBJECTS.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
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

          <p className="opacity-90 max-w-lg mt-6 text-sm">Elige un tema de {localSubject} ({localGrade}) y generaremos un examen de entrenamiento para que brilles en clase.</p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl">📝</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        {syllabus.map((topic, idx) => (
          <button
            key={idx}
            onClick={() => startExam(topic.title)}
            className="bg-white p-8 rounded-[2rem] border-2 border-transparent hover:border-blue-600 shadow-sm hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-4">
               <span className="text-blue-600 font-black text-xl">0{idx + 1}</span>
               <span className="text-blue-300 group-hover:text-blue-600 transition-colors">Empezar Test →</span>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">{topic.title}</h3>
            <p className="text-sm text-blue-400 font-medium">Practica este bloque temático con preguntas tipo test de nivel oficial.</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExamMode;
