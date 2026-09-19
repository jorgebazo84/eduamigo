
import { CalendarEvent, Child } from '../types';

export const requestNotificationPermission = async () => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }
    if (isIframe) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    return false;
  }
};

export const sendLocalNotification = (title: string, body: string, icon?: string) => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  } catch (e) {}
};

export const checkUpcomingEvents = (events: CalendarEvent[], children: Child[]) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  events.forEach(event => {
    if (event.date === tomorrowStr && !event.notified) {
      const child = children.find(c => c.id === event.childId);
      if (event.type === 'exam') {
        sendLocalNotification(
          `📝 ¡Examen mañana para ${child?.name || 'tu hijo'}!`,
          `Recuerda repasar "${event.title}". ¡A por el 10!`,
          child?.avatar
        );
      } else if (event.type === 'meeting') {
        sendLocalNotification(
          `👥 Reunión escolar`,
          `Mañana tienes: ${event.title}`,
          '🧔'
        );
      }
      // Note: In a real app we'd mark it as notified in state/storage
    }
  });
};
