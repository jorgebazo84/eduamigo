import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Detect if already installed / running in standalone display mode
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    checkStandalone();

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General prompt/guidance
      alert('Para instalar EduAmigo como aplicación: Abre el menú de tu navegador (⋮) y selecciona "Instalar aplicación" o "Añadir a la pantalla de inicio".');
    }
  };

  return (
    <>
      <button
        id="pwa-install-header-btn"
        onClick={handleInstallClick}
        title="Instalar EduAmigo como aplicación en tu móvil u ordenador"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00B4D8] to-blue-600 text-white text-[11px] font-black shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-blue-100 text-center">
            <div className="w-14 h-14 bg-[#001220] border-2 border-[#00B4D8] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#00B4D8] font-black text-2xl">
              21
            </div>
            <h3 className="text-lg font-black text-blue-950 mb-2">Instalar en iPhone / iPad</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Para tener <strong>EduAmigo</strong> con icono y pantalla completa como una app nativa:
            </p>
            <div className="bg-blue-50/80 rounded-2xl p-4 text-left text-xs space-y-3 mb-6 font-medium text-slate-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Toca el botón <strong>Compartir</strong> <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px]">⎋</span> en la barra de Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Baja y selecciona <strong>«Añadir a pantalla de inicio»</strong> <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px]">➕</span></span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Pulsa <strong>Añadir</strong> arriba a la derecha. ¡Listo!</span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#001220] hover:bg-slate-800 text-white py-3 rounded-xl font-black text-xs transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
