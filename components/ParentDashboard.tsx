
import React, { useState } from 'react';
import { HistoryItem, ExamResult, Child, Reward, GradeLevel, CalendarEvent, Task, StudentRequest, SchoolCommunication, QuickNote, LocationState, Coordinate, AcademicGrade, StudyPlan, AICorrection, DailyStudyReport, ReviewPlan } from '../types';
import AgendaManager from './AgendaManager';
import RequestManager from './RequestManager';
import SchoolHub from './SchoolHub';
import ChildManager from './ChildManager';
import RewardManager from './RewardManager';
import LocationHub from './LocationHub';
import CalligraphyHistory from './CalligraphyHistory';
import ReadingHistory from './ReadingHistory';
import MathHistory from './MathHistory';
import EnglishHistory from './english/EnglishHistory';
import SRSHistory from './SRSHistory';
import GradeManager from './GradeManager';
import AICorrectionManager from './AICorrectionManager';
import ParentReviewManager from './ParentReviewManager';

interface ParentDashboardProps {
  userId: string;
  history: HistoryItem[];
  examHistory: ExamResult[];
  children: Child[];
  rewards: Reward[];
  events: CalendarEvent[];
  tasks: Task[];
  requests: StudentRequest[];
  communications: SchoolCommunication[];
  quickNotes: QuickNote[];
  locationStates: LocationState[];
  onSelectItem: (item: HistoryItem) => void;
  onAddChild: (name: string, grade: GradeLevel, avatar: string) => void;
  onUpdateChild: (id: string, name: string, grade: GradeLevel, avatar: string) => void;
  onDeleteChild: (id: string) => void;
  onUpdateRewards: (rewards: Reward[]) => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onApproveRequest: (requestId: string, dueDate: string) => void;
  onRejectRequest: (requestId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddQuickNote: (note: Omit<QuickNote, 'id' | 'timestamp'>) => void;
  onDeleteQuickNote: (id: string) => void;
  onSyncSchoolComms: () => void;
  onMarkCommRead: (id: string) => void;
  onToggleTracking: (id: string) => void;
  onSetLocationPoint: (id: string, type: 'home' | 'school', coord: Coordinate, address?: string) => void;
  onSearchAddress: (childId: string, address: string, type: 'home' | 'school') => Promise<string | null>;
  onReverseGeocode: (childId: string, coord: Coordinate, type: 'home' | 'school') => Promise<string>;
  academicGrades: AcademicGrade[];
  onAddGrade: (grade: Omit<AcademicGrade, 'id' | 'timestamp'>) => void;
  onDeleteGrade: (id: string) => void;
  onSetReinforcementPlan: (childId: string, plan: StudyPlan) => void;
  aiCorrections: AICorrection[];
  onAddAICorrection: (correction: Omit<AICorrection, 'id' | 'timestamp'>) => void;
  onDeleteAICorrection: (id: string) => void;
  dailyReports: DailyStudyReport[];
  reviewPlans: ReviewPlan[];
  books: any[];
  onCreateReviewPlan: (plan: Omit<ReviewPlan, 'id' | 'status'>) => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ 
  userId, history, examHistory, children, rewards, events, tasks, requests, communications, quickNotes, locationStates,
  onSelectItem, onAddChild, onUpdateChild, onDeleteChild, onUpdateRewards, onAddEvent, onDeleteEvent, onAddTask, onToggleTask, onDeleteTask,
  onApproveRequest, onRejectRequest, onUpdateTask, onAddQuickNote, onDeleteQuickNote, onSyncSchoolComms, onMarkCommRead,
  onToggleTracking, onSetLocationPoint, onSearchAddress, onReverseGeocode,
  academicGrades, onAddGrade, onDeleteGrade, onSetReinforcementPlan,
  aiCorrections, onAddAICorrection, onDeleteAICorrection,
  dailyReports, reviewPlans, books, onCreateReviewPlan
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'children' | 'rewards' | 'agenda' | 'inbox' | 'school' | 'location' | 'calligraphy' | 'reading' | 'math' | 'english' | 'grades' | 'ai-corrections' | 'daily-review' | 'srs'>('stats');
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id || '');
  
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const unreadCommsCount = communications.filter(c => !c.isRead).length;
  const activeTrackingCount = locationStates.filter(s => s.isTracking).length;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-2 p-1 bg-blue-100 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('stats')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>📊 Stats</button>
        <button onClick={() => setActiveTab('calligraphy')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'calligraphy' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}>✍️ Caligrafía</button>
        <button onClick={() => setActiveTab('reading')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'reading' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>📖 Lectura</button>
        <button onClick={() => setActiveTab('math')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'math' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-500'}`}>🔢 Mates</button>
        <button onClick={() => setActiveTab('english')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'english' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>🇬🇧 Inglés</button>
        <button onClick={() => setActiveTab('grades')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'grades' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>📝 Notas</button>
        <button onClick={() => setActiveTab('srs')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'srs' ? 'bg-white text-orange-600 shadow-sm' : 'text-orange-500'}`}>🧠 SRS</button>
        <button onClick={() => setActiveTab('daily-review')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'daily-review' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}>🧠 Repaso Diario</button>
        <button onClick={() => setActiveTab('ai-corrections')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'ai-corrections' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}>🧠 Corrección IA</button>
        <button onClick={() => setActiveTab('school')} className={`relative px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'school' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}>
          🏫 Escuela
          {unreadCommsCount > 0 && <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{unreadCommsCount}</span>}
        </button>
        <button onClick={() => setActiveTab('location')} className={`relative px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'location' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}>
          🚶 Rutas
          {activeTrackingCount > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse">●</span>}
        </button>
        <button onClick={() => setActiveTab('inbox')} className={`relative px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'inbox' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>
          📥 Peticiones
          {pendingRequestsCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse">{pendingRequestsCount}</span>}
        </button>
        <button onClick={() => setActiveTab('agenda')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'agenda' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>🗓️ Agenda</button>
        <button onClick={() => setActiveTab('children')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'children' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>👥 Hijos</button>
        <button onClick={() => setActiveTab('rewards')} className={`px-4 md:px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'rewards' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}>🎁 Premios</button>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in fade-in">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-blue-50 shadow-sm">
              <p className="text-blue-400 text-[10px] font-black uppercase mb-1">Consultas IA</p>
              <p className="text-4xl font-black text-blue-900">{history.length}</p>
            </div>
            <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-xl text-white">
              <p className="text-indigo-100 text-[10px] font-black uppercase mb-1">Exámenes</p>
              <p className="text-4xl font-black">{examHistory.length}</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-blue-50 shadow-sm text-center">
              <p className="text-blue-400 text-[10px] font-black uppercase mb-1">Total Puntos</p>
              <p className="text-4xl font-black text-yellow-600">⭐ {children.reduce((acc, c) => acc + c.points, 0)}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calligraphy' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${
                  selectedChildId === child.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {child.avatar} {child.name}
              </button>
            ))}
          </div>
          {selectedChildId && <CalligraphyHistory userId={userId} childId={selectedChildId} />}
        </div>
      )}

      {activeTab === 'reading' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${
                  selectedChildId === child.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {child.avatar} {child.name}
              </button>
            ))}
          </div>
          {selectedChildId && <ReadingHistory userId={userId} childId={selectedChildId} />}
        </div>
      )}

      {activeTab === 'math' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${
                  selectedChildId === child.id 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {child.avatar} {child.name}
              </button>
            ))}
          </div>
          {selectedChildId && <MathHistory userId={userId} childId={selectedChildId} />}
        </div>
      )}

      {activeTab === 'english' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${
                  selectedChildId === child.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {child.avatar} {child.name}
              </button>
            ))}
          </div>
          {selectedChildId && <EnglishHistory userId={userId} childId={selectedChildId} />}
        </div>
      )}

      {activeTab === 'location' && (
        <LocationHub 
          viewMode="parent" 
          child={null} 
          locationStates={locationStates} 
          onToggleTracking={onToggleTracking} 
          onSetPoint={onSetLocationPoint}
          onSearchAddress={onSearchAddress}
          onReverseGeocode={onReverseGeocode}
        />
      )}

      {activeTab === 'grades' && (
        <GradeManager 
          children={children} 
          grades={academicGrades} 
          onAddGrade={onAddGrade} 
          onDeleteGrade={onDeleteGrade} 
          onSetReinforcementPlan={onSetReinforcementPlan}
        />
      )}

      {activeTab === 'srs' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-black transition-all ${
                  selectedChildId === child.id 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {child.avatar} {child.name}
              </button>
            ))}
          </div>
          {selectedChildId && <SRSHistory userId={userId} childId={selectedChildId} />}
        </div>
      )}

      {activeTab === 'ai-corrections' && (
        <AICorrectionManager 
          children={children} 
          corrections={aiCorrections} 
          onAddCorrection={onAddAICorrection} 
          onDeleteCorrection={onDeleteAICorrection} 
        />
      )}

      {activeTab === 'daily-review' && (
        <ParentReviewManager 
          children={children} 
          reports={dailyReports} 
          reviewPlans={reviewPlans} 
          books={books} 
          onCreatePlan={onCreateReviewPlan} 
        />
      )}

      {activeTab === 'school' && (
        <SchoolHub 
          children={children} 
          communications={communications} 
          quickNotes={quickNotes}
          onAddNote={onAddQuickNote}
          onDeleteNote={onDeleteQuickNote}
          onSyncEmails={onSyncSchoolComms}
          onMarkRead={onMarkCommRead}
        />
      )}

      {activeTab === 'inbox' && (
        <RequestManager 
          requests={requests} 
          tasks={tasks} 
          children={children} 
          onApprove={onApproveRequest} 
          onReject={onRejectRequest} 
          onUpdateTask={onUpdateTask} 
          onDeleteTask={onDeleteTask} 
        />
      )}

      {activeTab === 'agenda' && (
        <AgendaManager 
          children={children} 
          events={events} 
          tasks={tasks}
          onAddEvent={onAddEvent}
          onDeleteEvent={onDeleteEvent}
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
        />
      )}

      {activeTab === 'children' && (
        <ChildManager 
          children={children} 
          onAddChild={onAddChild} 
          onUpdateChild={onUpdateChild}
          onDeleteChild={onDeleteChild}
        />
      )}

      {activeTab === 'rewards' && (
        <RewardManager 
          rewards={rewards} 
          onUpdateRewards={onUpdateRewards} 
        />
      )}
    </div>
  );
};

export default ParentDashboard;
