
import React, { useState } from 'react';
import { GradeLevel, Subject, ExplanationResponse, Region, Country } from '../types';
import { getExplanation, getSOSExplanation, generateSpeech, GeminiError } from '../services/geminiService';
import StudyForm from './StudyForm';
import ResultDisplay from './ResultDisplay';

interface StudentInquiryProps {
  childName: string;
  grade: GradeLevel;
  region: Region;
  onSuccess: (question: string, subject: Subject, answer: ExplanationResponse) => void;
  onSOS: () => void;
}

const StudentInquiry: React.FC<StudentInquiryProps> = ({ childName, grade, region, onSuccess, onSOS }) => {
  const [question, setQuestion] = useState('');
  const [subject, setSubject] = useState<Subject>('Matemáticas');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplanationResponse | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTts = (text: string, id: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(id);
    generateSpeech(text).finally(() => setIsPlayingAudio(null));
  };

  const handleQuerySubmit = async (e?: React.FormEvent, sosCountry?: Country) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = sosCountry 
        ? await getSOSExplanation(grade, subject, question, sosCountry)
        : await getExplanation(grade, subject, question, region);
      
      setResult(res);
      onSuccess(question, subject, res);
    } catch (err: any) {
      console.error("Error al consultar:", err);
      if (err instanceof GeminiError && err.status === 429) {
        setError("⚠️ Ups, el tutor está un poco saturado ahora mismo. Por favor, espera un minuto y vuelve a preguntar.");
      } else {
        setError("Ha ocurrido un error al intentar resolver tu duda. Por favor, inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border-2 border-blue-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-600 p-3 rounded-2xl">
             <span className="text-2xl">✍️</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-blue-900">¿Qué quieres aprender hoy, {childName}?</h2>
            <p className="text-blue-500 font-bold text-sm">Explícame tu duda y la resolveremos juntos con IA.</p>
          </div>
        </div>

        <StudyForm 
          grade={grade}
          setGrade={() => {}} 
          subject={subject}
          setSubject={setSubject}
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleQuerySubmit}
          onSOS={onSOS}
          loading={loading}
        />

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold text-sm text-center animate-in shake duration-300">
            {error}
          </div>
        )}
      </div>

      <ResultDisplay 
        result={result} 
        loading={loading} 
        grade={grade} 
        subject={subject} 
        onSpeak={handleTts} 
        isPlayingId={isPlayingAudio} 
      />
    </div>
  );
};

export default StudentInquiry;
