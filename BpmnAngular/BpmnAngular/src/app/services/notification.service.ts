// notification.service.ts - Compatible with your existing code
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<NotificationMessage>();
  
  notifications$ = this.notificationSubject.asObservable();

  showSuccess(message: string, title?: string, duration: number = 4000): void {
    this.addNotification({
      type: 'success',
      message,
      title,
      duration
    });
  }

  showError(message: string, title?: string, duration: number = 7000): void {
    this.addNotification({
      type: 'error',
      message,
      title,
      duration
    });
  }

  showWarning(message: string, title?: string, duration: number = 5000): void {
    this.addNotification({
      type: 'warning',
      message,
      title,
      duration
    });
  }

  showInfo(message: string, title?: string, duration: number = 4000): void {
    this.addNotification({
      type: 'info',
      message,
      title,
      duration
    });
  }

  // Method to show notification without auto-dismiss
  showPersistent(type: NotificationMessage['type'], message: string, title?: string): void {
    this.addNotification({
      type,
      message,
      title,
      duration: 0 // 0 means no auto-dismiss
    });
  }

  private addNotification(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): void {
    const newNotification: NotificationMessage = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    this.notificationSubject.next(newNotification);
  }

  // Utility methods for common scenarios
  showSaveSuccess(fileName?: string): void {
    const message = fileName ? `"${fileName}" saved successfully` : 'File saved successfully';
    this.showSuccess(message, 'Save Complete');
  }

  showLoadError(fileName?: string): void {
    const message = fileName ? `Failed to load "${fileName}"` : 'Failed to load file';
    this.showError(message, 'Load Error');
  }

  showAuthError(): void {
    this.showError('Your session has expired. Please log in again.', 'Authentication Error', 10000);
  }

  showNetworkError(): void {
    this.showError('Network connection error. Please check your internet connection.', 'Connection Error');
  }

  showValidationError(field: string): void {
    this.showWarning(`Please check the ${field} field and try again.`, 'Validation Error');
  }

  // Convenient aliases that match common MatSnackBar usage
  open(message: string, action?: string, config?: { duration?: number; panelClass?: string[] }): void {
    const type = this.getTypeFromPanelClass(config?.panelClass);
    const duration = config?.duration || 3000;
    
    switch (type) {
      case 'success':
        this.showSuccess(message, undefined, duration);
        break;
      case 'error':
        this.showError(message, undefined, duration);
        break;
      case 'warning':
        this.showWarning(message, undefined, duration);
        break;
      default:
        this.showInfo(message, undefined, duration);
    }
  }

  private getTypeFromPanelClass(panelClass?: string[]): 'success' | 'error' | 'warning' | 'info' {
    if (!panelClass) return 'info';
    
    if (panelClass.some(cls => cls.includes('success'))) return 'success';
    if (panelClass.some(cls => cls.includes('error'))) return 'error';
    if (panelClass.some(cls => cls.includes('warning'))) return 'warning';
    
    return 'info';
  }
}