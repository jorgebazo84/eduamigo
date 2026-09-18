
import React, { useState } from 'react';
import { Reward } from '../types';

interface RewardManagerProps {
  rewards: Reward[];
  onUpdateRewards: (rewards: Reward[]) => void;
}

const icons = ['🎁', '🍦', '🎮', '🚲', '🎬', '📱', '⚽', '🍭', '🧸'];

const RewardManager: React.FC<RewardManagerProps> = ({ rewards, onUpdateRewards }) => {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(100);
  const [icon, setIcon] = useState('🎁');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    const newReward: Reward = {
      id: crypto.randomUUID(),
      title,
      pointsCost: points,
      icon
    };
    onUpdateRewards([...rewards, newReward]);
    setTitle('');
    setShowForm(false);
  };

  const deleteReward = (id: string) => {
    onUpdateRewards(rewards.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-blue-900">Configuración de Premios</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-blue-700 transition-all"
        >
          {showForm ? 'Cancelar' : '+ Crear Premio'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] border-2 border-yellow-500 shadow-xl animate-in zoom-in duration-300 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Título del Premio</label>
              <input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Media hora de consola"
                className="w-full bg-blue-50 p-3 rounded-xl font-bold outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Coste en Puntos</label>
              <input 
                type="number"
                value={points}
                onChange={e => setPoints(parseInt(e.target.value))}
                className="w-full bg-blue-50 p-3 rounded-xl font-bold outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-blue-400 uppercase ml-2 block mb-2">Icono del Premio</label>
            <div className="flex flex-wrap gap-2">
              {icons.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`text-2xl w-12 h-12 rounded-xl flex items-center justify-center transition-all ${icon === i ? 'bg-yellow-500 scale-110 shadow-lg' : 'bg-blue-50 hover:bg-blue-100'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-xl font-black shadow-lg">
            Guardar Premio en Catálogo 🎁
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map(reward => (
          <div key={reward.id} className="bg-white p-5 rounded-3xl border border-blue-50 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="text-3xl bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center">{reward.icon}</div>
              <div>
                <h4 className="font-bold text-blue-900 leading-tight">{reward.title}</h4>
                <p className="text-[10px] font-black text-blue-400 uppercase">{reward.pointsCost} puntos</p>
              </div>
            </div>
            <button 
              onClick={() => deleteReward(reward.id)}
              className="text-red-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        {rewards.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold italic">No hay premios definidos todavía.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardManager;
