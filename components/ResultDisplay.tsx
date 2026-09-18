
import React from 'react';
import { ExplanationResponse, GradeLevel, Subject } from '../types';

interface ResultDisplayProps {
  result: ExplanationResponse | null;
  loading: boolean;
  grade: GradeLevel;
  subject: Subject;
  onSpeak?: (text: string, id: string) => void;
  isPlayingId?: string | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, grade, subject, onSpeak, isPlayingId }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border-2 border-blue-50 shadow-sm animate-pulse space-y-6">
        <div className="h-6 bg-blue-100 rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-4 bg-blue-50 rounded w-full"></div>
          <div className="h-4 bg-blue-50 rounded w-full"></div>
          <div className="h-4 bg-blue-50 rounded w-4/5"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-blue-50 rounded-2xl"></div>
          <div className="h-32 bg-blue-50 rounded-2xl"></div>
          <div className="h-32 bg-blue-50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const PlayIcon = ({ id }: { id: string }) => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        if (onSpeak) {
           const sectionText = id === 'explanation' ? result.explanation : id === 'funfact' ? result.funFact : result.examples[parseInt(id)];
           onSpeak(sectionText, id);
        }
      }}
      disabled={isPlayingId !== null}
      className={`p-2 rounded-full transition-all ${isPlayingId === id ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} disabled:opacity-50`}
      title="Escuchar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
      </svg>
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className={`bg-white rounded-3xl p-6 md:p-10 border-2 shadow-xl relative overflow-hidden ${result.isSOS ? 'border-red-100 ring-4 ring-red-50' : 'border-blue-100'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          {result.isSOS ? (
            <span className="text-8xl">🚨</span>
          ) : (
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" className="text-blue-900">
               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{subject}</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{grade}</span>
                {result.isSOS && (
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                    🚨 SOS {result.country?.toUpperCase()}
                  </span>
                )}
            </div>
            <PlayIcon id="explanation" />
        </div>

        <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${result.isSOS ? 'text-red-900' : 'text-blue-900'}`}>
            <span className="text-3xl">{result.isSOS ? '🏠' : '💡'}</span> 
            {result.isSOS ? 'Explicación desde casa' : 'La Explicación Sencilla'}
        </h3>
        
        <div className={`prose max-w-none leading-relaxed text-lg ${result.isSOS ? 'text-red-800' : 'text-blue-800'}`}>
          {result.explanation.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-4 last:mb-0">{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {result.examples.map((example, idx) => (
          <div key={idx} className={`${result.isSOS ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'} border-2 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow transform hover:-translate-y-1 relative`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm text-white ${result.isSOS ? 'bg-red-500' : 'bg-yellow-400'}`}>
                  {idx + 1}
              </div>
              <PlayIcon id={idx.toString()} />
            </div>
            <p className={`font-medium leading-relaxed italic ${result.isSOS ? 'text-red-900' : 'text-yellow-900'}`}>
              "{example}"
            </p>
          </div>
        ))}
      </div>

      <div className={`rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden ${result.isSOS ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
        <div className="text-5xl animate-bounce">{result.isSOS ? '🚩' : '🤔'}</div>
        <div className="flex-1">
            <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                {result.isSOS ? '¿Lo sabías?' : '¿Sabías que?'}
            </h4>
            <p className="text-white/90 text-lg leading-relaxed">
                {result.funFact}
            </p>
        </div>
        <div className="absolute top-4 right-4 md:static">
          <PlayIcon id="funfact" />
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
