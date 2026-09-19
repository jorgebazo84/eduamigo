
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { APP_VERSION, APP_YEAR } from '../version';

interface AuthScreenProps {
  onAuthenticated: (userId: string, email: string, pin: string) => void;
  onDemo: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, onDemo }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'register') {
        if (parentPin.length !== 4) throw new Error('El PIN debe tener 4 dígitos.');
        const data = await authService.register(email, password, parentPin);
        if (data.error) throw new Error(data.error);
        onAuthenticated(data.userId, data.email, data.pin);
      } else if (mode === 'login') {
        const data = await authService.login(email, password);
        if (data.error) throw new Error(data.error);
        onAuthenticated(data.userId, data.email, data.pin);
      } else if (mode === 'forgot') {
        const res = await authService.resetPassword(email, parentPin, password);
        if (!res.success) throw new Error(res.error || 'Error al resetear.');
        setSuccessMsg('Contraseña actualizada. Ya puedes iniciar sesión.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001220] to-[#012a4a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#00B4D8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-2xl border border-white/20 animate-in zoom-in duration-500 relative z-10">
        <div className="text-center mb-8">
          <div className="bg-[#001220] w-24 h-24 rounded-[2rem] shadow-xl flex flex-col items-center justify-center mx-auto mb-6 border-2 border-[#00B4D8]/30 transform -rotate-3 transition-transform hover:rotate-0 relative group">
              {/* Logo con Birrete - Identidad J21 Edu */}
              <div className="absolute -top-3 -left-2 transform -rotate-15 transition-transform group-hover:-rotate-5">
                <svg width="45" height="35" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 15 L25 5 L50 15 L25 25 Z" fill="#00B4D8" />
                  <path d="M10 17 V24 Q25 30 40 17" stroke="#00B4D8" strokeWidth="3" fill="none" />
                  <circle cx="50" cy="15" r="2" fill="white" />
                </svg>
              </div>
              <span className="text-[#00B4D8] font-black text-4xl mt-3">21</span>
              <span className="text-[#00B4D8]/60 text-[6px] font-black uppercase tracking-widest">J21 TECH</span>
          </div>
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">EduAmigo</h1>
          <p className="text-[#00B4D8] font-black text-[9px] tracking-[0.2em] uppercase mt-1">
            EDU-TECH BY EWOLA J21
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl text-xs font-bold border border-green-100 animate-in fade-in">
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-blue-800 ml-1 uppercase">Email Tutor</label>
            <input 
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-2xl px-5 py-3.5 focus:border-[#00B4D8] outline-none text-blue-900 text-sm"
            />
          </div>

          {(mode === 'forgot' || mode === 'register') && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-indigo-800 uppercase ml-1">PIN Parental (4 dígitos)</label>
              <input 
                type="text" maxLength={4} required value={parentPin}
                onChange={(e) => setParentPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl px-5 py-3.5 focus:border-[#00B4D8] outline-none text-indigo-900 text-sm text-center font-black"
                placeholder="0000"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-blue-800 uppercase ml-1">
               {mode === 'forgot' ? 'Nueva Contraseña' : 'Contraseña'}
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-blue-50/50 border-2 border-blue-100 rounded-2xl px-5 py-3.5 focus:border-[#00B4D8] outline-none text-blue-900 text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-[#00B4D8] transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 animate-in shake">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#001220] hover:bg-[#002a42] text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : mode === 'register' ? 'Registrar Familia' : mode === 'forgot' ? 'Actualizar Contraseña' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
          {mode === 'login' && (
            <button onClick={() => setMode('forgot')} className="text-xs text-blue-400 font-bold hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          )}
          
          <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }} className="text-sm text-blue-600 font-bold hover:underline">
            {mode === 'register' ? '¿Ya tienes cuenta? Entra' : mode === 'forgot' ? 'Volver al inicio de sesión' : '¿Eres nuevo? Regístrate'}
          </button>
        </div>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-300"><span className="bg-white px-4">O</span></div>
        </div>

        <button onClick={onDemo} className="w-full bg-[#00B4D8] hover:bg-cyan-500 text-white py-3 rounded-2xl font-black text-xs shadow-md transition-all">
          MODO DEMOSTRACIÓN (INVITADO)
        </button>
      </div>

      {/* FOOTER CORPORATIVO EWOLA J21 TECH */}
      <footer className="mt-12 text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
         <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-[1px] bg-gradient-to-r from-transparent to-[#00B4D8]"></div>
               <div className="flex items-center gap-2">
                  <span className="text-white font-black text-sm tracking-[0.3em]">EWOLA</span>
                  <div className="bg-[#00B4D8] px-2 py-0.5 rounded-md">
                     <span className="text-[#001220] font-black text-xs tracking-[0.2em]">J21</span>
                  </div>
                  <span className="text-white font-black text-sm tracking-[0.3em]">TECH</span>
               </div>
               <div className="w-10 h-[1px] bg-gradient-to-l from-transparent to-[#00B4D8]"></div>
            </div>
            <p className="text-[#00B4D8]/60 text-[8px] font-black uppercase tracking-[0.3em] mt-1">
               INNOVATION & EDUCATION • VERSION {APP_VERSION} • {APP_YEAR}
            </p>
         </div>
      </footer>
    </div>
  );
};

export default AuthScreen;
