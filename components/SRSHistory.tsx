
import React, { useState, useEffect } from 'react';
import { srsService } from '../services/srsService';
import { SRSReview } from '../types';

interface SRSHistoryProps {
  userId: string;
  childId: string;
}

const SRSHistory: React.FC<SRSHistoryProps> = ({ userId, childId }) => {
  const [reviews, setReviews] = useState<SRSReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const data = await srsService.getPendingReviews(childId);
        // Also fetch completed ones if we had an endpoint, but for now let's show what's scheduled
        setReviews(data);
      } catch (error) {
        console.error('Error fetching SRS reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (childId) fetchReviews();
  }, [childId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400 font-black">Cargando repasos programados...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-blue-50 shadow-sm overflow-hidden">
      <div className="p-6 border-bottom border-blue-50 bg-blue-50/30">
        <h3 className="text-lg font-black text-blue-900">Algoritmo de Repaso Espaciado (SRS)</h3>
        <p className="text-xs text-blue-500 font-bold">Temas que el sistema ha detectado que necesitan refuerzo automático.</p>
      </div>

      <div className="divide-y divide-blue-50">
        {reviews.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-slate-500 font-bold">No hay repasos automáticos programados para este niño.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="p-6 flex items-center justify-between hover:bg-blue-50/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${
                  review.subject === 'Matemáticas' ? 'bg-orange-500' :
                  review.subject === 'Lengua y Literatura' ? 'bg-blue-500' :
                  'bg-indigo-500'
                }`}>
                  {review.subject[0]}
                </div>
                <div>
                  <p className="font-black text-slate-800">{review.topic}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{review.subject}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-blue-600">
                  {new Date(review.scheduledDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha Programada</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SRSHistory;
