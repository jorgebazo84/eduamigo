import { Subject, SRSReview } from '../types';

export const srsService = {
  async scheduleReviews(childId: string, topic: string, subject: Subject, sourceId: string) {
    const today = new Date();
    
    // Interval 1: 2 days later
    const date1 = new Date(today);
    date1.setDate(today.getDate() + 2);
    
    // Interval 2: 6 days later
    const date2 = new Date(today);
    date2.setDate(today.getDate() + 6);

    const reviews = [
      {
        id: crypto.randomUUID(),
        childId,
        topic,
        subject,
        scheduledDate: date1.toISOString().split('T')[0],
        sourceId
      },
      {
        id: crypto.randomUUID(),
        childId,
        topic,
        subject,
        scheduledDate: date2.toISOString().split('T')[0],
        sourceId
      }
    ];

    for (const review of reviews) {
      try {
        await fetch(`api_study.php?action=add_srs_review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(review)
        });
      } catch (e) {
        console.error("Error scheduling SRS review:", e);
      }
    }
  },

  async getPendingReviews(childId: string): Promise<SRSReview[]> {
    try {
      const response = await fetch(`api_study.php?action=get_srs_reviews&childId=${childId}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.error("Error fetching SRS reviews:", e);
      return [];
    }
  },

  async completeReview(reviewId: string, childId: string) {
    try {
      await fetch(`api_study.php?action=complete_srs_review&id=${reviewId}`, {
        method: 'POST'
      });
    } catch (e) {
      console.error("Error completing SRS review:", e);
    }
  }
};
