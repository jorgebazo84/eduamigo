
import React, { useRef, useState } from 'react';
import { analyzeWorksheet } from '../services/geminiService';
import { GradeLevel, Subject } from '../types';

interface VisionTutorProps {
  grade: GradeLevel;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const VisionTutor: React.FC<VisionTutorProps> = ({ grade, onActivityLog }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("No se pudo acceder a la cámara.");
    }
  };

  const captureAndAnalyze = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    setLoading(true);
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    try {
      const result = await analyzeWorksheet(dataUrl, grade);
      setAnalysis(result);
      
      // Log activity for parent monitoring
      if (onActivityLog) {
        onActivityLog("Análisis de ficha/ejercicio visual", "Ciencias", {
          text: result,
          type: 'vision_analysis',
          imageUrl: dataUrl
        });
      }
    } catch (err) {
      console.error("Error analyzing worksheet:", err);
    } finally {
      setLoading(false);
      
      // Stop camera
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-blue-100">
        <h2 className="text-2xl font-black text-blue-900 mb-2 flex items-center gap-2">
          📸 Tutor Visual
        </h2>
        <p className="text-blue-500 font-bold text-sm mb-6">Saca una foto a tus deberes y te los explicaré.</p>

        {isCameraActive ? (
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <button 
              onClick={captureAndAnalyze}
              disabled={loading}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-2xl hover:bg-blue-700 transition-all"
            >
              {loading ? 'Analizando...' : 'Capturar y Analizar 📸'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {!analysis && (
              <button 
                onClick={startCamera}
                className="w-full py-16 border-4 border-dashed border-blue-100 rounded-[2rem] text-blue-300 font-black text-xl hover:border-blue-400 hover:text-blue-500 transition-all flex flex-col items-center gap-4"
              >
                <span className="text-6xl">📷</span>
                Activar Cámara para Escanear
              </button>
            )}

            {analysis && (
              <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-blue-900">Análisis del Ejercicio</h3>
                  <button onClick={() => setAnalysis(null)} className="text-blue-400 font-bold text-xs uppercase">Borrar</button>
                </div>
                <div className="prose prose-blue text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {analysis}
                </div>
                <button 
                  onClick={startCamera}
                  className="mt-6 w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg"
                >
                  Escanear otro ejercicio 📸
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VisionTutor;
