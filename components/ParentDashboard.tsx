import React, { useState, useEffect } from 'react';
import { Child, Reward, GradeLevel, CalendarEvent, Task } from '../types';
import ParentTutorPanel from './ParentTutorPanel';
import AgendaManager from './AgendaManager';
import ChildManager from './ChildManager';
import RewardManager from './RewardManager';
import ParentRewardsPanel from './rewards/ParentRewardsPanel';
import { rewardsService } from '../services/rewardsService';
import CalligraphyHistory from './CalligraphyHistory';
import ReadingStatsPanel from './ReadingStatsPanel';
import MathStatsPanel from './MathStatsPanel';
import EnglishHistory from './english/EnglishHistory';
import GamesParentPanel from './parent/GamesParentPanel';
import ParentReviewPanel from './review/ParentReviewPanel';
import { WorksheetHub } from './worksheets/WorksheetHub';
import ParentOverview from './parent/ParentOverview';
import ParentReport from './parent/ParentReport';
import SchoolGradesPanel from './parent/SchoolGradesPanel';
import SentReportsPanel from './parent/SentReportsPanel';
import StudyModuleContainer from './StudyModuleContainer';
import CircularScanner from './parent/CircularScanner';

type Tab = 'summary' | 'worksheets' | 'progress' | 'rewards' | 'family';
type Area = 'reading' | 'math' | 'review' | 'calligraphy' | 'english' | 'tutor' | 'games';
type FamilySection = 'children' | 'agenda' | 'grades' | 'books' | 'reports';

interface ParentDashboardProps {
  userId: string;
  children: Child[];
  rewards: Reward[];
  events: CalendarEvent[];
  tasks: Task[];
  onAddChild: (name: string, grade: GradeLevel, avatar: string) => void;
  onUpdateChild: (id: string, name: string, grade: GradeLevel, avatar: string) => void;
  onDeleteChild: (id: string) => void;
  onUpdateRewards: (rewards: Reward[]) => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  books: any[];
  onAwardPointsToChild?: (childId: string, points: number) => void;
  /** Pestaña con la que se abre el panel ('children' = Familia → Hijos, 'worksheets'…) */
  initialTab?: string;
  onChangePin?: () => void;
  isDemo?: boolean;
  tutorAlerts?: number;
  onTutorAlertsSeen?: () => void;
  onChildPointsChanged?: (childId: string, newPoints: number) => void;
  /** Volver a la app del niño */
  onExit?: () => void;
}

const AREAS: { id: Area; label: string }[] = [
  { id: 'reading', label: '📖 Lectura' }, { id: 'math', label: '🔢 Mates' }, { id: 'review', label: '🧠 Repasar' },
  { id: 'calligraphy', label: '✍️ Caligrafía' }, { id: 'english', label: '🇬🇧 Inglés' }, { id: 'tutor', label: '💬 Tutor' }, { id: 'games', label: '🎮 Juegos' },
];
const FAMILY: { id: FamilySection; label: string }[] = [
  { id: 'children', label: '👥 Hijos y PIN' }, { id: 'agenda', label: '🗓️ Agenda y exámenes' },
  { id: 'grades', label: '📝 Notas del cole' }, { id: 'books', label: '📚 Libros del cole' }, { id: 'reports', label: '🚩 Avisos de errores' },
];

const mapInitial = (t?: string): { tab: Tab; family?: FamilySection } => {
  if (t === 'children') return { tab: 'family', family: 'children' };
  if (t === 'worksheets') return { tab: 'worksheets' };
  if (t === 'rewards') return { tab: 'rewards' };
  return { tab: 'summary' };
};

const ParentDashboard: React.FC<ParentDashboardProps> = ({
  userId, children, rewards, events, tasks,
  onAddChild, onUpdateChild, onDeleteChild, onUpdateRewards, onAddEvent, onDeleteEvent, onAddTask, onToggleTask, onDeleteTask,
  books, onAwardPointsToChild, initialTab, onChangePin, isDemo, tutorAlerts = 0, onTutorAlertsSeen, onChildPointsChanged, onExit,
}) => {
  const init = mapInitial(initialTab);
  const [tab, setTab] = useState<Tab>(init.tab);
  const [area, setArea] = useState<Area>('reading');
  const [family, setFamily] = useState<FamilySection>(init.family || 'children');
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id || '');
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [pendingRewards, setPendingRewards] = useState<{ total: number; byChild: Record<string, number> }>({ total: 0, byChild: {} });

  const refreshPendingRewards = () => {
    if (isDemo) return;
    rewardsService.pendingRequests().then(setPendingRewards).catch(() => {});
  };
  useEffect(() => { refreshPendingRewards(); }, [isDemo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!children.find((c) => c.id === selectedChildId)) setSelectedChildId(children[0]?.id || '');
  }, [children, selectedChildId]);

  const selected = children.find((c) => c.id === selectedChildId) || null;

  const goTo = (t: 'rewards' | 'progress' | 'family' | 'worksheets', childId: string, sub?: string) => {
    if (childId) setSelectedChildId(childId);
    if (t === 'progress' && sub) setArea(sub as Area);
    if (t === 'family') setFamily((sub as FamilySection) || 'children');
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabBtn = (id: Tab, label: string, badge = 0) => (
    <button key={id} onClick={() => setTab(id)} data-testid={`ptab-${id}`}
      className={`relative shrink-0 px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all ${tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-500 hover:text-blue-700'}`}>
      {label}
      {badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center" data-testid={id === 'rewards' ? 'pending-rewards-badge' : undefined}>{badge}</span>}
    </button>
  );

  const childPicker = (color = 'bg-blue-600') => children.length > 1 && (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" data-testid="child-picker">
      {children.map((child) => (
        <button key={child.id} onClick={() => setSelectedChildId(child.id)}
          className={`relative flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${selectedChildId === child.id ? `${color} text-white shadow-md` : 'bg-white border border-slate-200 text-slate-500'}`}>
          {child.avatar} {child.name}
          {tab === 'rewards' && (pendingRewards.byChild[child.id] || 0) > 0 && <span className="ml-2 bg-red-500 text-white rounded-full px-1.5">{pendingRewards.byChild[child.id]}</span>}
        </button>
      ))}
    </div>
  );

  const subBtn = (active: boolean, onClick: () => void, label: string, key: string) => (
    <button key={key} onClick={onClick} data-testid={`sub-${key}`}
      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${active ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{label}</button>
  );

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500" data-testid="parent-dashboard">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-blue-900">Panel de padres</h2>
          <p className="text-xs font-bold text-slate-400">Solo vosotros podéis ver esta zona.</p>
        </div>
        {onExit && (
          <button onClick={onExit} className="bg-white border-2 border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black hover:border-blue-300" data-testid="exit-parent">
            ← Volver a la app de mi hijo
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar bg-blue-100/60 p-1.5 rounded-2xl" role="tablist">
        {tabBtn('summary', '📋 Resumen', tutorAlerts)}
        {tabBtn('worksheets', '📑 Fichas y deberes')}
        {tabBtn('progress', '📈 Progreso')}
        {tabBtn('rewards', '🎁 Puntos y premios', pendingRewards.total)}
        {tabBtn('family', '👨‍👩‍👧 Familia')}
      </div>

      {tab === 'summary' && (
        <ParentOverview children={children} isDemo={!!isDemo} onGoTo={goTo} onOpenReport={(id) => setReportFor(id)} />
      )}

      {tab === 'worksheets' && (
        <WorksheetHub childrenList={children} books={books} userRole={isDemo ? 'demo' : 'parent'} isParentUnlocked={true} isDemo={isDemo} onAwardPoints={onAwardPointsToChild} />
      )}

      {tab === 'progress' && (
        <div className="space-y-4 animate-in fade-in">
          {childPicker()}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {AREAS.map((a) => subBtn(area === a.id, () => setArea(a.id), a.label, a.id))}
          </div>
          {selected && area === 'reading' && <ReadingStatsPanel key={selected.id} childId={selected.id} isDemo={!!isDemo} />}
          {selected && area === 'math' && <MathStatsPanel key={selected.id} childId={selected.id} grade={selected.grade} isDemo={!!isDemo} />}
          {selected && area === 'review' && <ParentReviewPanel key={selected.id} children={[selected]} isDemo={!!isDemo} />}
          {selected && area === 'calligraphy' && <CalligraphyHistory key={selected.id} childId={selected.id} isDemo={!!isDemo} />}
          {selected && area === 'english' && <EnglishHistory key={selected.id} childId={selected.id} isDemo={!!isDemo} />}
          {selected && area === 'games' && <GamesParentPanel key={selected.id} childId={selected.id} childName={selected.name} isDemo={!!isDemo} />}
          {selected && area === 'tutor' && <ParentTutorPanel key={selected.id} children={[selected]} isDemo={!!isDemo} onAlertsSeen={onTutorAlertsSeen} />}
          {!selected && <p className="text-sm text-slate-500">Añade un hijo en Familia para ver su progreso.</p>}
        </div>
      )}

      {tab === 'rewards' && (
        <div className="space-y-8 animate-in fade-in">
          {childPicker('bg-amber-500')}
          {selected && (
            <ParentRewardsPanel key={selected.id} childId={selected.id} childName={selected.name} isDemo={!!isDemo}
              onPointsChanged={(cid, np) => { onChildPointsChanged?.(cid, np); refreshPendingRewards(); }} />
          )}
          <RewardManager rewards={rewards} onUpdateRewards={onUpdateRewards} />
        </div>
      )}

      {tab === 'family' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {FAMILY.map((f) => subBtn(family === f.id, () => setFamily(f.id), f.label, f.id))}
          </div>
          {family === 'children' && (
            <>
              {onChangePin && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
                  <div>
                    <p className="text-sm font-black text-indigo-900">PIN de padres</p>
                    <p className="text-[11px] font-bold text-indigo-400">Protege esta zona. Se pide cada vez que entráis.</p>
                  </div>
                  <button onClick={onChangePin} className="bg-white text-indigo-600 border-2 border-indigo-100 px-4 py-2 rounded-xl text-xs font-black hover:border-indigo-300">Cambiar PIN</button>
                </div>
              )}
              <ChildManager children={children} onAddChild={onAddChild} onUpdateChild={onUpdateChild} onDeleteChild={onDeleteChild} />
            </>
          )}
          {family === 'agenda' && (
            <>
              <p className="text-xs text-slate-500 bg-blue-50 rounded-xl px-4 py-2">Los exámenes que apuntéis aquí hacen que Repasar adelante ese tema para llegar preparado.</p>
              <CircularScanner children={children} isDemo={!!isDemo} onAddEvent={onAddEvent} />
              <AgendaManager children={children} events={events} tasks={tasks} onAddEvent={onAddEvent} onDeleteEvent={onDeleteEvent} onAddTask={onAddTask} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} />
            </>
          )}
          {family === 'grades' && (
            <>
              {childPicker()}
              {selected ? <SchoolGradesPanel key={selected.id} childId={selected.id} childName={selected.name} grade={selected.grade} isDemo={!!isDemo} /> : <p className="text-sm text-slate-500">Añade un hijo primero.</p>}
            </>
          )}
          {family === 'books' && (
            <>
              {childPicker()}
              <p className="text-xs text-slate-500 bg-blue-50 rounded-xl px-4 py-2">Los temas de sus libros aparecen en su Biblioteca con explicación y esquema. También podéis pedirle que resuma un tema con sus palabras.</p>
              {selected ? <StudyModuleContainer key={selected.id} userId={userId} childId={selected.id} userRole="parent" grade={selected.grade} isDemo={!!isDemo} /> : <p className="text-sm text-slate-500">Añade un hijo primero.</p>}
            </>
          )}
          {family === 'reports' && <SentReportsPanel isDemo={!!isDemo} />}
        </div>
      )}

      {reportFor && (
        <ParentReport childId={reportFor} childName={children.find((c) => c.id === reportFor)?.name || ''} isDemo={!!isDemo} onClose={() => setReportFor(null)} />
      )}
    </div>
  );
};

export default ParentDashboard;
