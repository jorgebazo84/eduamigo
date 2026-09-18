
import React, { useState } from 'react';

interface StudentRequestFormProps {
  onSend: (title: string, message: string) => void;
  onClose: () => void;
}

const StudentRequestForm: React.FC<StudentRequestFormProps> = ({ onSend, onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    onSend(title, message);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-blue-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white max-w-lg w-full rounded-[3rem] p-10 shadow-2xl border-4 border-blue-600 animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✨</span>
          </div>
          <h2 className="text-3xl font-black text-blue-900 tracking-tight">Solicitar algo al Tutor</h2>
          <p className="text-gray-500 font-bold mt-2">Dime qué necesitas y le llegará un aviso a tus padres.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-blue-400 uppercase ml-2 mb-1 block">¿Qué necesitas?</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-blue-50 p-4 rounded-2xl outline-none font-bold text-blue-900 border-2 border-transparent focus:border-blue-600"
              placeholder="Ej: Material escolar, Excursión..."
              required
            />
          </div>
          <div>
            <label className="text-xs font-black text-blue-400 uppercase ml-2 mb-1 block">Cuéntales un poco más</label>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)}
              className="w-full bg-blue-50 p-4 rounded-2xl outline-none font-bold text-blue-900 border-2 border-transparent focus:border-blue-600 min-h-[100px] resize-none"
              placeholder="Ej: Necesito comprar cartulinas para el trabajo de Plástica de mañana."
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button type="submit" className="bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all text-lg">
              Enviar Solicitud ✨
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 font-bold py-2">
              Cerrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRequestForm;
