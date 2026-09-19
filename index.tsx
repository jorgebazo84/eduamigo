if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || {
    env: { NODE_ENV: 'development', GEMINI_API_KEY: '' },
    stderr: null,
    stdout: null,
    browser: true,
    platform: 'browser',
    version: '',
    versions: {},
    cwd: () => '/',
    nextTick: (fn: any) => setTimeout(fn, 0)
  };
  (window as any).global = window;
}

import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#001220] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 max-w-md w-full shadow-2xl">
            <span className="text-4xl mb-4 block">🎓</span>
            <h1 className="text-2xl font-black text-[#00B4D8] mb-2">EduAmigo</h1>
            <p className="text-sm text-slate-300 mb-6">
              Ha ocurrido un detalle al cargar la vista. Pulsa reiniciar para volver a cargar la sesión.
            </p>
            {this.state.error && (
              <pre className="text-[10px] bg-black/40 p-3 rounded-xl text-red-300 mb-6 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                try {
                  sessionStorage.clear();
                  localStorage.clear();
                } catch (e) {}
                window.location.reload();
              }}
              className="w-full bg-[#00B4D8] hover:bg-cyan-500 text-[#001220] py-3 rounded-xl font-black text-sm transition-all"
            >
              Reiniciar Aula
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const mount = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Could not find root element to mount to");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err: any) {
    console.error("Critical mounting error:", err);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background: #001220; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; color: white; font-family: system-ui, sans-serif; text-align: center;">
        <div style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
          <span style="font-size: 40px; display: block; margin-bottom: 12px;">🎓</span>
          <h2 style="color: #00B4D8; margin: 0 0 8px 0; font-size: 24px; font-weight: 900;">EduAmigo</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0;">Error crítico al iniciar React:</p>
          <pre style="background: rgba(0,0,0,0.6); color: #fca5a5; padding: 12px; border-radius: 12px; font-size: 11px; text-align: left; overflow: auto; max-height: 120px; margin-bottom: 20px;">${err?.message || err}</pre>
          <button onclick="location.reload()" style="background: #00B4D8; color: #001220; border: none; padding: 14px 24px; border-radius: 14px; font-weight: 900; cursor: pointer; font-size: 14px; width: 100%;">Recargar Aula</button>
        </div>
      </div>
    `;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
