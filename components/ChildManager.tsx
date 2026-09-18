
import React, { useState } from 'react';
import { Child, GradeLevel } from '../types';

interface ChildManagerProps {
  children: Child[];
  onAddChild: (name: string, grade: GradeLevel, avatar: string) => void;
  onUpdateChild: (id: string, name: string, grade: GradeLevel, avatar: string) => void;
  onDeleteChild: (id: string) => void;
}

const avatars = ['👦', '👧', '👨‍🎓', '👩‍🎓', '🦁', '🦊', '🚀', '🎨'];
const grades: GradeLevel[] = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO',
  '1º Bachillerato', '2º Bachillerato'
];

const ChildManager: React.FC<ChildManagerProps> = ({ children, onAddChild, onUpdateChild, onDeleteChild }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('1º Primaria');
  const [avatar, setAvatar] = useState('👦');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    if (editingId) {
      onUpdateChild(editingId, name, grade, avatar);
    } else {
      onAddChild(name, grade, avatar);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setGrade('1º Primaria');
    setAvatar('👦');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (child: Child) => {
    setName(child.name);
    setGrade(child.grade);
    setAvatar(child.avatar);
    setEditingId(child.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-blue-900">Gestión de Hijos</h3>
        <button 
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-blue-700 transition-all"
        >
          {showForm ? 'Cancelar' : '+ Añadir Hijo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] border-2 border-blue-600 shadow-xl animate-in zoom-in duration-300 space-y-4">
          <h4 className="font-black text-blue-900">{editingId ? 'Editar Hijo' : 'Nuevo Hijo'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Nombre</label>
              <input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre del estudiante"
                className="w-full bg-blue-50 p-3 rounded-xl font-bold outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Curso</label>
              <select 
                value={grade}
                onChange={e => setGrade(e.target.value as GradeLevel)}
                className="w-full bg-blue-50 p-3 rounded-xl font-bold outline-none"
              >
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-blue-400 uppercase ml-2 block mb-2">Selecciona un Avatar</label>
            <div className="flex flex-wrap gap-2">
              {avatars.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-2xl w-12 h-12 rounded-xl flex items-center justify-center transition-all ${avatar === a ? 'bg-blue-600 scale-110 shadow-lg' : 'bg-blue-50 hover:bg-blue-100'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg">
            {editingId ? 'Guardar Cambios ✨' : 'Dar de Alta Estudiante 🚀'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.map(child => (
          <div key={child.id} className="bg-white p-6 rounded-[2rem] border border-blue-50 shadow-sm text-center group hover:border-blue-200 transition-all relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleEdit(child)}
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                title="Editar"
              >
                ✏️
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de que quieres eliminar a ${child.name}?`)) {
                    onDeleteChild(child.id);
                  }
                }}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                title="Eliminar"
              >
                🗑️
              </button>
            </div>
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{child.avatar}</div>
            <h4 className="font-black text-blue-900">{child.name}</h4>
            <p className="text-xs font-bold text-blue-400 mb-2">{child.grade}</p>
            <div className="inline-flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full text-[10px] font-black text-yellow-700">
              ⭐ {child.points} Puntos
            </div>
          </div>
        ))}
        {children.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold italic">No hay hijos registrados todavía.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildManager;
