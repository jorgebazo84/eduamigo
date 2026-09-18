import React, { useState, useRef } from 'react';
import { calligraphyService } from '../services/calligraphyService';
import { CalligraphyAnalysis, CalligraphySession } from '../types/calligraphy';
import { Subject } from '../types';
import { srsService } from '../services/srsService';
import CalligraphyHistory from './CalligraphyHistory';

interface CalligraphyModuleProps {
  userId: string;
  childId: string;
  childName: string;
  grade: string;
  onAwardPoints: (points: number) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const CalligraphyModule: React.FC<CalligraphyModuleProps> = ({ userId, childId, childName, grade, onAwardPoints, onActivityLog }) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CalligraphyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [showPrintModal, setShowPrintModal] = useState<{ title: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = (exercise: any) => {
    const content = exercise.printableContent || `Practica: ${exercise.title}\n\nEscribe aquí tus ejercicios para mejorar en ${exercise.target}.`;
    setShowPrintModal({ title: exercise.title, content: content });
  };

  const handlePrintAction = () => {
    if (!showPrintModal) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const contentHtml = showPrintModal.content.replace(/\n/g, '<br/>');
      printWindow.document.write(`
        <html>
          <head>
            <title>Ficha de Práctica - EduAmigo</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap');
              body { 
                font-family: 'Comic Neue', cursive, sans-serif; 
                padding: 40px; 
                color: #1e293b;
                background-color: white;
              }
              .header { 
                text-align: center; 
                border-bottom: 3px solid #00B4D8; 
                margin-bottom: 40px; 
                padding-bottom: 20px; 
              }
              .logo {
                font-size: 28px;
                font-weight: 900;
                color: #001220;
                margin-bottom: 10px;
              }
              .title { 
                font-size: 22px; 
                font-weight: bold; 
                color: #4f46e5; 
                margin-bottom: 15px;
              }
              .student-info {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: bold;
                color: #64748b;
              }
              .content { 
                font-size: 36px; 
                line-height: 2.2; 
                padding: 30px; 
                border-radius: 15px; 
                min-height: 600px;
                background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
                background-size: 100% 2.2em;
                border: 1px solid #f1f5f9;
              }
              .footer { 
                margin-top: 60px; 
                font-size: 11px; 
                color: #94a3b8; 
                text-align: center; 
                border-top: 1px solid #f1f5f9;
                padding-top: 20px;
              }
              @media print {
                body { padding: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">EduAmigo J21</div>
              <div class="title">Ficha de Práctica: ${showPrintModal.title}</div>
              <div class="student-info">
                <span>Alumno: ${childName}</span>
                <span>Fecha: ${new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div class="content">
              ${contentHtml}
            </div>
            <div class="footer">
              Generado por EduAmigo J21 Tech - Innovación en Educación • 2025<br/>
              ¡Sigue practicando, cada trazo te hace mejor!
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.onafterprint = () => window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const result = await calligraphyService.analyzeHandwriting(image, grade);
      setAnalysis(result);
      
      // Guardar en el backend
      const sessionData = {
        id: crypto.randomUUID(),
        userId,
        childId,
        imageUrl: image,
        score: result.score,
        analysis: result,
        timestamp: Date.now(),
        parentId: parentId
      };

      try {
        await fetch(`api_study.php?action=save_calligraphy_session&userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        });
      } catch (e) {
        console.error("Error guardando sesión en el servidor:", e);
      }

      // Log activity for parent monitoring
      if (onActivityLog) {
        onActivityLog("Práctica de Caligrafía", "Lengua", {
          text: result.generalFeedback,
          type: 'calligraphy_analysis',
          score: result.score,
          image: image
        });
      }

      if (result.score >= 7) {
        onAwardPoints(15);
      } else {
        onAwardPoints(5);
        // SRS: Schedule review for failed calligraphy
        await srsService.scheduleReviews(childId, "Caligrafía", "Lengua", sessionData.id);
      }
      
      // Limpiar parentId después de un análisis exitoso
      setParentId(undefined);
    } catch (err) {
      setError('No pudimos analizar la imagen. Asegúrate de que sea clara e inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex gap-4 p-1 bg-blue-100 rounded-2xl w-fit mx-auto">
        <button 
          onClick={() => setActiveTab('analyze')}
          className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'analyze' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}
        >
          🔍 Nuevo Análisis
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-500'}`}
        >
          📜 Mi Historial
        </button>
      </div>

      {activeTab === 'analyze' ? (
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-blue-50">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white">
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
              ✍️ Taller de Caligrafía {parentId && <span className="text-sm bg-white/20 px-3 py-1 rounded-full">Práctica de Seguimiento</span>}
            </h2>
            <p className="opacity-90 font-medium">¡Hola {childName}! Haz una foto a tu escritura para que la IA te ayude a mejorar.</p>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-2xl text-center">
                <span className="text-2xl block mb-1">📝</span>
                <p className="text-[10px] font-black text-blue-900 uppercase">Escribe</p>
                <p className="text-[9px] text-blue-500">Usa tu cuaderno real</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl text-center">
                <span className="text-2xl block mb-1">📸</span>
                <p className="text-[10px] font-black text-indigo-900 uppercase">Foto</p>
                <p className="text-[9px] text-indigo-500">Sube una imagen clara</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                <span className="text-2xl block mb-1">🚀</span>
                <p className="text-[10px] font-black text-emerald-900 uppercase">Mejora</p>
                <p className="text-[9px] text-emerald-500">¡Recibe consejos de la IA!</p>
              </div>
            </div>

            {!image ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-blue-100 rounded-[2rem] p-16 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
              >
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform">📸</div>
                <h3 className="text-xl font-bold text-blue-900">Sube una foto de tu cuaderno</h3>
                <p className="text-blue-400 mt-2">Pulsa aquí para usar la cámara o elegir una foto</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative rounded-[2rem] overflow-hidden shadow-lg border-4 border-white aspect-video bg-slate-100">
                  <img src={image} alt="Escritura" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setImage(null); setParentId(undefined); }}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-red-50 text-red-500 transition-all"
                  >
                    ✕
                  </button>
                </div>

                {!analysis && (
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className={`w-full py-5 rounded-2xl font-black text-white text-lg shadow-xl transition-all active:scale-95 ${
                      loading ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analizando trazos...
                      </span>
                    ) : '🔍 Analizar Caligrafía'}
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold animate-in shake duration-500">
                {error}
              </div>
            )}

            {analysis && (
              <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-[2rem] text-center">
                    <div className="text-4xl font-black text-blue-600 mb-1">{analysis.score}/10</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">Puntuación</div>
                  </div>
                  <div className="md:col-span-2 bg-indigo-50 p-6 rounded-[2rem]">
                    <h4 className="font-black text-indigo-900 mb-2">✨ Mensaje de la IA</h4>
                    <p className="text-indigo-800 italic leading-relaxed">"{analysis.generalFeedback}"</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                      Análisis Técnico
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-blue-500 uppercase">Legibilidad</span>
                        <p className="text-sm text-slate-700 font-medium">{analysis.legibility}</p>
                      </div>
                      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-indigo-500 uppercase">Trazo y Forma</span>
                        <p className="text-sm text-slate-700 font-medium">{analysis.strokeFeedback}</p>
                      </div>
                      <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-emerald-500 uppercase">Espaciado</span>
                        <p className="text-sm text-slate-700 font-medium">{analysis.spacingFeedback}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
                      Ortografía Detectada
                    </h4>
                    <div className="bg-rose-50 p-6 rounded-[2rem] min-h-[100px]">
                      {analysis.spellingErrors.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {analysis.spellingErrors.map((err, i) => (
                            <span key={i} className="bg-white text-rose-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-rose-100">
                              {err}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-rose-400 italic text-sm">¡Excelente! No se han detectado errores ortográficos.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
                    Tu Plan de Práctica Personalizado
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.practicePlan.map((ex, i) => (
                      <div key={i} className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] hover:border-blue-200 transition-all shadow-sm group">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                            ex.difficulty === 'fácil' ? 'bg-green-100 text-green-600' :
                            ex.difficulty === 'medio' ? 'bg-yellow-100 text-yellow-600' : 'bg-rose-100 text-rose-600'
                          }`}>
                            {ex.difficulty}
                          </span>
                          <span className="text-xs font-black text-slate-300 group-hover:text-blue-500 transition-colors">#{i+1}</span>
                        </div>
                        <h5 className="font-black text-slate-800 mb-1">{ex.title}</h5>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{ex.description}</p>
                        <div className="flex justify-between items-center">
                          <div className="text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded-lg">
                            Objetivo: {ex.target}
                          </div>
                          <button 
                            onClick={() => handlePrint(ex)}
                            className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            🖨️ Imprimir Ficha
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => { setImage(null); setAnalysis(null); setParentId(undefined); }}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  🔄 Realizar otro análisis
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-blue-50">
          <CalligraphyHistory 
            userId={userId} 
            childId={childId} 
            onPracticeAgain={(session) => {
              setParentId(session.id);
              setActiveTab('analyze');
              setImage(null);
              setAnalysis(null);
            }}
            onPrintExercise={handlePrint}
          />
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 z-[400] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-xl">🖨️ Vista Previa de Ficha</h3>
              <button onClick={() => setShowPrintModal(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 font-serif text-2xl leading-loose text-center min-h-[200px] flex flex-col items-center justify-center italic whitespace-pre-wrap">
                {showPrintModal.content || "Generando contenido de práctica..."}
              </div>
              <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-xs font-medium">
                💡 **Consejo:** Imprime esta ficha y practica escribiendo el texto varias veces. Cuando termines, hazle una foto y súbela como "Práctica de Seguimiento" para ver cuánto has mejorado.
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPrintModal(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePrintAction}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 shadow-lg transition-all"
                >
                  Imprimir Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalligraphyModule;
