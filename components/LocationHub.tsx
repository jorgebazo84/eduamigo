
import React, { useState } from 'react';
import { Child, LocationState, Coordinate } from '../types';

interface LocationHubProps {
  viewMode: 'student' | 'parent';
  child: Child | null;
  locationStates: LocationState[];
  onToggleTracking: (childId: string) => void;
  onSetPoint: (childId: string, type: 'home' | 'school', coord: Coordinate, address?: string) => void;
  onSearchAddress: (childId: string, address: string, type: 'home' | 'school') => Promise<string | null>;
  onReverseGeocode: (childId: string, coord: Coordinate, type: 'home' | 'school') => Promise<string>;
}

const LocationHub: React.FC<LocationHubProps> = ({ 
  viewMode, child, locationStates, onToggleTracking, onSetPoint, onSearchAddress, onReverseGeocode 
}) => {
  const state = locationStates.find(s => s.childId === (child?.id || '')) || null;
  const [saveStatus, setSaveStatus] = useState<'none' | 'home' | 'school'>('none');
  const [searchInputs, setSearchInputs] = useState({ home: '', school: '' });
  const [isSearching, setIsSearching] = useState<'none' | 'home' | 'school'>('none');

  // Helper: Haversine distance in meters
  const getDistance = (c1: Coordinate, c2: Coordinate) => {
    if (!c1 || !c2) return 999999;
    const R = 6371e3; 
    const φ1 = c1.lat * Math.PI/180;
    const φ2 = c2.lat * Math.PI/180;
    const Δφ = (c2.lat-c1.lat) * Math.PI/180;
    const Δλ = (c2.lng-c1.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleSetCurrentAs = async (type: 'home' | 'school') => {
    if (!state?.currentCoord) {
      alert("Esperando señal GPS activa... Asegúrate de permitir la ubicación en tu navegador y espera unos segundos.");
      return;
    }
    setIsSearching(type);
    await onReverseGeocode(state.childId, state.currentCoord, type);
    setIsSearching('none');
    setSaveStatus(type);
    setTimeout(() => setSaveStatus('none'), 3000);
  };

  const handleSearchAs = async (type: 'home' | 'school') => {
    const address = searchInputs[type];
    if (!address.trim() || !state) return;
    
    setIsSearching(type);
    const resultAddress = await onSearchAddress(state.childId, address, type);
    setIsSearching('none');
    
    if (resultAddress) {
      setSearchInputs(prev => ({ ...prev, [type]: '' }));
      setSaveStatus(type);
      setTimeout(() => setSaveStatus('none'), 3000);
    }
  };

  if (viewMode === 'student') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className={`p-8 rounded-[3rem] shadow-xl border-4 transition-all text-center ${state?.isTracking ? 'bg-green-600 border-green-400 text-white' : 'bg-white border-indigo-600 text-indigo-900'}`}>
          <div className="text-6xl mb-4">{state?.isTracking ? (state.destination === 'home' ? '🏠' : '🎒') : '🎒'}</div>
          <h2 className="text-3xl font-black mb-2">
            {state?.isTracking ? (state.destination === 'home' ? 'Volviendo a Casa' : 'Yendo al Colegio') : 'Ruta Segura'}
          </h2>
          <p className={`font-bold mb-8 opacity-80 ${state?.isTracking ? 'text-green-100' : 'text-indigo-500'}`}>
            {state?.isTracking 
              ? `EduAmigo vigila que no te desvíes de la mejor ruta de Google Maps.` 
              : 'Configura tus destinos y avísanos cuando salgas solo para protegerte.'}
          </p>
          
          <button 
            onClick={() => state && onToggleTracking(state.childId)}
            className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transform active:scale-95 transition-all ${state?.isTracking ? 'bg-white text-green-600' : 'bg-indigo-600 text-white'}`}
          >
            {state?.isTracking ? 'He llegado al destino ✅' : 'Iniciar Ruta 🚀'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Home Settings */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-blue-50 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">🏠 Ubicación de Mi Casa</h3>
               {state?.homeCoord && <span className="text-[10px] font-black bg-green-100 text-green-600 px-2 py-0.5 rounded">CONFIGURADO</span>}
             </div>
             
             {state?.homeAddress ? (
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                 <p className="text-[10px] font-black text-blue-400 uppercase">Dirección Guardada:</p>
                 <p className="font-bold text-blue-900 text-sm truncate">{state.homeAddress}</p>
               </div>
             ) : (
               <p className="text-xs text-blue-400 font-medium italic">Aún no has guardado dónde está tu casa.</p>
             )}

             <div className="space-y-2">
               <div className="relative group">
                 <input 
                   value={searchInputs.home}
                   onChange={e => setSearchInputs(prev => ({ ...prev, home: e.target.value }))}
                   placeholder="Escribe tu dirección..."
                   className="w-full bg-gray-50 p-4 pr-16 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-blue-300"
                 />
                 <button 
                  onClick={() => handleSearchAs('home')}
                  disabled={isSearching !== 'none'}
                  className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-3 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all disabled:opacity-50"
                 >
                   {isSearching === 'home' ? '...' : 'BUSCAR'}
                 </button>
               </div>
               
               <div className="relative">
                <button 
                  onClick={() => handleSetCurrentAs('home')}
                  disabled={isSearching !== 'none'}
                  className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${saveStatus === 'home' ? 'bg-green-500 text-white' : 'bg-white border-2 border-blue-50 text-blue-500 hover:border-blue-200'}`}
                >
                  📍 {saveStatus === 'home' ? '¡UBICACIÓN GPS GUARDADA!' : 'MARCAR MI POSICIÓN ACTUAL COMO CASA'}
                </button>
               </div>
             </div>
          </div>

          {/* School Settings */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-blue-50 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">🏫 Ubicación de Mi Cole</h3>
               {state?.schoolCoord && <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">CONFIGURADO</span>}
             </div>
             
             {state?.schoolAddress ? (
               <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                 <p className="text-[10px] font-black text-indigo-400 uppercase">Dirección Guardada:</p>
                 <p className="font-bold text-indigo-900 text-sm truncate">{state.schoolAddress}</p>
               </div>
             ) : (
               <p className="text-xs text-indigo-400 font-medium italic">Aún no has guardado dónde está tu cole.</p>
             )}

             <div className="space-y-2">
               <div className="relative group">
                 <input 
                   value={searchInputs.school}
                   onChange={e => setSearchInputs(prev => ({ ...prev, school: e.target.value }))}
                   placeholder="Escribe el nombre o dirección del cole..."
                   className="w-full bg-gray-50 p-4 pr-16 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-indigo-300"
                 />
                 <button 
                  onClick={() => handleSearchAs('school')}
                  disabled={isSearching !== 'none'}
                  className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-3 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all disabled:opacity-50"
                 >
                   {isSearching === 'school' ? '...' : 'BUSCAR'}
                 </button>
               </div>
               
               <div className="relative">
                <button 
                  onClick={() => handleSetCurrentAs('school')}
                  disabled={isSearching !== 'none'}
                  className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${saveStatus === 'school' ? 'bg-indigo-500 text-white' : 'bg-white border-2 border-indigo-50 text-indigo-500 hover:border-indigo-200'}`}
                >
                  📍 {saveStatus === 'school' ? '¡UBICACIÓN GPS GUARDADA!' : 'MARCAR MI POSICIÓN ACTUAL COMO COLE'}
                </button>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Parent View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-blue-900">Seguridad y Rutas Dinámicas</h3>
        {locationStates.some(s => s.isTracking) && (
          <span className="flex items-center gap-2 text-green-500 text-xs font-black animate-pulse bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> GOOGLE MAPS ACTIVE
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {locationStates.map(ls => {
            const isAtHome = ls.currentCoord && ls.homeCoord && getDistance(ls.currentCoord, ls.homeCoord) < ls.safeRadius;
            const isAtSchool = ls.currentCoord && ls.schoolCoord && getDistance(ls.currentCoord, ls.schoolCoord) < ls.safeRadius;
            const lastPoint = ls.history[ls.history.length - 1];
            const isDeviated = lastPoint?.status === 'deviation';

            return (
              <div key={ls.childId} className={`p-6 rounded-[2rem] border-2 transition-all ${isDeviated ? 'bg-red-50 border-red-200 shadow-lg shadow-red-100' : ls.isTracking ? 'bg-green-50 border-green-200 shadow-lg shadow-green-100' : 'bg-white border-blue-50'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">👦</div>
                  <div>
                    <h4 className="font-black text-blue-900">Seguimiento</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${ls.isTracking ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {ls.isTracking ? (ls.destination === 'home' ? 'Vuelta a casa' : 'Hacia el cole') : 'Reposo'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Estado:</span>
                    <span className={`font-bold ${isDeviated ? 'text-red-600' : 'text-blue-600'}`}>
                      {isDeviated ? '⚠️ DESVIADO DE RUTA' : isAtHome ? 'En Casa 🏠' : isAtSchool ? 'En el Cole 🏫' : ls.isTracking ? 'En camino🚶' : 'Localizado'}
                    </span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-blue-50 space-y-2">
                    <div className="flex gap-2 items-start">
                      <span className="text-xs">🏠</span>
                      <p className="text-[10px] font-bold text-blue-900 truncate">{ls.homeAddress || 'Casa no configurada'}</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-xs">🏫</span>
                      <p className="text-[10px] font-bold text-blue-900 truncate">{ls.schoolAddress || 'Colegio no configurado'}</p>
                    </div>
                  </div>

                  {ls.groundingUrls.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-100">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Fuentes Google Maps:</p>
                      <div className="flex flex-col gap-1">
                        {ls.groundingUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline font-bold truncate">
                            🔗 Ver ruta oficial en Maps
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-blue-50 shadow-sm p-6 overflow-hidden relative min-h-[400px]">
           <div className="absolute top-6 left-6 z-10 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-blue-600 border border-blue-100 uppercase flex items-center gap-2">
             <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Pasillo de Google Maps (300m)
           </div>
           
           <div className="w-full h-full flex items-center justify-center bg-blue-50/30 rounded-[2rem] border border-dashed border-blue-100 relative">
             <svg width="100%" height="100%" viewBox="0 0 400 300" className="opacity-90">
                {/* Visual Route Corridor */}
                <path d="M 60 240 Q 150 200 200 150 T 340 60" fill="none" stroke="rgba(79, 70, 229, 0.05)" strokeWidth="60" strokeLinecap="round" />
                
                {/* School Zone */}
                <circle cx="340" cy="60" r="25" fill="rgba(79, 70, 229, 0.1)" stroke="rgba(79, 70, 229, 0.4)" strokeDasharray="4" />
                <text x="325" y="30" fontSize="9" className="fill-indigo-500 font-black">COLEGIO</text>
                
                {/* Home Zone */}
                <circle cx="60" cy="240" r="25" fill="rgba(234, 179, 8, 0.1)" stroke="rgba(234, 179, 8, 0.4)" strokeDasharray="4" />
                <text x="48" y="210" fontSize="9" className="fill-yellow-600 font-black">CASA</text>
                
                {/* Path Lines */}
                <path d="M 60 240 Q 150 200 200 150 T 340 60" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeDasharray="6" />
                
                {/* Current Marker */}
                {state?.currentCoord && (
                   <g>
                     <circle cx="210" cy="140" r="10" fill={state.history[state.history.length-1]?.status === 'deviation' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(79, 70, 229, 0.3)'} className="animate-pulse" />
                     <circle cx="210" cy="140" r="4" fill={state.history[state.history.length-1]?.status === 'deviation' ? '#ef4444' : '#4f46e5'} />
                   </g>
                )}
             </svg>
             
             <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[10px] shadow-sm font-bold text-gray-600">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div> Ruta de Google Maps
                </div>
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[10px] shadow-sm font-bold text-red-600">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div> Desviación Peligrosa
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LocationHub;
