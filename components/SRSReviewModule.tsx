import React, { useState, useEffect } from 'react';
import { srsService } from '../services/srsService';
import { Subject, SRSReview } from '../types';

interface SRSReviewModuleProps {
  childId: string;
  onStartReview: (topic: string, subject: Subject, reviewId: string) => void;
}

const SRSReviewModule: React.FC<SRSReviewModuleProps> = ({ childId, onStartReview }) => {
  const [reviews, setReviews] = useState<SRSReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await srsService.getPendingReviews(childId);
      
      // Filter for reviews scheduled for today or earlier
      const today = new Date().toISOString().split('T')[0];
      const dueReviews = data.filter(r => r.scheduledDate <= today);
      
      setReviews(dueReviews);
      setLoading(false);
    };
    load();
  }, [childId]);

  if (loading) return null;
  if (reviews.length === 0) return null;

  return (
    <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl animate-in slide-in-from-top-8 duration-700 relative overflow-hidden group">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-rose-400/20 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl animate-bounce">
            ⏰
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">¡Repaso Obligatorio!</h2>
            <p className="text-rose-100 text-xs font-bold uppercase tracking-widest">Algoritmo de Repaso Espaciado (SRS)</p>
          </div>
        </div>

        <p className="text-rose-50 mb-8 font-medium leading-relaxed">
          La IA ha detectado que necesitas reforzar algunos temas. Para asegurar que no se te olviden, hoy toca repasar:
        </p>

        <div className="space-y-4">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/20 transition-all group/item"
            >
              <div>
                <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase mb-2 inline-block">
                  {review.subject}
                </span>
                <h3 className="text-xl font-black">{review.topic}</h3>
                <p className="text-rose-200 text-xs font-bold mt-1">Programado para: {new Date(review.scheduledDate).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => onStartReview(review.topic, review.subject, review.id)}
                className="bg-white text-rose-600 px-8 py-3 rounded-2xl font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
              >
                Empezar Repaso →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SRSReviewModule;
