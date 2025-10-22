import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NotificationMessage, NotificationService } from '../../services/notification.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="notification-container">
      <div *ngFor="let notification of notifications; trackBy: trackByNotification" 
           class="notification"
           [class]="'notification-' + notification.type"
           [@slideIn]>
        <div class="notification-icon">
          <i [class]="getIconClass(notification.type)"></i>
        </div>
        <div class="notification-content">
          <h4 *ngIf="notification.title">{{notification.title}}</h4>
          <p>{{notification.message}}</p>
          <small class="notification-time">{{getTimeAgo(notification.timestamp)}}</small>
        </div>
        <button class="notification-close" 
                (click)="removeNotification(notification.id)"
                [title]="'Close notification'">
          <i class="bx bx-x"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      background: white;
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
      min-width: 300px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
    }

    .notification-success {
      border-left-color: #4caf50;
      background: linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(255,255,255,0.95) 100%);
    }

    .notification-error {
      border-left-color: #f44336;
      background: linear-gradient(135deg, rgba(244,67,54,0.05) 0%, rgba(255,255,255,0.95) 100%);
    }

    .notification-warning {
      border-left-color: #ff9800;
      background: linear-gradient(135deg, rgba(255,152,0,0.05) 0%, rgba(255,255,255,0.95) 100%);
    }

    .notification-info {
      border-left-color: #2196f3;
      background: linear-gradient(135deg, rgba(33,150,243,0.05) 0%, rgba(255,255,255,0.95) 100%);
    }

    .notification-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-success .notification-icon {
      background: #4caf50;
    }

    .notification-error .notification-icon {
      background: #f44336;
    }

    .notification-warning .notification-icon {
      background: #ff9800;
    }

    .notification-info .notification-icon {
      background: #2196f3;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-content h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      line-height: 1.3;
    }

    .notification-content p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #495057;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .notification-time {
      font-size: 11px;
      color: #6c757d;
      font-style: italic;
    }

    .notification-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #6c757d;
      padding: 4px;
      flex-shrink: 0;
      border-radius: 4px;
      transition: all 0.2s ease;
      margin-top: -2px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-close:hover {
      color: #495057;
      background: rgba(0,0,0,0.05);
    }

    .notification-close i {
      font-size: 16px;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
        scale: 0.95;
      }
      to {
        transform: translateX(0);
        opacity: 1;
        scale: 1;
      }
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
      .notification-container {
        right: 10px;
        left: 10px;
        max-width: none;
        top: 70px;
      }

      .notification {
        min-width: auto;
        padding: 12px;
      }

      .notification-content h4 {
        font-size: 13px;
      }

      .notification-content p {
        font-size: 12px;
      }
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      .notification {
        background: rgba(40, 44, 52, 0.95);
        border: 1px solid rgba(255,255,255,0.1);
        color: #e9ecef;
      }

      .notification-content h4 {
        color: #f8f9fa;
      }

      .notification-content p {
        color: #dee2e6;
      }

      .notification-time {
        color: #adb5bd;
      }

      .notification-close {
        color: #adb5bd;
      }

      .notification-close:hover {
        color: #f8f9fa;
        background: rgba(255,255,255,0.1);
      }
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  notifications: NotificationMessage[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.addNotification(notification);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private addNotification(notification: NotificationMessage): void {
    // Add to beginning of array for newest first
    this.notifications.unshift(notification);
    
    // Limit to maximum 5 notifications
    if (this.notifications.length > 5) {
      this.notifications = this.notifications.slice(0, 5);
    }
    
    // Auto-remove if duration is set and > 0
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, notification.duration);
    }
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  trackByNotification(index: number, notification: NotificationMessage): string {
    return notification.id;
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'bx bx-check';
      case 'error': return 'bx bx-error';
      case 'warning': return 'bx bx-error-alt';
      case 'info': return 'bx bx-info-circle';
      default: return 'bx bx-info-circle';
    }
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  }

  // Method to manually clear all notifications
  clearAll(): void {
    this.notifications = [];
  }
}