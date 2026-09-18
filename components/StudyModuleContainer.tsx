import React, { useState, useEffect } from 'react';
import { Book, StudyTask } from '../types/study';
import { Timer, Brain } from 'lucide-react';
import BookManager from './BookManager';
import BookList from './BookList';
import ISBNStudyPlanner from './ISBNStudyPlanner';
import StudyReportList from './StudyReportList';
import StudyReview from './StudyReview';

interface StudyModuleContainerProps {
  userId: string;
  childId: string;
  userRole: 'parent' | 'student' | 'demo' | null;
  grade: string;
  onViewChange?: (mode: any) => void;
}

const StudyModuleContainer: React.FC<StudyModuleContainerProps> = ({ userId, childId, userRole, grade, onViewChange }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [activeTask, setActiveTask] = useState<StudyTask | null>(null);

  useEffect(() => {
    if (userId && childId) {
      fetchStudyData();
    }
  }, [userId, childId]);

  const fetchStudyData = async () => {
    try {
      const response = await fetch(`api_study.php?action=get_study_data&userId=${userId}&childId=${childId}`);
      const data = await response.json();
      
      console.log("Datos de estudio cargados:", data);
      if (data.books) setBooks(data.books);
      if (data.tasks) {
        setTasks(data.tasks.map((t: any) => ({
          ...t,
          pointsReward: t.pointsReward || parseInt(t.points_reward),
          aiScore: t.aiScore || (t.ai_score ? parseInt(t.ai_score) : undefined),
          completedAt: t.completedAt ? (typeof t.completedAt === 'string' ? new Date(t.completedAt).getTime() : t.completedAt) : (t.completed_at ? new Date(t.completed_at).getTime() : undefined),
          handwritingImage: t.handwritingImage || t.handwriting_image,
          medicalEvaluation: t.medicalEvaluation || t.medical_evaluation
        })));
      }
    } catch (e) {
      console.error("Error cargando datos de estudio:", e);
    }
  };

  const handleAddBook = async (book: Book) => {
    setBooks(prev => [...prev, book]);
    
    try {
      await fetch(`api_study.php?action=add_book&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });
    } catch (e) { 
      console.error("Error al guardar libro en API:", e);
    }
  };

  const handleDeleteBook = async (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));

    try {
      await fetch(`api_study.php?action=delete_book&userId=${userId}&id=${id}`, {
        method: 'DELETE'
      });
    } catch (e) { console.error(e); }
  };

  const handleAddTask = async (taskData: Omit<StudyTask, 'id' | 'createdAt'>) => {
    const newTask: StudyTask = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    setTasks(prev => [...prev, newTask]);

    try {
      await fetch(`api_study.php?action=add_study_task&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } catch (e) { console.error(e); }
  };

  const handleCompleteTask = async (evaluation: any, summary: string, handwritingImage?: string, medicalEvaluation?: string) => {
    if (!activeTask) return;

    const updatedTask: StudyTask = {
      ...activeTask,
      status: 'completed',
      summary,
      handwritingImage,
      aiFeedbackChild: evaluation.feedbackChild,
      aiFeedbackParent: evaluation.feedbackParent,
      medicalEvaluation,
      aiScore: evaluation.score,
      completedAt: Date.now()
    };

    setTasks(prev => prev.map(t => t.id === activeTask.id ? updatedTask : t));
    setActiveTask(null);

    try {
      await fetch(`api_study.php?action=complete_study_task&userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedTask,
          childId
        })
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8">
      {userRole === 'parent' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <BookManager userId={userId} childId={childId} onBookAdded={handleAddBook} />
            <BookList books={books} onDeleteBook={handleDeleteBook} />
            <ISBNStudyPlanner books={books} tasks={tasks} onAddTask={handleAddTask} />
          </div>
          <div className="space-y-8">
            <StudyReportList tasks={tasks} books={books} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-ewola">🎯 Mis Tareas de Repaso</h3>
            <div className="flex gap-2">
              {onViewChange && (
                <button 
                  onClick={() => onViewChange('pomodoro')}
                  className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-rose-100 transition-all shadow-sm border border-rose-100"
                >
                  <Timer size={16} />
                  Modo Pomodoro
                </button>
              )}
              {onViewChange && (
                <button 
                  onClick={() => onViewChange('calligraphy')}
                  className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-indigo-100 transition-all"
                >
                  ✍️ Practicar Caligrafía
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.filter(t => t.status === 'pending').map(task => (
              <div 
                key={task.id} 
                onClick={() => setActiveTask(task)}
                className="glass-card p-6 rounded-2xl border-2 border-ewola/20 hover:border-ewola cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-ewola text-white text-[10px] font-bold px-2 py-1 rounded">
                    {books.find(b => b.id === task.bookId)?.subject}
                  </span>
                  <span className="text-emerald-500 font-bold">+{task.pointsReward} pts</span>
                </div>
                <h4 className="text-xl font-bold text-slate-800 group-hover:text-ewola transition-colors">
                  {task.topicTitle}
                </h4>
                <p className="text-sm text-slate-500 mt-2">
                  Libro: {books.find(b => b.id === task.bookId)?.title}
                </p>
                <button className="mt-4 w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold group-hover:bg-ewola group-hover:text-white transition-all">
                  Comenzar Repaso
                </button>
              </div>
            ))}
            {tasks.filter(t => t.status === 'pending').length === 0 && (
              <p className="text-slate-500 italic">¡Genial! No tienes tareas pendientes por ahora. ✨</p>
            )}
          </div>
        </div>
      )}

      {activeTask && (
        <StudyReview 
          task={activeTask} 
          bookTitle={books.find(b => b.id === activeTask.bookId)?.title || ''}
          grade={grade}
          onComplete={handleCompleteTask}
          onClose={() => setActiveTask(null)}
        />
      )}
    </div>
  );
};

export default StudyModuleContainer;
