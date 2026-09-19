import React, { useEffect, useState } from 'react';
import { offlineStorageService } from '../services/offlineStorageService';

export const OfflineStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(offlineStorageService.getOnlineStatus());
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePending = () => {
      setPendingCount(offlineStorageService.getQueuedActivities().length);
    };
    updatePending();

    const unsubscribe = offlineStorageService.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        setShowRestoredNotice(true);
        setTimeout(() => setShowRestoredNotice(false), 4000);
      }
      updatePending();
    });

    const interval = setInterval(updatePending, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (isOnline && !showRestoredNotice) {
    return null;
  }

  if (showRestoredNotice) {
    return (
      <div
        id="offline-restored-banner"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[250] bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-xl border border-emerald-400 flex items-center gap-2.5 text-xs font-black animate-in fade-in slide-in-from-top-3 duration-300"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
        <span>¡Conexión a Internet recuperada! Todo tu progreso ha sido sincronizado.</span>
      </div>
    );
  }

  return (
    <div
      id="offline-status-banner"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[250] bg-[#001220]/95 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-[#00B4D8] flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-300"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
      <span>
        Modo Sin Conexión activo — <span className="text-[#00B4D8] font-black">Puedes seguir estudiando</span>.
        {pendingCount > 0 && <span className="ml-1 text-slate-300 text-[10px]">({pendingCount} actividades guardadas en local)</span>}
      </span>
    </div>
  );
};
