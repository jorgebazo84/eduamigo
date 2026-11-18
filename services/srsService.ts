// Compatibilidad: los módulos que antes programaban "repasos espaciados" ahora añaden el tema a "Repasar".
import { reviewService } from './reviewService';

export const srsService = {
  async scheduleReviews(childId: string, topic: string, subject: string, sourceId: string, score?: number) {
    try {
      await reviewService.addTopic({ childId, subject, topic, sourceType: 'module', sourceId, score });
    } catch (e) {
      console.error('No se ha podido añadir el tema a Repasar:', e);
    }
  },
};
