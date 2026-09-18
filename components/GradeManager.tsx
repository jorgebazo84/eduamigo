
import React, { useState, useEffect } from 'react';
import { AcademicGrade, Child, GradeLevel, Term, Region, StudyPlan } from '../types';
import { getOfficialSubjects, generateReinforcementPlan } from '../services/geminiService';

interface GradeManagerProps {
  children: Child[];
  grades: AcademicGrade[];
  onAddGrade: (grade: Omit<AcademicGrade, 'id' | 'timestamp'>) => void;
  onDeleteGrade: (id: string) => void;
  onSetReinforcementPlan: (childId: string, plan: StudyPlan) => void;
}

const TERMS: Term[] = ['1ª Evaluación', '2ª Evaluación', '3ª Evaluación', 'Final'];
const GRADES_QUALITATIVE = ['Insuficiente', 'Suficiente', 'Bien', 'Notable', 'Sobresaliente'];

const GradeManager: React.FC<GradeManagerProps> = ({ children, grades, onAddGrade, onDeleteGrade, onSetReinforcementPlan }) => {
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id || '');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel>(children[0]?.grade || '1º Primaria');
  const [selectedTerm, setSelectedTerm] = useState<Term>('1ª Evaluación');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isNumeric, setIsNumeric] = useState(true);
  const [numericValue, setNumericValue] = useState<number>(5);
  const [qualitativeValue, setQualitativeValue] = useState<string>('Suficiente');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const selectedChild = children.find(c => c.id === selectedChildId);
  const childRegion: Region = 'Madrid'; // Default to Madrid as per user context, but should be in Child type ideally

  useEffect(() => {
    if (selectedChild) {
      setSelectedGradeLevel(selectedChild.grade);
    }
  }, [selectedChildId]);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const list = await getOfficialSubjects(selectedGradeLevel, childRegion);
        setSubjects(list);
        if (list.length > 0) setSelectedSubject(list[0]);
      } catch (error) {
        console.error("Error loading subjects:", error);
        setSubjects(['Matemáticas', 'Lengua', 'Inglés', 'Ciencias']);
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, [selectedGradeLevel, childRegion]);

  const handleAddGrade = () => {
    onAddGrade({
      childId: selectedChildId,
      subject: selectedSubject,
      gradeLevel: selectedGradeLevel,
      term: selectedTerm,
      value: isNumeric ? numericValue : qualitativeValue,
      isNumeric
    });
  };

  const handleGeneratePlan = async () => {
    if (!selectedChildId) return;
    setGeneratingPlan(true);
    try {
      const childGrades = grades.filter(g => g.childId === selectedChildId);
      const plan = await generateReinforcementPlan(selectedGradeLevel, childRegion, childGrades);
      onSetReinforcementPlan(selectedChildId, plan);
      alert("✨ ¡Plan de refuerzo generado y enviado al planificador del niño!");
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("No se pudo generar el plan en este momento.");
    } finally {
      setGeneratingPlan(false);
    }
  };

  const filteredGrades = grades.filter(g => g.childId === selectedChildId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg text-2xl">📝</div>
          <div>
            <h2 className="text-2xl font-black text-blue-900">Gestor de Notas Académicas</h2>
            <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">Control de progresión y refuerzo IA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Hijo/a</label>
                <select 
                  value={selectedChildId}
                  onChange={e => setSelectedChildId(e.target.value)}
                  className="w-full bg-blue-50 p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                >
                  {children.map(c => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Curso</label>
                <select 
                  value={selectedGradeLevel}
                  onChange={e => setSelectedGradeLevel(e.target.value as GradeLevel)}
                  className="w-full bg-blue-50 p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                >
                  {['1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria', '1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º Bachillerato', '2º Bachillerato'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Evaluación</label>
                <select 
                  value={selectedTerm}
                  onChange={e => setSelectedTerm(e.target.value as Term)}
                  className="w-full bg-blue-50 p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                >
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-400 uppercase ml-2">Asignatura</label>
                <select 
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  disabled={loadingSubjects}
                  className="w-full bg-blue-50 p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all disabled:opacity-50"
                >
                  {loadingSubjects ? <option>Cargando...</option> : subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="p-6 bg-blue-50 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-blue-900">Tipo de Nota</label>
                <div className="flex bg-white p-1 rounded-xl border border-blue-100">
                  <button 
                    onClick={() => setIsNumeric(true)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${isNumeric ? 'bg-blue-600 text-white' : 'text-blue-400'}`}
                  >
                    Numérica
                  </button>
                  <button 
                    onClick={() => setIsNumeric(false)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${!isNumeric ? 'bg-blue-600 text-white' : 'text-blue-400'}`}
                  >
                    Texto
                  </button>
                </div>
              </div>

              {isNumeric ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-blue-600">
                    <span>0</span>
                    <span className="text-lg font-black">{numericValue}</span>
                    <span>10</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.5"
                    value={numericValue}
                    onChange={e => setNumericValue(parseFloat(e.target.value))}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ) : (
                <select 
                  value={qualitativeValue}
                  onChange={e => setQualitativeValue(e.target.value)}
                  className="w-full bg-white p-4 rounded-2xl text-sm font-bold outline-none border-2 border-blue-100 focus:border-blue-500 transition-all"
                >
                  {GRADES_QUALITATIVE.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              )}
            </div>

            <button 
              onClick={handleAddGrade}
              className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all transform active:scale-95"
            >
              Añadir Calificación
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-blue-900">Histórico de Notas</h3>
              <button 
                onClick={handleGeneratePlan}
                disabled={generatingPlan || filteredGrades.length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {generatingPlan ? '⏳ Generando...' : '✨ Plan Refuerzo IA'}
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
              {filteredGrades.length === 0 ? (
                <div className="text-center py-12 opacity-30">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="text-xs font-bold">No hay notas registradas para este niño.</p>
                </div>
              ) : (
                filteredGrades.sort((a,b) => b.timestamp - a.timestamp).map(grade => (
                  <div key={grade.id} className="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm flex justify-between items-center group">
                    <div>
                      <p className="text-xs font-black text-blue-900">{grade.subject}</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">{grade.term} • {grade.gradeLevel}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-lg text-xs font-black ${
                        grade.isNumeric 
                        ? (Number(grade.value) >= 5 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')
                        : (grade.value === 'Insuficiente' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')
                      }`}>
                        {grade.value}
                      </div>
                      <button 
                        onClick={() => onDeleteGrade(grade.id)}
                        className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeManager;
