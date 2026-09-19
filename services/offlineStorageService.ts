// EduAmigo Offline Storage & Sync Engine - V1.1.0

export interface QueuedActivity {
  id: string;
  type: 'activity_log' | 'exam_result' | 'reading_session' | 'math_attempt' | 'points_sync';
  endpoint: string;
  payload: any;
  timestamp: number;
}

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'eduamigo_offline_queue_v1',
  CACHED_BOOKS: 'eduamigo_cached_books_v1',
  CACHED_TOPICS: 'eduamigo_cached_topics_v1',
  CACHED_ACTIVITIES: 'eduamigo_cached_activities_v1',
};

class OfflineStorageService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: ((online: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners(true);
        this.syncOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners(false);
      });
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach((cb) => {
      try {
        cb(online);
      } catch (err) {
        console.error('Error notifying offline listener:', err);
      }
    });
  }

  // Cache Books and Syllabi for offline access
  public cacheBooks(books: any[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_BOOKS, JSON.stringify(books));
    } catch (e) {
      console.warn('Could not cache books for offline:', e);
    }
  }

  public getCachedBooks(): any[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CACHED_BOOKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Cache Topics and Syllabus
  public cacheSyllabus(subject: string, grade: string, data: any) {
    try {
      const key = `${STORAGE_KEYS.CACHED_TOPICS}_${subject}_${grade}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not cache syllabus:', e);
    }
  }

  public getCachedSyllabus(subject: string, grade: string): any | null {
    try {
      const key = `${STORAGE_KEYS.CACHED_TOPICS}_${subject}_${grade}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // Queue background activities performed while offline
  public queueActivity(type: QueuedActivity['type'], endpoint: string, payload: any): string {
    const item: QueuedActivity = {
      id: crypto.randomUUID(),
      type,
      endpoint,
      payload,
      timestamp: Date.now()
    };

    try {
      const current = this.getQueuedActivities();
      current.push(item);
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(current));
      console.log(`[OfflineStorage] Actividad encolada para sincronización (${type}):`, item.id);
    } catch (e) {
      console.error('Failed to queue offline activity:', e);
    }

    return item.id;
  }

  public getQueuedActivities(): QueuedActivity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Sync queue with backend when connection is restored
  public async syncOfflineQueue(): Promise<{ synced: number; remaining: number }> {
    const queue = this.getQueuedActivities();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    console.log(`[OfflineStorage] Sincronizando ${queue.length} actividades guardadas en local...`);
    const successfulIds: string[] = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload)
        });

        if (response.ok) {
          successfulIds.push(item.id);
        }
      } catch (err) {
        console.warn(`[OfflineStorage] No se pudo sincronizar item ${item.id}, se reintentará luego:`, err);
        // If network drops again, abort current sync pass
        break;
      }
    }

    if (successfulIds.length > 0) {
      const remaining = queue.filter((item) => !successfulIds.includes(item.id));
      try {
        localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remaining));
      } catch {}
      console.log(`[OfflineStorage] Sincronización exitosa: ${successfulIds.length} enviadas, ${remaining.length} pendientes.`);
      return { synced: successfulIds.length, remaining: remaining.length };
    }

    return { synced: 0, remaining: queue.length };
  }
}

export const offlineStorageService = new OfflineStorageService();
