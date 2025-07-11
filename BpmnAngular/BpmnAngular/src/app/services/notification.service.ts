import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();

  private idCounter = 0;

  showSuccess(message: string, title?: string, duration = 5000): void {
    this.show('success', message, title, duration);
  }

  showError(message: string, title?: string, duration = 8000): void {
    this.show('error', message, title, duration);
  }

  showWarning(message: string, title?: string, duration = 6000): void {
    this.show('warning', message, title, duration);
  }

  showInfo(message: string, title?: string, duration = 5000): void {
    this.show('info', message, title, duration);
  }

  private show(type: Notification['type'], message: string, title?: string, duration = 5000): void {
    const notification: Notification = {
      id: ++this.idCounter,
      type,
      message,
      title,
      duration
    };

    this.notificationSubject.next(notification);
  }
}
