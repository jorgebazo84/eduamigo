
import React from 'react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole) => void;
  onLogout?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Decorative circles */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-[2.5rem] p-10 shadow-2xl border border-white/20 transform transition-all hover:scale-[1.01] animate-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 transform -rotate-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
          </div>
          <h1 className="text-4xl font-bold text-blue-900 tracking-tight mb-2">EduAmigo</h1>
          <p className="text-blue-600 font-medium">Selecciona tu perfil para continuar</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onLogin('student')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            <span className="text-2xl group-hover:animate-bounce">👦</span>
            Entrar como Estudiante
          </button>

          <button
            onClick={() => onLogin('parent')}
            className="w-full bg-white border-2 border-blue-100 hover:border-blue-500 text-blue-700 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">🧔</span>
            Acceso Padres / Tutores
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">O TAMBIÉN</span>
            </div>
          </div>

          <button
            onClick={() => onLogin('demo')}
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <span className="text-xl">✨</span>
            Probar Modo Demo
          </button>
        </div>

        <div className="mt-8 text-center">
            <button 
              onClick={onLogout}
              className="text-xs text-blue-400 hover:text-blue-600 font-bold transition-colors"
            >
              Desvincular Licencia / Cerrar Sesión
            </button>
        </div>

        <p className="text-center text-gray-400 text-[10px] mt-6 leading-tight">
          Sesión vinculada a tu centro educativo.
        </p>
      </div>
    </div>
  );
};

export default Login;
