
import React, { useState } from 'react';
import { SchoolCommunication, QuickNote, Child, SchoolCommType } from '../types';

interface SchoolHubProps {
  children: Child[];
  communications: SchoolCommunication[];
  quickNotes: QuickNote[];
  onAddNote: (note: Omit<QuickNote, 'id' | 'timestamp'>) => void;
  onDeleteNote: (id: string) => void;
  onSyncEmails: () => void;
  onMarkRead: (id: string) => void;
}

const commTypeLabels: Record<SchoolCommType, { label: string; icon: string; color: string }> = {
  email: { label: 'Correo', icon: '📧', color: 'bg-blue-100 text-blue-700' },
  circular: { label: 'Circular', icon: '📄', color: 'bg-purple-100 text-purple-700' },
  interview: { label: 'Entrevista', icon: '🤝', color: 'bg-green-100 text-green-700' },
  warning: { label: 'Aviso', icon: '⚠️', color: 'bg-red-100 text-red-700' },
};

const SchoolHub: React.FC<SchoolHubProps> = ({ 
  children, communications, quickNotes, onAddNote, onDeleteNote, onSyncEmails, onMarkRead 
}) => {
  const [activeSection, setActiveSection] = useState<'notes' | 'inbox'>('notes');
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  
  const [noteText, setNoteText] = useState('');
  const [noteSource, setNoteSource] = useState('Profe');

  const filteredNotes = quickNotes
    .filter(n => selectedChildId === 'all' || n.childId === selectedChildId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const filteredComms = communications
    .filter(c => selectedChildId === 'all' || c.childId === selectedChildId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText || selectedChildId === 'all') {
      alert("Selecciona un hijo para añadir la nota");
      return;
    }
    onAddNote({ childId: selectedChildId, text: noteText, source: noteSource });
    setNoteText('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 p-1 bg-indigo-100 rounded-2xl">
          <button 
            onClick={() => setActiveSection('notes')} 
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeSection === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}
          >
            💬 Notas Rápidas
          </button>
          <button 
            onClick={() => setActiveSection('inbox')} 
            className={`relative px-6 py-2 rounded-xl text-xs font-black transition-all ${activeSection === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}
          >
            📥 Buzón Escolar
            {communications.filter(c => !c.isRead).length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>

        <select 
          value={selectedChildId} 
          onChange={(e) => setSelectedChildId(e.target.value)}
          className="bg-white border-2 border-indigo-100 rounded-xl px-4 py-2 text-sm font-bold text-indigo-900 outline-none focus:border-indigo-500"
        >
          <option value="all">Ver todo el centro 🏫</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {activeSection === 'notes' && (
        <div className="space-y-6">
          <form onSubmit={handleNoteSubmit} className="bg-white p-6 rounded-[2rem] border-2 border-indigo-600 shadow-xl space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-2xl">📝</span>
               <h3 className="text-lg font-black text-indigo-900">Resumen rápido del día</h3>
             </div>
             <div className="flex flex-col md:flex-row gap-4">
                <input 
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Ej: Hoy el profe dijo que traiga hojas de colores..."
                  className="flex-1 bg-indigo-50 p-4 rounded-2xl outline-none font-bold text-sm"
                />
                <select 
                  value={noteSource}
                  onChange={e => setNoteSource(e.target.value)}
                  className="bg-indigo-50 p-4 rounded-2xl outline-none font-bold text-xs md:w-48"
                >
                  <option value="Profe">🗣️ Dijo el Profe</option>
                  <option value="Colegio">🏫 Del Colegio</option>
                  <option value="WhatsApp">📱 Grupo WhatsApp</option>
                  <option value="Agenda">📒 De la Agenda</option>
                </select>
                <button type="submit" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">
                  Anotar
                </button>
             </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => {
              const child = children.find(c => c.id === note.childId);
              return (
                <div key={note.id} className="bg-yellow-50 p-6 rounded-[2rem] border border-yellow-100 shadow-sm relative group hover:rotate-1 transition-all">
                  <button onClick={() => onDeleteNote(note.id)} className="absolute top-4 right-4 text-red-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">✕</button>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{child?.avatar}</span>
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">{child?.name}</span>
                  </div>
                  <p className="text-indigo-900 font-bold leading-relaxed">"{note.text}"</p>
                  <div className="mt-4 flex justify-between items-center border-t border-yellow-200/50 pt-3">
                    <span className="text-[9px] font-black text-indigo-300 uppercase">{note.source}</span>
                    <span className="text-[9px] text-indigo-300">{new Date(note.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
            {filteredNotes.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold italic">No hay notas rápidas. ¡Día tranquilo!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'inbox' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-black text-indigo-900">Buzón de Comunicaciones</h3>
            <button 
              onClick={onSyncEmails}
              className="bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-200 transition-all flex items-center gap-2"
            >
              🔄 Sincronizar Correos
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-indigo-50 shadow-sm overflow-hidden divide-y divide-indigo-50">
            {filteredComms.map(comm => {
              const child = children.find(c => c.id === comm.childId);
              const type = commTypeLabels[comm.type];
              return (
                <div 
                  key={comm.id} 
                  onClick={() => onMarkRead(comm.id)}
                  className={`p-6 flex flex-col md:flex-row gap-6 cursor-pointer hover:bg-indigo-50/30 transition-all ${!comm.isRead ? 'bg-indigo-50/10' : ''}`}
                >
                  <div className="flex items-center gap-4 md:w-48 flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${type.color}`}>
                      {comm.isImportant && !comm.isRead ? '🔴' : type.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-400">{type.label}</p>
                      <p className="font-black text-indigo-900">{child?.name}</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-lg font-black text-indigo-900 ${!comm.isRead ? 'font-black' : 'font-bold opacity-70'}`}>
                        {comm.subject}
                      </h4>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{comm.date}</span>
                    </div>
                    <p className="text-sm text-indigo-500 line-clamp-1 mb-2 font-medium">De: {comm.sender}</p>
                    <p className={`text-sm text-indigo-800 leading-relaxed ${!comm.isRead ? 'font-bold' : 'opacity-60'}`}>
                      {comm.content}
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredComms.length === 0 && (
              <div className="py-20 text-center text-indigo-300 italic">La bandeja de entrada está vacía.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolHub;
