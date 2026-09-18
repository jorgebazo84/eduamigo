
import React from 'react';
import { ViewMode, UserRole, Child } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  userRole: UserRole;
  activeChild: Child | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode, userRole, activeChild, onLogout }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="bg-[#001220] p-2 rounded-2xl shadow-lg relative border-2 border-[#00B4D8]/50 group">
            <div className="w-10 h-10 flex flex-col items-center justify-center relative">
               <div className="absolute -top-1 -left-1 transform -rotate-12 transition-transform group-hover:rotate-0">
                  <svg width="24" height="18" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 15 L25 5 L50 15 L25 25 Z" fill="#00B4D8" />
                    <path d="M10 17 V24 Q25 30 40 17" stroke="#00B4D8" strokeWidth="4" fill="none" />
                    <circle cx="50" cy="15" r="3" fill="white" />
                  </svg>
               </div>
               <span className="text-[#00B4D8] font-black text-xl mt-2">21</span>
            </div>
            {userRole === 'demo' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B4D8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00B4D8]"></span>
              </span>
            )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-blue-900 leading-none">EduAmigo</h1>
            {userRole === 'demo' && (
              <span className="bg-yellow-100 text-yellow-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">INVITADO</span>
            )}
          </div>
          <p className="text-[#00B4D8] text-[9px] font-black tracking-[0.2em] uppercase mt-1 opacity-80">EWOLA J21 TECH</p>
        </div>
      </div>

      <div className="flex flex-wrap bg-blue-100 p-1 rounded-2xl self-center md:self-auto shadow-inner">
        <button
          onClick={() => setViewMode('ask')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'ask' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          💡 Aprender
        </button>
        <button
          onClick={() => setViewMode('planner')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'planner' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          🗓️ Plan
        </button>
        <button
          onClick={() => setViewMode('library')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          📚 Biblioteca
        </button>
        <button
          onClick={() => setViewMode('exam')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'exam' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          📝 Test
        </button>
        <button
          onClick={() => setViewMode('voice')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'voice' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          🎙️ Live
        </button>
        <button
          onClick={() => setViewMode('calligraphy')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'calligraphy' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500 hover:text-indigo-700'
          }`}
        >
          ✍️ Caligrafía
        </button>
        <button
          onClick={() => setViewMode('parent')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            viewMode === 'parent' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500 hover:text-blue-700'
          }`}
        >
          🧔 Padres
        </button>
      </div>

      <div className="flex items-center gap-2">
        {activeChild && (
          <div className="hidden lg:flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-blue-50">
            <span className="text-2xl">{activeChild.avatar}</span>
            <div>
              <p className="text-xs font-black text-blue-900 leading-none">{activeChild.name}</p>
              <p className="text-[10px] font-bold text-yellow-600 flex items-center gap-1">
                ⭐ {activeChild.points} <span className="text-orange-500">🔥 {activeChild.streak?.current ?? 0}</span>
              </p>
            </div>
          </div>
        )}
        
        <button 
          onClick={onLogout}
          className={`p-2 rounded-xl transition-all flex items-center justify-center border-2 ${
            userRole === 'demo' 
            ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-500 hover:text-white' 
            : 'bg-white border-blue-50 text-blue-400 hover:text-blue-600 hover:border-blue-200'
          }`}
          title={userRole === 'demo' ? "Salir del modo demo" : "Cerrar Sesión"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Header;
