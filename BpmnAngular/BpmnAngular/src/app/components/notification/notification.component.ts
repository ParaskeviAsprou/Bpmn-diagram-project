import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div *ngFor="let notification of notifications" 
           class="notification"
           [class]="'notification-' + notification.type"
           [@slideIn]>
        <div class="notification-icon">
          <i [class]="getIconClass(notification.type)"></i>
        </div>
        <div class="notification-content">
          <h4 *ngIf="notification.title">{{notification.title}}</h4>
          <p>{{notification.message}}</p>
        </div>
        <button class="notification-close" (click)="removeNotification(notification.id)">
          <i class="icon-close"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: white;
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
    }

    .notification-success {
      border-left-color: #4caf50;
    }

    .notification-error {
      border-left-color: #f44336;
    }

    .notification-warning {
      border-left-color: #ff9800;
    }

    .notification-info {
      border-left-color: #2196f3;
    }

    .notification-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      flex-shrink: 0;
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
    }

    .notification-content h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .notification-content p {
      margin: 0;
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .notification-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #999;
      padding: 2px;
      flex-shrink: 0;
    }

    .notification-close:hover {
      color: #666;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        this.notifications.push(notification);
        
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            this.removeNotification(notification.id);
          }, notification.duration);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'icon-check';
      case 'error': return 'icon-alert';
      case 'warning': return 'icon-warning';
      case 'info': return 'icon-info';
      default: return 'icon-info';
    }
  }
}