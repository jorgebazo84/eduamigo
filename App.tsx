
import React, { useState, useEffect, useRef } from 'react';
import { GradeLevel, Subject, ExplanationResponse, HistoryItem, ViewMode, UserRole, Region, ExamResult, Child, Reward, Country, CalendarEvent, Task, StudentRequest, EventType, SchoolCommunication, QuickNote, LocationState, Coordinate, RoutePoint, Insight, AcademicGrade, StudyPlan, AICorrection, DailyStudyReport, ReviewPlan } from './types';
import { requestNotificationPermission, checkUpcomingEvents, sendLocalNotification } from './services/notificationService';
import { getExplanation, generateSpeech, getSyllabus, getTopicDetail, generateExam, analyzeExamResults, searchAddressViaGemini, reverseGeocodeViaGemini, generateStudyPlan, evaluateReviewTask } from './services/geminiService';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import ParentDashboard from './components/ParentDashboard';
import Login from './components/Login';
import AuthScreen from './components/AuthScreen';
import ParentAuthModal from './components/ParentAuthModal';
import LibraryBrowser from './components/LibraryBrowser';
import ExamMode from './components/ExamMode';
import ChildSelector from './components/ChildSelector';
import RewardsShop from './components/RewardsShop';
import SOSModal from './components/SOSModal';
import StudentInquiry from './components/StudentInquiry';
import ChatInterface from './components/ChatInterface';
import LocationHub from './components/LocationHub';
import VisionTutor from './components/VisionTutor';
import OralPractice from './components/OralPractice';
import GamificationCenter from './components/GamificationCenter';
import StudyPlanner from './components/StudyPlanner';
import SchoolDocumentScanner from './components/SchoolDocumentScanner';
import StudyModuleContainer from './components/StudyModuleContainer';
import CalligraphyModule from './components/CalligraphyModule';
import ReadingModule from './components/ReadingModule';
import MathModule from './components/MathModule';
import SRSReviewModule from './components/SRSReviewModule';
import PomodoroTimer from './components/PomodoroTimer';
import StaticContentLibrary from './components/StaticContentLibrary';
import { srsService } from './services/srsService';
import DailyStudyRecorder from './components/DailyStudyRecorder';
import ReviewTaskModule from './components/ReviewTaskModule';
import EnglishModule from './components/english/EnglishModule';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [parentPin, setParentPin] = useState('1234');
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ask');
  const [region, setRegion] = useState<Region>('Madrid');
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [communications, setCommunications] = useState<SchoolCommunication[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [locationStates, setLocationStates] = useState<LocationState[]>([]);
  const [academicGrades, setAcademicGrades] = useState<AcademicGrade[]>([]);
  const [studyPlans, setStudyPlans] = useState<Record<string, StudyPlan>>({});
  const [aiCorrections, setAiCorrections] = useState<AICorrection[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyStudyReport[]>([]);
  const [reviewPlans, setReviewPlans] = useState<ReviewPlan[]>([]);
  const [activeSRSReview, setActiveSRSReview] = useState<{ topic: string, subject: Subject, id: string } | null>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagStatus, setDiagStatus] = useState<{ key: string; status: string }>({ key: 'Checking...', status: 'Idle' });

  const handleStartSRSReview = (topic: string, subject: Subject, reviewId: string) => {
    setActiveSRSReview({ topic, subject, id: reviewId });
    setViewMode('exam');
  };

  const handleCompleteSRSReview = async (reviewId: string) => {
    if (activeChildId) {
      await srsService.completeReview(reviewId, activeChildId);
      setActiveSRSReview(null);
    }
  };

  const activeChild = children.find(c => c.id === activeChildId) || null;

  const runDiagnostics = async () => {
    const key = process.env.GEMINI_API_KEY;
    const keyPreview = key ? `${key.substring(0, 5)}...${key.substring(key.length - 4)}` : 'MISSING';
    setDiagStatus({ key: keyPreview, status: 'Testing connection...' });
    
    try {
      const { ai } = await import('./services/geminiService');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hi",
      });
      if (response.text) {
        setDiagStatus({ key: keyPreview, status: '✅ Success!' });
      } else {
        setDiagStatus({ key: keyPreview, status: '❌ Empty response' });
      }
    } catch (e: any) {
      setDiagStatus({ key: keyPreview, status: `❌ Error: ${e.message}` });
    }
  };
  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDemoData = () => {
    const demoChild: Child = { 
      id: 'demo-hugo', name: 'Hugo Invitado', avatar: '👦', points: 120, grade: '4º Primaria', 
      badges: ['math-10'], streak: { current: 3, lastActive: Date.now(), multiplier: 1.2 } 
    };
    const demoRewards: Reward[] = [
      { id: 'r1', title: '30 min Consola', pointsCost: 500, icon: '🎮' },
      { id: 'r2', title: 'Pizza Familiar', pointsCost: 1000, icon: '🍕' }
    ];
    setChildren([demoChild]);
    setRewards(demoRewards);
    setActiveChildId('demo-hugo');
  };

  const loadServerData = async (uid: string) => {
    if (userRole === 'demo') return;
    try {
      const response = await fetch(`api.php?action=get_initial_data&userId=${uid}`);
      const data = await response.json();
      
      if (data.children) {
        const mappedChildren = data.children.map((c: any) => ({
          ...c,
          streak: {
            current: parseInt(c.streak_current) || 1,
            lastActive: parseInt(c.streak_lastActive) || Date.now(),
            multiplier: parseFloat(c.streak_multiplier) || 1.0
          }
        }));
        setChildren(mappedChildren);
      }
      
      if (data.rewards) setRewards(data.rewards);
      if (data.history) setHistory(data.history);
      if (data.examHistory) setExamHistory(data.examHistory);
      if (data.events) setEvents(data.events);
      if (data.tasks) setTasks(data.tasks);
      if (data.requests) setRequests(data.requests);
      if (data.communications) setCommunications(data.communications);
      if (data.quickNotes) setQuickNotes(data.quickNotes);
      if (data.aiCorrections) setAiCorrections(data.aiCorrections);
      if (data.academicGrades) setAcademicGrades(data.academicGrades);
      if (data.books) setBooks(data.books);
      if (data.dailyReports) setDailyReports(data.dailyReports);
      if (data.reviewPlans) setReviewPlans(data.reviewPlans);
    } catch (e) { 
      console.error("Error cargando datos:", e);
    }
  };

  useEffect(() => {
    const savedId = sessionStorage.getItem('eduamigo_userId');
    const savedPin = sessionStorage.getItem('eduamigo_pin');
    const savedRole = sessionStorage.getItem('eduamigo_role') as UserRole;

    if (savedRole === 'demo') {
      setUserRole('demo');
      setIsAuthenticated(true);
      loadDemoData();
    } else if (savedId) {
      setUserId(savedId);
      setParentPin(savedPin || '1234');
      setUserRole('parent');
      setIsAuthenticated(true);
      loadServerData(savedId);
    }
    setRegion(localStorage.getItem('eduamigo_region') as Region || 'Madrid');
    requestNotificationPermission();
  }, []);

  const handleUpdateRewards = async (newRewards: Reward[]) => {
    const added = newRewards.find(nr => !rewards.find(r => r.id === nr.id));
    const removed = rewards.find(r => !newRewards.find(nr => nr.id === r.id));

    setRewards(newRewards);

    if (userRole !== 'demo' && userId) {
      if (added) {
        await fetch(`api.php?action=add_reward&userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(added)
        });
        showToast("Premio añadido", "success");
      } else if (removed) {
        await fetch(`api.php?action=delete_reward&userId=${userId}&id=${removed.id}`, { method: 'DELETE' });
        showToast("Premio eliminado", "info");
      }
    }
  };

  const handleAddEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    const id = crypto.randomUUID();
    const fullEvent = { ...event, id };
    setEvents([...events, fullEvent]);
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=add_event&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent)
      });
      showToast("Evento agendado", "success");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=delete_event&id=${id}`, { method: 'DELETE' });
    }
  };

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    const id = crypto.randomUUID();
    const fullTask = { ...task, id };
    setTasks([...tasks, fullTask]);
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=add_task&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullTask)
      });
    }
  };

  const handleToggleTask = async (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=toggle_task&id=${id}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=delete_task&id=${id}`, { method: 'DELETE' });
    }
  };

  const handleAddChild = async (name: string, grade: GradeLevel, avatar: string) => {
    const newChild: Child = {
      id: crypto.randomUUID(),
      name, grade, avatar, points: 0, badges: [],
      streak: { current: 1, lastActive: Date.now(), multiplier: 1.0 }
    };
    setChildren([...children, newChild]);
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=add_child&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChild)
      });
      showToast("Hijo registrado", "success");
    }
  };

  const handleUpdateChild = async (id: string, name: string, grade: GradeLevel, avatar: string) => {
    setChildren(children.map(c => c.id === id ? { ...c, name, grade, avatar } : c));
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=update_child&id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, grade, avatar })
      });
      showToast("Información actualizada", "success");
    }
  };

  const handleDeleteChild = async (id: string) => {
    setChildren(children.filter(c => c.id !== id));
    if (activeChildId === id) setActiveChildId(null);
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=delete_child&id=${id}`, { method: 'DELETE' });
      showToast("Hijo eliminado", "info");
    }
  };

  const handleAuthenticated = (uid: string, email: string, pin: string) => {
    setUserId(uid);
    setParentPin(pin);
    setUserRole('parent');
    sessionStorage.setItem('eduamigo_userId', uid);
    sessionStorage.setItem('eduamigo_pin', pin);
    sessionStorage.setItem('eduamigo_role', 'parent');
    setIsAuthenticated(true);
    showToast("¡Bienvenido al Aula Virtual!", "success");
    loadServerData(uid);
  };

  const handleDemoMode = () => {
    setUserRole('demo');
    setIsAuthenticated(true);
    sessionStorage.setItem('eduamigo_role', 'demo');
    loadDemoData();
    showToast("Modo Invitado Activo.", "info");
  };

  const handleViewChange = (mode: ViewMode) => {
    if (mode === 'parent' && !isParentUnlocked && userRole !== 'demo') {
      setShowAuthModal(true);
      return;
    }
    if (mode === 'parent' && userRole === 'demo') {
      setIsParentUnlocked(true);
    }
    if (['planner', 'exam', 'voice', 'ask', 'chat', 'reading', 'math', 'english', 'location', 'vision', 'scanner', 'calligraphy', 'daily-report', 'daily-review'].includes(mode) && !activeChildId) {
      showToast("Selecciona un perfil", "info");
      setViewMode('ask');
      return;
    }
    setViewMode(mode);
  };

  const handleInquirySuccess = async (question: string, subject: Subject, answer: ExplanationResponse) => {
    if (!activeChildId || !activeChild) return;
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      childId: activeChildId,
      grade: activeChild.grade,
      subject, region, question, answer,
      timestamp: Date.now()
    };
    if (userRole !== 'demo' && userId) {
      fetch(`api.php?action=save_history&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    }
    setHistory(prev => [newItem, ...prev].slice(0, 100));
    awardPoints(5);
  };

  const handleActivityLog = async (question: string, subject: Subject, answer: any) => {
    if (!activeChildId || !activeChild) return;
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      childId: activeChildId,
      grade: activeChild.grade,
      subject,
      region,
      question,
      answer,
      timestamp: Date.now(),
      duration: answer?.duration,
      sentiment: answer?.sentiment,
      imageUrl: answer?.imageUrl,
      audioUrl: answer?.audioUrl,
      transcription: answer?.transcription
    };
    if (userRole !== 'demo' && userId) {
      await fetch(`api.php?action=save_history&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    }
    setHistory(prev => [newItem, ...prev].slice(0, 100));
  };

  const awardPoints = async (points: number) => {
    if (!activeChildId) return;
    const updatedChildren = children.map(c => {
      if (c.id === activeChildId) {
        const updated = { ...c, points: c.points + points, streak: { ...c.streak, lastActive: Date.now() } };
        if (userRole !== 'demo' && userId) {
          fetch(`api.php?action=update_child_points&userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          });
        }
        return updated;
      }
      return c;
    });
    setChildren(updatedChildren);
    showToast(`¡Ganas ${points} puntos! ⭐`, "success");
  };

  const handleToggleTracking = (childId: string) => {
    setLocationStates(prev => {
      const existing = prev.find(s => s.childId === childId);
      if (existing) {
        return prev.map(s => s.childId === childId ? { ...s, isTracking: !s.isTracking } : s);
      }
      return [...prev, { childId, isTracking: true, currentPath: [], lastUpdate: Date.now() }];
    });
  };

  const handleSetLocationPoint = (childId: string, type: 'home' | 'school', coord: Coordinate, address?: string) => {
    setLocationStates(prev => {
      const existing = prev.find(s => s.childId === childId);
      const update = type === 'home' ? { homePoint: { coord, address } } : { schoolPoint: { coord, address } };
      if (existing) {
        return prev.map(s => s.childId === childId ? { ...s, ...update } : s);
      }
      return [...prev, { childId, isTracking: false, currentPath: [], lastUpdate: Date.now(), ...update }];
    });
  };

  const handleSearchAddress = async (childId: string, address: string, type: 'home' | 'school') => {
    try {
      const result = await searchAddressViaGemini(address);
      if (result) {
        handleSetLocationPoint(childId, type, result.coord, result.address);
        return result.address;
      }
      return null;
    } catch (error) {
      console.error("Error searching address:", error);
      return null;
    }
  };

  const handleReverseGeocode = async (childId: string, coord: Coordinate, type: 'home' | 'school') => {
    try {
      const address = await reverseGeocodeViaGemini(coord);
      handleSetLocationPoint(childId, type, coord, address);
      return address;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return "Dirección desconocida";
    }
  };

  const handleAddQuickNote = (note: Omit<QuickNote, 'id' | 'timestamp'>) => {
    const newNote: QuickNote = { ...note, id: crypto.randomUUID(), timestamp: Date.now() };
    setQuickNotes([newNote, ...quickNotes]);
  };

  const handleDeleteQuickNote = (id: string) => {
    setQuickNotes(quickNotes.filter(n => n.id !== id));
  };

  const handleMarkCommRead = (id: string) => {
    setCommunications(communications.map(c => c.id === id ? { ...c, isRead: true } : c));
  };

  const handleAddGrade = (grade: Omit<AcademicGrade, 'id' | 'timestamp'>) => {
    const newGrade: AcademicGrade = {
      ...grade,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setAcademicGrades([newGrade, ...academicGrades]);
    showToast("Nota registrada", "success");
  };

  const handleDeleteGrade = (id: string) => {
    setAcademicGrades(academicGrades.filter(g => g.id !== id));
  };

  const handleSetReinforcementPlan = (childId: string, plan: StudyPlan) => {
    setStudyPlans(prev => ({ ...prev, [childId]: plan }));
  };

  const handleAddAICorrection = (correction: Omit<AICorrection, 'id' | 'timestamp'>) => {
    const newCorrection: AICorrection = {
      ...correction,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setAiCorrections([newCorrection, ...aiCorrections]);
    showToast("Corrección guardada para la IA", "success");
  };

  const handleDeleteAICorrection = (id: string) => {
    setAiCorrections(aiCorrections.filter(c => c.id !== id));
  };

  const handleToggleSession = (childId: string, sessionId: string) => {
    setStudyPlans(prev => {
      const plan = prev[childId];
      if (!plan) return prev;
      return {
        ...prev,
        [childId]: {
          ...plan,
          sessions: plan.sessions.map(s => 
            s.id === sessionId ? { ...s, completed: !s.completed, completedAt: !s.completed ? Date.now() : undefined } : s
          )
        }
      };
    });
  };

  const handleLoadStudyPlan = async (childId: string) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    setLoadingPlan(true);
    try {
      const childEvents = events.filter(e => e.childId === childId);
      const childExams = examHistory.filter(e => e.childId === childId);
      const plan = await generateStudyPlan(child.grade, childEvents, childExams);
      setStudyPlans(prev => ({ ...prev, [childId]: plan }));
    } catch (e) {
      console.error(e);
      showToast("Error al generar el plan", "error");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleAddDailyReport = async (report: Omit<DailyStudyReport, 'id' | 'timestamp' | 'status'>) => {
    const newReport: DailyStudyReport = {
      ...report,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      status: 'pending'
    };
    setDailyReports([newReport, ...dailyReports]);
    showToast("¡Buen trabajo! He avisado a tus padres de lo que has estudiado hoy.", "success");

    if (userRole !== 'demo' && userId) {
      try {
        await fetch(`api.php?action=add_daily_report&userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReport)
        });
      } catch (e) { console.error(e); }
    }
  };

  const handleCreateReviewPlan = async (plan: Omit<ReviewPlan, 'id' | 'status'>) => {
    const newPlan: ReviewPlan = {
      ...plan,
      id: crypto.randomUUID(),
      status: 'pending'
    };
    setReviewPlans([newPlan, ...reviewPlans]);
    setDailyReports(dailyReports.map(r => r.id === plan.reportId ? { ...r, status: 'reviewed' } : r));
    showToast("Plan de repaso creado y enviado.", "success");

    if (userRole !== 'demo' && userId) {
      try {
        await fetch(`api.php?action=create_review_plan&userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPlan)
        });
      } catch (e) { console.error(e); }
    }
  };

  const handleActivateReviewPlan = (id: string) => {
    setReviewPlans(reviewPlans.map(p => p.id === id ? { ...p, status: 'active' } : p));
  };

  const handleCompleteReviewTask = async (planId: string, taskId: string, answer: string) => {
    const plan = reviewPlans.find(p => p.id === planId);
    if (!plan) return;
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) return;

    const evaluation = await evaluateReviewTask(activeChild?.grade || '1º Primaria', task, answer);
    
    const updatedPlans = reviewPlans.map(p => {
      if (p.id === planId) {
        const updatedTasks = p.tasks.map(t => 
          t.id === taskId ? { ...t, completed: true, answer, ...evaluation } : t
        );
        const allCompleted = updatedTasks.every(t => t.completed);
        const newStatus = allCompleted ? 'completed' : p.status;
        
        if (userRole !== 'demo' && userId) {
          fetch(`api.php?action=update_review_plan&id=${planId}&userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: updatedTasks, status: newStatus })
          }).catch(console.error);
        }

        return { ...p, tasks: updatedTasks, status: newStatus };
      }
      return p;
    });
    setReviewPlans(updatedPlans);

    awardPoints(10);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.clear();
    setUserId(null);
    setUserRole(null);
    setChildren([]);
    setActiveChildId(null);
    setIsParentUnlocked(false);
    showToast("Sesión cerrada.");
  };

  if (!isAuthenticated) return <AuthScreen onAuthenticated={handleAuthenticated} onDemo={handleDemoMode} />;
  if (!userRole) return <Login onLogin={setUserRole} onLogout={handleLogout} />;
  
  if (viewMode !== 'parent' && !activeChildId) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] p-8 flex flex-col items-center justify-center relative">
        {toast && (
          <div className="absolute top-6 bg-white shadow-xl px-6 py-3 rounded-full border border-blue-50 text-xs font-black animate-in slide-in-from-top duration-300">
            {toast.msg}
          </div>
        )}
        <ChildSelector children={children} onSelect={(c) => { setActiveChildId(c.id); showToast(`¡Hola ${c.name}!`, "success"); }} onAddChild={() => setViewMode('parent')} />
        <button onClick={handleLogout} className="mt-8 text-blue-400 font-bold hover:underline">
          {userRole === 'demo' ? 'Volver al Inicio (Salir de Demo)' : 'Cerrar Sesión'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f0f9ff]">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-white shadow-2xl px-6 py-3 rounded-full border border-blue-100 text-xs font-black animate-in slide-in-from-top duration-300 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
          {toast.msg}
        </div>
      )}

      {showDiagnostics && (
        <div className="fixed bottom-24 right-6 z-[300] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 text-[10px] font-mono w-64">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-blue-400">DIAGNÓSTICO IA</span>
            <button onClick={() => setShowDiagnostics(false)}>✕</button>
          </div>
          <div className="space-y-1">
            <p>API KEY: <span className="text-yellow-400">{diagStatus.key}</span></p>
            <p>STATUS: <span className={diagStatus.status.includes('✅') ? 'text-green-400' : 'text-red-400'}>{diagStatus.status}</span></p>
          </div>
          <button 
            onClick={runDiagnostics}
            className="mt-3 w-full py-1 bg-blue-600 rounded-lg font-bold hover:bg-blue-500 transition-colors"
          >
            RE-TEST
          </button>
        </div>
      )}

      {showAuthModal && <ParentAuthModal correctPin={parentPin} onResult={(s) => { setIsParentUnlocked(s); if(s) setViewMode('parent'); setShowAuthModal(false); }} onCancel={() => setShowAuthModal(false)} />}
      {showSOSModal && <SOSModal onSelect={() => { setViewMode('ask'); setShowSOSModal(false); }} onClose={() => setShowSOSModal(false)} />}
      
      <aside className="hidden md:flex w-80 bg-white border-r border-blue-100 p-6 flex-col h-screen sticky top-0 overflow-y-auto no-scrollbar">
        {activeChild && <GamificationCenter child={activeChild} />}
        <div className="mt-8">
          <HistorySidebar history={history.filter(h => h.childId === activeChildId)} onSelect={() => setViewMode('ask')} />
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-32 relative">
        <Header 
          viewMode={viewMode} 
          setViewMode={handleViewChange} 
          userRole={userRole} 
          activeChild={activeChild} 
          onLogout={handleLogout}
        />
        
        <div className="mt-8">
          {userRole === 'student' && activeChildId && (
            <div className="mb-8">
              <SRSReviewModule childId={activeChildId} onStartReview={handleStartSRSReview} />
            </div>
          )}
          {viewMode === 'ask' && activeChild && (
            <div className="space-y-8">
              <StudyModuleContainer 
                userId={userId || 'demo'} 
                childId={activeChildId || 'demo-hugo'} 
                userRole={userRole} 
                grade={activeChild?.grade || '4º Primaria'} 
                onViewChange={handleViewChange}
              />
              <StudentInquiry childName={activeChild.name} grade={activeChild.grade} region={region} onSuccess={handleInquirySuccess} onSOS={() => setShowSOSModal(true)} />
            </div>
          )}
          {viewMode === 'chat' && activeChild && <ChatInterface grade={activeChild.grade} subject="Matemáticas" region={region} onActivityLog={handleActivityLog} />}
          {viewMode === 'library' && (
            <div className="space-y-8">
              {activeChildId && (
                <StudyModuleContainer 
                  userId={userId || localStorage.getItem('eduamigo_user_id') || 'demo'}
                  childId={activeChildId || 'demo'}
                  userRole={userRole} 
                  grade={activeChild?.grade || '1º Primaria'}
                  onViewChange={handleViewChange}
                />
              )}
              <LibraryBrowser region={region} grade={activeChild?.grade || '1º Primaria'} setGrade={() => {}} onViewChange={handleViewChange} />
            </div>
          )}
          {viewMode === 'planner' && activeChild && (
            <StudyPlanner 
              child={activeChild} 
              events={events.filter(e => e.childId === activeChildId)} 
              examResults={examHistory.filter(e => e.childId === activeChildId)} 
              plan={studyPlans[activeChild.id] || null}
              loading={loadingPlan}
              onLoadPlan={() => handleLoadStudyPlan(activeChild.id)}
              onToggleSession={(sid) => handleToggleSession(activeChild.id, sid)}
            />
          )}
          {viewMode === 'exam' && activeChild && (
            <ExamMode 
              grade={activeChild.grade} 
              subject="Matemáticas" 
              region={region} 
              childId={activeChild.id} 
              onSaveResult={(r) => {
                setExamHistory([r, ...examHistory]); 
                awardPoints(r.pointsEarned);
              }} 
              initialTopic={activeSRSReview?.topic}
              initialSubject={activeSRSReview?.subject}
              srsReviewId={activeSRSReview?.id}
              onCompleteSRS={handleCompleteSRSReview}
            />
          )}
          {viewMode === 'voice' && activeChild && <OralPractice grade={activeChild.grade} subject="Inglés" onActivityLog={handleActivityLog} />}
          {viewMode === 'calligraphy' && activeChild && <CalligraphyModule userId={userId || 'demo'} childId={activeChild.id} childName={activeChild.name} grade={activeChild.grade} onAwardPoints={awardPoints} onActivityLog={handleActivityLog} />}
          {viewMode === 'reading' && activeChild && <ReadingModule userId={userId || 'demo'} childId={activeChild.id} childName={activeChild.name} grade={activeChild.grade} onAwardPoints={awardPoints} onActivityLog={handleActivityLog} />}
          {viewMode === 'math' && activeChild && <MathModule userId={userId || 'demo'} childId={activeChild.id} childName={activeChild.name} grade={activeChild.grade} onAwardPoints={awardPoints} onActivityLog={handleActivityLog} />}
          {viewMode === 'static-library' && activeChild && <StaticContentLibrary grade={activeChild.grade} />}
          {viewMode === 'pomodoro' && activeChild && (
            <PomodoroTimer 
              onAwardPoints={awardPoints} 
              onClose={() => setViewMode('ask')} 
            />
          )}
          {viewMode === 'english' && activeChild && <EnglishModule child={activeChild} userId={userId || 'demo'} onActivityLog={handleActivityLog} />}
          {viewMode === 'location' && activeChild && (
            <LocationHub 
              viewMode={userRole === 'parent' ? 'parent' : 'student'} 
              child={activeChild} 
              locationStates={locationStates} 
              onToggleTracking={handleToggleTracking} 
              onSetPoint={handleSetLocationPoint} 
              onSearchAddress={handleSearchAddress} 
              onReverseGeocode={handleReverseGeocode} 
            />
          )}
          {viewMode === 'vision' && activeChild && <VisionTutor grade={activeChild.grade} onActivityLog={handleActivityLog} />}
          {viewMode === 'scanner' && activeChild && <SchoolDocumentScanner childId={activeChild.id} onEventAdded={handleAddEvent} />}
          {viewMode === 'daily-report' && activeChild && (
            <DailyStudyRecorder 
              child={activeChild} 
              books={books} 
              onAddReport={handleAddDailyReport} 
            />
          )}
          {viewMode === 'daily-review' && activeChild && (
            <div className="space-y-8">
              {reviewPlans.filter(p => p.childId === activeChildId && (p.status === 'active' || p.status === 'completed')).map(plan => (
                <ReviewTaskModule 
                  key={plan.id} 
                  child={activeChild} 
                  plan={plan} 
                  onCompleteTask={handleCompleteReviewTask} 
                />
              ))}
              {reviewPlans.filter(p => p.childId === activeChildId && (p.status === 'active' || p.status === 'completed')).length === 0 && (
                <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-blue-100 text-center opacity-60">
                  <div className="text-4xl mb-4">🧘</div>
                  <p className="text-blue-900 font-black">No tienes planes de repaso activos.</p>
                  <p className="text-blue-400 text-xs font-bold mt-2">¡Disfruta de tu tiempo libre!</p>
                </div>
              )}
            </div>
          )}
          {viewMode === 'shop' && activeChild && <RewardsShop child={activeChild} rewards={rewards} />}
          {viewMode === 'parent' && (
            <ParentDashboard 
              userId={userId || 'demo'}
              history={history} 
              examHistory={examHistory} 
              children={children} 
              rewards={rewards} 
              events={events} 
              tasks={tasks} 
              requests={requests}
              communications={communications} 
              quickNotes={quickNotes} 
              locationStates={locationStates}
              onSelectItem={() => {}} 
              onAddChild={handleAddChild} 
              onUpdateRewards={handleUpdateRewards} 
              onAddEvent={handleAddEvent} 
              onDeleteEvent={handleDeleteEvent} 
              onAddTask={handleAddTask} 
              onToggleTask={handleToggleTask} 
              onDeleteTask={handleDeleteTask} 
              onApproveRequest={(id, date) => {
                setRequests(requests.map(r => r.id === id ? { ...r, status: 'approved' } : r));
                handleAddTask({ childId: requests.find(r => r.id === id)?.childId || '', title: `Petición: ${requests.find(r => r.id === id)?.title}`, dueDate: date, completed: false, priority: 'medium' });
              }} 
              onRejectRequest={(id) => setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r))} 
              onUpdateTask={() => {}} 
              onAddQuickNote={handleAddQuickNote} 
              onDeleteQuickNote={handleDeleteQuickNote} 
              onSyncSchoolComms={() => showToast("Sincronizando con el colegio...", "info")} 
              onMarkCommRead={handleMarkCommRead} 
              onToggleTracking={handleToggleTracking} 
              onSetLocationPoint={handleSetLocationPoint} 
              onSearchAddress={handleSearchAddress} 
              onReverseGeocode={handleReverseGeocode}
              academicGrades={academicGrades}
              onAddGrade={handleAddGrade}
              onDeleteGrade={handleDeleteGrade}
              onSetReinforcementPlan={handleSetReinforcementPlan}
              onUpdateChild={handleUpdateChild}
              onDeleteChild={handleDeleteChild}
              aiCorrections={aiCorrections}
              onAddAICorrection={handleAddAICorrection}
              onDeleteAICorrection={handleDeleteAICorrection}
              dailyReports={dailyReports}
              reviewPlans={reviewPlans}
              books={books}
              onCreateReviewPlan={handleCreateReviewPlan}
            />
          )}
        </div>

        <div className="mt-20 pt-10 border-t border-blue-100 flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black tracking-widest text-blue-900">DISEÑADO POR</span>
              <div className="flex items-center">
                 <span className="font-black text-xs text-blue-900 tracking-tighter">EWOLA</span>
                 <span className="font-black text-xs text-[#00B4D8] tracking-tighter">J21</span>
              </div>
              <span className="bg-[#00B4D8] text-[#001220] px-1.5 py-0.5 rounded text-[8px] font-black">V.1.0.1</span>
           </div>
           <p className="text-[8px] font-bold text-blue-400">TECHNOLOGY FOR EDUCATION PLATFORM • 2025</p>
           {userRole === 'demo' && (
             <button onClick={handleLogout} className="mt-4 text-[10px] font-black text-blue-600 hover:underline">
               SALIR DEL MODO DEMOSTRACIÓN
             </button>
           )}
        </div>

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-blue-50 flex gap-4 z-40">
           <button onClick={() => setShowDiagnostics(true)} title="Diagnóstico" className="p-2 rounded-xl text-slate-400 hover:text-blue-600">🛠️</button>
           <button onClick={() => handleViewChange('ask')} title="Estudiar" className={`p-2 rounded-xl transition-all ${viewMode === 'ask' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>💡</button>
           <button onClick={() => handleViewChange('chat')} title="Chat IA" className={`p-2 rounded-xl transition-all ${viewMode === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>💬</button>
           <button onClick={() => handleViewChange('library')} title="Estudio Reglado" className={`p-2 rounded-xl transition-all ${viewMode === 'library' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📚</button>
           <button onClick={() => handleViewChange('calligraphy')} title="Caligrafía" className={`p-2 rounded-xl transition-all ${viewMode === 'calligraphy' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>✍️</button>
           <button onClick={() => handleViewChange('reading')} title="Lectura" className={`p-2 rounded-xl transition-all ${viewMode === 'reading' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📖</button>
           <button onClick={() => handleViewChange('math')} title="Matemáticas" className={`p-2 rounded-xl transition-all ${viewMode === 'math' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🔢</button>
           <button onClick={() => handleViewChange('english')} title="English Academy" className={`p-2 rounded-xl transition-all ${viewMode === 'english' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🇬🇧</button>
           <button onClick={() => handleViewChange('vision')} title="Vision Tutor" className={`p-2 rounded-xl transition-all ${viewMode === 'vision' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📷</button>
           <button onClick={() => handleViewChange('scanner')} title="Escáner Escolar" className={`p-2 rounded-xl transition-all ${viewMode === 'scanner' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📄</button>
           <button onClick={() => handleViewChange('location')} title="Ubicación" className={`p-2 rounded-xl transition-all ${viewMode === 'location' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📍</button>
           <button onClick={() => handleViewChange('voice')} title="Práctica Oral" className={`p-2 rounded-xl transition-all ${viewMode === 'voice' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🎙️</button>
           <button onClick={() => handleViewChange('daily-report')} title="Informar Estudio" className={`p-2 rounded-xl transition-all ${viewMode === 'daily-report' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📝</button>
           <button onClick={() => handleViewChange('daily-review')} title="Repaso Diario" className={`p-2 rounded-xl transition-all ${viewMode === 'daily-review' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🧠</button>
           <button onClick={() => handleViewChange('shop')} title="Recompensas" className={`p-2 rounded-xl transition-all ${viewMode === 'shop' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🎁</button>
        </div>
      </main>
    </div>
  );
};

export default App;
