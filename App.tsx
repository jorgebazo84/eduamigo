
import React, { useState, useEffect, useRef } from 'react';
import { GradeLevel, Subject, ExplanationResponse, HistoryItem, ViewMode, UserRole, Region, ExamResult, Child, Reward, Country, CalendarEvent, Task, StudentRequest, EventType, SchoolCommunication, QuickNote, LocationState, Coordinate, RoutePoint, Insight, AcademicGrade, StudyPlan, AICorrection } from './types';
import { requestNotificationPermission, checkUpcomingEvents, sendLocalNotification } from './services/notificationService';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import ParentDashboard from './components/ParentDashboard';
import Login from './components/Login';
import AuthScreen from './components/AuthScreen';
import ParentAuthModal from './components/ParentAuthModal';
import SetPinModal from './components/SetPinModal';
import { authService } from './services/authService';
import LibraryBrowser from './components/LibraryBrowser';
import ExamMode, { ReviewTarget } from './components/ExamMode';
import type { WorksheetIntent } from './components/MathModule';
import RepasarView from './components/review/RepasarView';
import TodayReviewBanner from './components/review/TodayReviewBanner';
import ChildSelector from './components/ChildSelector';
import RewardsShop from './components/RewardsShop';
import TutorChat from './components/TutorChat';
import { tutorService, TutorConversationSummary } from './services/tutorService';
import GamificationCenter from './components/GamificationCenter';
import { useRewards } from './components/rewards/useRewards';
import CelebrationModal from './components/rewards/CelebrationModal';
import { rewardsService } from './services/rewardsService';
import MyWeek from './components/MyWeek';
import StudyModuleContainer from './components/StudyModuleContainer';
import CalligraphyModule from './components/CalligraphyModule';
import ReadingModule from './components/ReadingModule';
import MathModule from './components/MathModule';
import PomodoroTimer from './components/PomodoroTimer';
import EnglishModule from './components/english/EnglishModule';
import GamesZone from './components/games/GamesZone';
import { WorksheetHub } from './components/worksheets/WorksheetHub';
import { APP_VERSION, APP_YEAR } from './version';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { offlineStorageService } from './services/offlineStorageService';

// Helper de almacenamiento seguro para entornos iframe / sandbox
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try { sessionStorage.setItem(key, value); } catch {}
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key: string): void => {
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
  },
  clear: (): void => {
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Sesión comprobada con el servidor al arrancar (evita enseñar el login un instante)
  const [authChecked, setAuthChecked] = useState(false);
  // Cuenta antigua con PIN débil (p. ej. 1234): hay que elegir uno nuevo
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  // Qué hacer después de meter bien el PIN: abrir el panel, cerrar sesión...
  const [afterPin, setAfterPin] = useState<{ action: 'parent' | 'logout'; tab?: string } | null>(null);
  const [parentInitialTab, setParentInitialTab] = useState<string | undefined>(undefined);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ask');
  const [region, setRegion] = useState<Region>('Madrid');
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);
  // Foto de "No sé hacer este ejercicio" pendiente de abrir en Pregúntame
  const [tutorImage, setTutorImage] = useState<string | null>(null);
  // Mates → Deberes & Fichas: abrir la foto, corregir la pizarra o filtrar las fichas de mates
  const [worksheetIntent, setWorksheetIntent] = useState<WorksheetIntent | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Tutor "Pregúntame": historial de conversaciones del niño activo y conversación a abrir
  const [tutorConversations, setTutorConversations] = useState<TutorConversationSummary[]>([]);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [unseenTutorAlerts, setUnseenTutorAlerts] = useState(0);
  
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [examHistory, setExamHistory] = useState<ExamResult[]>([]);
  // Repaso en curso (desde "Hoy toca repasar") y aviso para refrescar el contador
  const [activeReview, setActiveReview] = useState<ReviewTarget | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [books, setBooks] = useState<any[]>([]);
  
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'success' | 'error' } | null>(null);

  const startReview = (item: ReviewTarget) => {
    setActiveReview(item);
    setViewMode('exam');
  };

  const activeChild = children.find(c => c.id === activeChildId) || null;

  // Puntos, racha, medallas, cromos y premios: siempre los decide el servidor (opción 7)
  const patchChild = (childId: string, patch: Partial<Child>) =>
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, ...patch, streak: { ...c.streak, ...(patch.streak || {}) } } : c));
  const rewardsCtl = useRewards({ child: activeChild, isDemo: userRole === 'demo', demoRewards: rewards, onChildUpdate: patchChild });

  // El servidor ya ha sumado los puntos: se actualiza la pantalla y se mira si hay medallas nuevas
  const applyServerPoints = (childId: string, newPoints: number, earned: number) => {
    patchChild(childId, { points: newPoints });
    if (earned > 0) showToast(`¡Ganas ${earned} puntos! ⭐`, "success");
    setReviewRefresh(n => n + 1);
    if (childId === activeChildId) rewardsCtl.refresh();
  };

  // Un módulo avisa de que el servidor ha podido dar puntos (tutor, fichas, caligrafía…): se piden el saldo y las novedades
  const syncChildPoints = async (childId: string | null) => {
    if (!childId || userRole === 'demo') return;
    const before = children.find(c => c.id === childId)?.points ?? 0;
    let after: number | null = null;
    if (childId === activeChildId) after = (await rewardsCtl.refresh())?.points ?? null;
    else {
      try { const s = await rewardsService.summary(childId); after = s.points; patchChild(childId, { points: s.points }); } catch { /* sin conexión */ }
    }
    if (after !== null && after > before) showToast(`¡Ganas ${after - before} puntos! ⭐`, "success");
  };

  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadDemoData = () => {
    const demoChild: Child = { 
      id: 'demo-hugo', name: 'Hugo Invitado', avatar: '👦', points: 120, grade: '4º Primaria', 
      badges: ['first_step', 'streak3'], streak: { current: 3, best: 5, activeToday: true, lastActive: Date.now() } 
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
          points: Number(c.points) || 0,
          badges: Array.isArray(c.badges) ? c.badges : [],
          streak: c.streak || { current: 0, lastActive: 0 }
        }));
        setChildren(mappedChildren);
      }
      
      if (data.rewards) setRewards(data.rewards);
      if (data.history) setHistory(data.history);
      if (data.examHistory) setExamHistory(data.examHistory);
      if (data.events) setEvents(data.events);
      if (data.tasks) setTasks(data.tasks);
      if (data.books) {
        setBooks(data.books);
        offlineStorageService.cacheBooks(data.books);
      }
    } catch (e) { 
      console.error("Error cargando datos:", e);
      const cachedBooks = offlineStorageService.getCachedBooks();
      if (cachedBooks && cachedBooks.length > 0) {
        setBooks(cachedBooks);
      }
    }
  };

  // Al entrar en el panel de padres se recargan los datos (p. ej. exámenes que ha apuntado el niño)
  useEffect(() => {
    if (viewMode === 'parent' && userId && userRole !== 'demo') loadServerData(userId);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Las versiones anteriores guardaban el PIN en claro en el dispositivo: se borra.
    safeStorage.removeItem('eduamigo_pin');
    const savedRole = safeStorage.getItem('eduamigo_role') as UserRole;

    if (savedRole === 'demo') {
      setUserRole('demo');
      setIsAuthenticated(true);
      loadDemoData();
      setAuthChecked(true);
    } else {
      // La sesión la decide el servidor (cookie), no lo que haya guardado en el navegador.
      authService.me().then((me) => {
        if (me) {
          setUserId(me.userId);
          setUserRole('parent');
          setIsAuthenticated(true);
          setNeedsPinSetup(!!me.needsPinSetup);
          safeStorage.setItem('eduamigo_userId', me.userId);
          loadServerData(me.userId);
        } else {
          safeStorage.removeItem('eduamigo_userId');
          safeStorage.removeItem('eduamigo_role');
        }
        setAuthChecked(true);
      });
    }
    setRegion(safeStorage.getItem('eduamigo_region') as Region || 'Madrid');
    requestNotificationPermission().catch(() => {});
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
      streak: { current: 0, lastActive: 0 }
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

  const handleAuthenticated = (uid: string, email: string, mustSetPin: boolean) => {
    setUserId(uid);
    setUserRole('parent');
    setNeedsPinSetup(mustSetPin);
    setIsParentUnlocked(false);
    safeStorage.setItem('eduamigo_userId', uid);
    safeStorage.setItem('eduamigo_role', 'parent');
    setIsAuthenticated(true);
    showToast("¡Bienvenido al Aula Virtual!", "success");
    loadServerData(uid);
  };

  const handleDemoMode = () => {
    setUserRole('demo');
    setIsAuthenticated(true);
    safeStorage.setItem('eduamigo_role', 'demo');
    loadDemoData();
    showToast("Modo Invitado Activo.", "info");
  };

  // Pide el PIN y, si es correcto, hace la acción indicada.
  const requestParentPin = (action: 'parent' | 'logout', tab?: string) => {
    if (userRole === 'demo') {
      if (action === 'logout') { doLogout(); return; }
      setIsParentUnlocked(true);
      setParentInitialTab(tab);
      setViewMode('parent');
      return;
    }
    setAfterPin({ action, tab });
    setShowAuthModal(true);
  };

  const handleViewChange = (mode: ViewMode) => {
    if (mode === 'exam') setActiveReview(null);
    if (mode === 'parent' && !isParentUnlocked && userRole !== 'demo') {
      requestParentPin('parent');
      return;
    }
    if (mode === 'parent' && userRole === 'demo') {
      setIsParentUnlocked(true);
    }
    if (['planner', 'exam', 'ask', 'chat', 'reading', 'math', 'english', 'vision', 'calligraphy', 'daily-review', 'games'].includes(mode) && !activeChildId) {
      showToast("Selecciona un perfil", "info");
      setViewMode('ask');
      return;
    }
    setViewMode(mode);
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

  // Demo: puntos simulados en el navegador. Con cuenta: los puntos ya los ha dado el servidor; aquí solo se sincroniza.
  const awardPoints = async (points: number) => {
    if (!activeChildId) return;
    if (userRole === 'demo') {
      rewardsCtl.demoEarn(points);
      if (points > 0) showToast(`¡Ganas ${points} puntos! ⭐`, "success");
      return;
    }
    await syncChildPoints(activeChildId);
  };

  const awardPointsToChild = async (childId: string, points: number) => {
    if (userRole === 'demo') {
      if (childId === activeChildId) rewardsCtl.demoEarn(points);
      else patchChild(childId, { points: Math.max(0, (children.find(c => c.id === childId)?.points || 0) + points) });
      if (points > 0) showToast(`¡Ganas ${points} puntos! ⭐`, "success");
      return;
    }
    await syncChildPoints(childId);
  };

  // Cerrar sesión: en una cuenta real lo hace un adulto (con PIN). Si no, el niño
  // se quedaría fuera y haría falta la contraseña para volver a entrar.
  const handleLogout = () => {
    if (userRole !== 'demo' && !isParentUnlocked) {
      requestParentPin('logout');
      return;
    }
    doLogout();
  };

  // Volver a "¿Quién va a estudiar hoy?" sin cerrar la sesión de la familia.
  const handleSwitchProfile = () => {
    setActiveChildId(null);
    setActiveReview(null);
    setViewMode('ask');
  };

  const doLogout = () => {
    if (userRole !== 'demo') authService.logout();
    setIsAuthenticated(false);
    // Solo se borran los datos de sesión: las fichas, cromos y preferencias del dispositivo se conservan.
    ['eduamigo_userId', 'eduamigo_role', 'eduamigo_pin'].forEach(k => safeStorage.removeItem(k));
    setUserId(null);
    setUserRole(null);
    setChildren([]);
    setActiveChildId(null);
    setIsParentUnlocked(false);
    showToast("Sesión cerrada.");
  };

  // --- Zona de padres: se vuelve a bloquear al salir de ella ---
  useEffect(() => {
    if (viewMode !== 'parent' && isParentUnlocked && userRole !== 'demo') {
      setIsParentUnlocked(false);
      setParentInitialTab(undefined);
      authService.lockParent();
    }
  }, [viewMode]);

  // --- y tras 5 minutos sin tocar nada dentro del panel ---
  useEffect(() => {
    if (viewMode !== 'parent' || userRole === 'demo') return;
    let timer: ReturnType<typeof setTimeout>;
    const IDLE_MS = 5 * 60 * 1000;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setViewMode('ask');
        showToast('Zona de padres bloqueada por inactividad', 'info');
      }, IDLE_MS);
    };
    const evts = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    evts.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); evts.forEach(e => window.removeEventListener(e, reset)); };
  }, [viewMode, userRole]);

  // --- Respuestas del servidor que piden volver a entrar o volver a meter el PIN ---
  const roleRef = useRef(userRole);
  roleRef.current = userRole;
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      if (res.status === 401 || res.status === 403) {
        const url = String(args[0] instanceof Request ? args[0].url : args[0]);
        if (!url.includes('auth.php')) {
          res.clone().json().then((body: any) => {
            if (body?.code) window.dispatchEvent(new CustomEvent('eduamigo:auth', { detail: body.code }));
          }).catch(() => {});
        }
      }
      return res;
    };
    const onAuth = (e: Event) => {
      if (roleRef.current === 'demo') return;
      const code = (e as CustomEvent).detail;
      if (code === 'AUTH_REQUIRED') {
        doLogout();
        showToast('Tu sesión ha caducado. Vuelve a iniciar sesión.', 'error');
      } else if (code === 'PIN_REQUIRED') {
        setIsParentUnlocked(false);
        showToast('Por seguridad, vuelve a introducir el PIN y repite la acción.', 'error');
        setAfterPin({ action: 'parent' });
        setShowAuthModal(true);
      }
    };
    window.addEventListener('eduamigo:auth', onAuth);
    return () => { window.fetch = original; window.removeEventListener('eduamigo:auth', onAuth); };
  }, []);

  // --- Tutor: historial del niño activo y avisos sin leer para los padres ---
  const refreshTutorConversations = () => {
    if (userRole === 'demo' || !activeChildId) { setTutorConversations([]); return; }
    tutorService.conversations(activeChildId).then(setTutorConversations);
    // Una respuesta de riesgo crea un aviso: se refresca el globo del botón Padres
    tutorService.unseenAlerts().then(setUnseenTutorAlerts);
  };
  useEffect(() => {
    setOpenConversationId(null);
    refreshTutorConversations();
  }, [activeChildId, userRole]);
  useEffect(() => {
    if (userRole !== 'parent') return;
    tutorService.unseenAlerts().then(setUnseenTutorAlerts);
  }, [userRole, viewMode, activeChildId]);

  // Ventanas de PIN: se muestran en cualquier pantalla (también en "¿Quién va a estudiar hoy?")
  const pinModals = (
    <>
      {showAuthModal && (
        <ParentAuthModal
          reason={afterPin?.action === 'logout' ? 'Introduce el PIN para cerrar la sesión de la familia' : undefined}
          onResult={(ok) => {
            setShowAuthModal(false);
            if (!ok) return;
            const next = afterPin;
            setAfterPin(null);
            if (next?.action === 'logout') { doLogout(); return; }
            setIsParentUnlocked(true);
            setParentInitialTab(next?.tab);
            setViewMode('parent');
          }}
          onCancel={() => { setShowAuthModal(false); setAfterPin(null); }}
        />
      )}
      {needsPinSetup && userRole === 'parent' && (
        <SetPinModal mandatory onDone={() => { setNeedsPinSetup(false); authService.lockParent(); showToast('PIN guardado', 'success'); }} />
      )}
      {showChangePin && (
        <SetPinModal onDone={() => { setShowChangePin(false); showToast('PIN cambiado', 'success'); }} onCancel={() => setShowChangePin(false)} />
      )}
    </>
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f0f9ff] flex items-center justify-center">
        <p className="text-blue-400 font-black animate-pulse">Cargando EduAmigo…</p>
      </div>
    );
  }
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
        {pinModals}
        <ChildSelector children={children} onSelect={(c) => { setActiveChildId(c.id); showToast(`¡Hola ${c.name}!`, "success"); }} onAddChild={() => requestParentPin('parent', 'children')} />
        <button onClick={handleLogout} className="mt-8 text-blue-400 font-bold hover:underline">
          {userRole === 'demo' ? 'Volver al Inicio (Salir de Demo)' : 'Cerrar Sesión'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f0f9ff]">
      <OfflineStatusBanner />
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-white shadow-2xl px-6 py-3 rounded-full border border-blue-100 text-xs font-black animate-in slide-in-from-top duration-300 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
          {toast.msg}
        </div>
      )}

      {pinModals}
      {viewMode !== 'parent' && activeChild && <CelebrationModal ctl={rewardsCtl} />}
      
      <aside className={`${viewMode === 'parent' ? 'hidden' : 'hidden md:flex'} w-80 bg-white border-r border-blue-100 p-6 flex-col h-screen sticky top-0 overflow-y-auto no-scrollbar`}>
        {activeChild && <GamificationCenter ctl={rewardsCtl} onOpenShop={() => handleViewChange('shop')} />}
        <div className="mt-8">
          <HistorySidebar
            items={tutorConversations}
            onSelect={(id) => { setOpenConversationId(id); setViewMode('ask'); }}
          />
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-32 relative">
        <Header 
          viewMode={viewMode} 
          setViewMode={handleViewChange} 
          userRole={userRole} 
          activeChild={activeChild} 
          onLogout={handleLogout}
          onSwitchProfile={children.length > 1 || userRole !== 'demo' ? handleSwitchProfile : undefined}
          parentBadge={unseenTutorAlerts}
        />
        
        <div className="mt-8">
          {viewMode === 'ask' && activeChildId && (
            <div className="mb-8">
              <TodayReviewBanner childId={activeChildId} isDemo={userRole === 'demo'} refreshKey={reviewRefresh} onOpen={() => handleViewChange('daily-review')} />
            </div>
          )}
          {viewMode === 'ask' && activeChild && (
            <div className="space-y-8">
              <StudyModuleContainer 
                userId={userId || 'demo'} 
                childId={activeChildId || 'demo-hugo'} 
                userRole="student"
                grade={activeChild?.grade || '4º Primaria'} 
                onViewChange={handleViewChange}
              />
              <TutorChat
                child={activeChild}
                region={region}
                isDemo={userRole === 'demo'}
                openConversationId={openConversationId}
                onConversationsChanged={refreshTutorConversations}
                onActivity={() => awardPoints(5)}
              />
            </div>
          )}
          {(viewMode === 'chat' || viewMode === 'vision') && activeChild && (
            <TutorChat
              child={activeChild}
              region={region}
              isDemo={userRole === 'demo'}
              openConversationId={openConversationId}
              onConversationsChanged={refreshTutorConversations}
              onActivity={() => awardPoints(5)}
              initialImage={tutorImage}
              onInitialImageUsed={() => setTutorImage(null)}
            />
          )}
          {viewMode === 'library' && activeChild && (
            <LibraryBrowser childId={activeChild.id} grade={activeChild.grade} region={region} isDemo={userRole === 'demo'} />
          )}
          {viewMode === 'planner' && activeChild && (
            <MyWeek child={activeChild} isDemo={userRole === 'demo'} onOpen={(v) => handleViewChange(v)} />
          )}
          {viewMode === 'exam' && activeChild && (
            <ExamMode
              key={activeReview?.id || 'libre'}
              child={activeChild}
              region={region}
              isDemo={userRole === 'demo'}
              reviewItem={activeReview}
              onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)}
              onBack={() => { setActiveReview(null); setViewMode('daily-review'); }}
            />
          )}
          {viewMode === 'calligraphy' && activeChild && <CalligraphyModule childId={activeChild.id} childName={activeChild.name} grade={activeChild.grade} isDemo={userRole === 'demo'} onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)} onDemoPoints={awardPoints} />}
          {viewMode === 'reading' && activeChild && <ReadingModule childId={activeChild.id} childName={activeChild.name} grade={activeChild.grade} isDemo={userRole === 'demo'} onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)} onDemoPoints={awardPoints} onActivityLog={handleActivityLog} />}
          {viewMode === 'math' && activeChild && (
            <MathModule
              childId={activeChild.id}
              childName={activeChild.name}
              grade={activeChild.grade}
              isDemo={userRole === 'demo'}
              onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)}
              onDemoPoints={awardPoints}
              onOpenWorksheets={(intent) => { setWorksheetIntent(intent); setViewMode('worksheets'); }}
              onActivityLog={handleActivityLog}
            />
          )}
          {viewMode === 'pomodoro' && activeChild && (
            <PomodoroTimer 
              childId={activeChild.id}
              grade={activeChild.grade}
              isDemo={userRole === 'demo'}
              onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)}
              onDemoPoints={awardPoints}
              onClose={() => setViewMode('ask')} 
            />
          )}
          {viewMode === 'games' && activeChild && <GamesZone child={activeChild} isDemo={userRole === 'demo'} onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)} onGoStudy={() => handleViewChange('daily-review')} />}
          {viewMode === 'english' && activeChild && <EnglishModule child={activeChild} isDemo={userRole === 'demo'} onPoints={(np, earned) => applyServerPoints(activeChild.id, np, earned)} onDemoPoints={awardPoints} />}
          {viewMode === 'daily-review' && activeChild && (
            <RepasarView
              key={`${activeChild.id}-${reviewRefresh}`}
              child={activeChild}
              isDemo={userRole === 'demo'}
              onStartReview={startReview}
              onFreeTest={() => { setActiveReview(null); setViewMode('exam'); }}
            />
          )}
          {viewMode === 'shop' && activeChild && (
            <>
              {/* En el móvil no hay barra lateral: la racha y las medallas se ven aquí */}
              <div className="md:hidden mb-6"><GamificationCenter ctl={rewardsCtl} /></div>
              <RewardsShop ctl={rewardsCtl} isDemo={userRole === 'demo'} />
            </>
          )}
          {viewMode === 'worksheets' && (
            <div className="animate-in fade-in duration-300">
              <WorksheetHub 
                childrenList={children}
                books={books}
                userRole="student"
                activeChildId={activeChildId}
                isParentUnlocked={false}
                onRequireParentPin={() => requestParentPin('parent', 'worksheets')}
                onAwardPoints={(cId, pts) => awardPointsToChild(cId, pts)}
                isDemo={userRole === 'demo'}
                onAskTutorWithPhoto={(img) => { setTutorImage(img); setViewMode('chat'); }}
                intent={worksheetIntent}
                onIntentConsumed={() => setWorksheetIntent(null)}
              />
            </div>
          )}
          {viewMode === 'parent' && (
            <ParentDashboard 
              initialTab={parentInitialTab}
              isDemo={userRole === 'demo'}
              tutorAlerts={unseenTutorAlerts}
              onTutorAlertsSeen={() => tutorService.unseenAlerts().then(setUnseenTutorAlerts)}
              onChangePin={userRole === 'demo' ? undefined : () => setShowChangePin(true)}
              userId={userId || 'demo'}
              children={children} 
              rewards={rewards} 
              events={events} 
              tasks={tasks} 
              onAddChild={handleAddChild} 
              onUpdateRewards={handleUpdateRewards} 
              onAddEvent={handleAddEvent} 
              onDeleteEvent={handleDeleteEvent} 
              onAddTask={handleAddTask} 
              onToggleTask={handleToggleTask} 
              onDeleteTask={handleDeleteTask} 
              onUpdateChild={handleUpdateChild}
              onDeleteChild={handleDeleteChild}
              books={books}
              onAwardPointsToChild={awardPointsToChild}
              onChildPointsChanged={(cid, np) => { patchChild(cid, { points: np }); if (cid === activeChildId) rewardsCtl.refresh(); }}
              onExit={() => (activeChildId ? handleViewChange('ask') : handleSwitchProfile())}
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
              <span className="bg-[#00B4D8] text-[#001220] px-1.5 py-0.5 rounded text-[8px] font-black">V.{APP_VERSION}</span>
           </div>
           <p className="text-[8px] font-bold text-blue-400">TECHNOLOGY FOR EDUCATION PLATFORM • {APP_YEAR}</p>
           {userRole === 'demo' && (
             <button onClick={handleLogout} className="mt-4 text-[10px] font-black text-blue-600 hover:underline">
               SALIR DEL MODO DEMOSTRACIÓN
             </button>
           )}
        </div>

        {viewMode !== 'parent' && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-blue-50 flex gap-4 z-40">
           <button onClick={() => handleViewChange('ask')} title="Pregúntame" className={`p-2 rounded-xl transition-all ${viewMode === 'ask' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>💡</button>
           <button onClick={() => handleViewChange('planner')} title="Mi semana" className={`p-2 rounded-xl transition-all ${viewMode === 'planner' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📅</button>
           <button onClick={() => handleViewChange('daily-review')} title="Repasar" className={`p-2 rounded-xl transition-all ${viewMode === 'daily-review' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🧠</button>
           <button onClick={() => handleViewChange('worksheets')} title="Deberes y fichas" className={`p-2 rounded-xl transition-all ${viewMode === 'worksheets' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🎒</button>
           <button onClick={() => handleViewChange('reading')} title="Lectura" className={`p-2 rounded-xl transition-all ${viewMode === 'reading' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📖</button>
           <button onClick={() => handleViewChange('math')} title="Matemáticas" className={`p-2 rounded-xl transition-all ${viewMode === 'math' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🔢</button>
           <button onClick={() => handleViewChange('english')} title="Inglés" className={`p-2 rounded-xl transition-all ${viewMode === 'english' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🇬🇧</button>
           <button onClick={() => handleViewChange('calligraphy')} title="Caligrafía" className={`p-2 rounded-xl transition-all ${viewMode === 'calligraphy' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>✍️</button>
           <button onClick={() => handleViewChange('library')} title="Biblioteca" className={`p-2 rounded-xl transition-all ${viewMode === 'library' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>📚</button>
           <button onClick={() => handleViewChange('games')} title="Juegos" data-testid="bottom-games" className={`p-2 rounded-xl transition-all ${viewMode === 'games' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🎮</button>
           <button onClick={() => handleViewChange('shop')} title="Recompensas" className={`p-2 rounded-xl transition-all ${viewMode === 'shop' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400'}`}>🎁</button>
        </div>}
      </main>
    </div>
  );
};

export default App;
