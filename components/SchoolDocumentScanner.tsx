
import React, { useRef, useState } from 'react';
import { processSchoolCircular } from '../services/geminiService';
import { CalendarEvent } from '../types';

interface SchoolDocumentScannerProps {
  childId: string;
  onEventAdded: (event: Omit<CalendarEvent, 'id'>) => void;
}

const SchoolDocumentScanner: React.FC<SchoolDocumentScannerProps> = ({ childId, onEventAdded }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<Partial<CalendarEvent> | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const result = await processSchoolCircular(base64);
      setLastProcessed(result);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmEvent = () => {
    if (lastProcessed?.title && lastProcessed?.date) {
      onEventAdded({
        childId,
        title: lastProcessed.title,
        date: lastProcessed.date,
        type: 'other',
        description: lastProcessed.description,
        notified: false
      });
      setLastProcessed(null);
      alert("Evento añadido a la agenda ✅");
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-purple-100 shadow-xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="bg-purple-100 p-3 rounded-2xl text-2xl">📄</div>
        <div>
          <h2 className="text-xl font-black text-purple-900">Escáner de Circulares</h2>
          <p className="text-purple-400 font-bold text-xs uppercase">Analiza notas del colegio con IA</p>
        </div>
      </div>

      {!lastProcessed ? (
        <button 
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full py-12 border-4 border-dashed border-purple-50 rounded-3xl text-purple-300 font-black hover:bg-purple-50/50 transition-all flex flex-col items-center gap-4"
        >
          <span className="text-5xl">{loading ? '⏳' : '📤'}</span>
          {loading ? 'Analizando documento...' : 'Subir Foto o PDF de la Circular'}
        </button>
      ) : (
        <div className="bg-purple-50 p-6 rounded-3xl space-y-4 border border-purple-200">
           <h3 className="font-black text-purple-900">¿Es correcto este evento?</h3>
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-3 rounded-xl">
               <p className="text-[10px] font-black text-purple-300 uppercase">Título</p>
               <p className="font-bold text-purple-900 text-sm">{lastProcessed.title}</p>
             </div>
             <div className="bg-white p-3 rounded-xl">
               <p className="text-[10px] font-black text-purple-300 uppercase">Fecha</p>
               <p className="font-bold text-purple-900 text-sm">{lastProcessed.date}</p>
             </div>
           </div>
           <div className="flex gap-2">
             <button onClick={confirmEvent} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-black shadow-md">Confirmar ✅</button>
             <button onClick={() => setLastProcessed(null)} className="px-4 py-3 text-purple-400 font-bold">Cancelar</button>
           </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
    </div>
  );
};

export default SchoolDocumentScanner;
