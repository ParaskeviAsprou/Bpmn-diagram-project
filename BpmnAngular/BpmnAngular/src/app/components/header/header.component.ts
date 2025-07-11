import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthenticationService, User } from '../../services/authentication.service';
import { NotificationService } from '../../services/notification.service';
import { RoleDirective } from '../../directives/role.directive';
import { Subject, takeUntil } from 'rxjs';

interface HeaderNotification {
  id: string;
  message: string;
  time: Date;
  type?: 'info' | 'warning' | 'success' | 'error';
  read?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RoleDirective],
  template: `
    <header class="app-header">
      <div class="header-left">
        <button class="menu-toggle" (click)="toggleSidebar()">
          <i class="bx bx-menu"></i>
        </button>
        <div class="logo">
          <h2>BPMN Manager</h2>
        </div>
      </div>

      <div class="header-center">
        <div class="search-container">
          <input 
            type="text" 
            placeholder="Search diagrams..." 
            class="search-input"
            [(ngModel)]="searchTerm"
            (keyup.enter)="search()">
          <button class="search-btn" (click)="search()">
            <i class="bx bx-search"></i>
          </button>
        </div>
      </div>

      <div class="header-right">
        <!-- Notifications -->
        <div class="notification-bell">
          <button class="icon-btn" (click)="toggleNotifications()">
            <i class="bx bx-bell"></i>
            <span class="notification-count" *ngIf="unreadCount > 0">{{unreadCount}}</span>
          </button>
          <div class="notifications-dropdown" *ngIf="showNotifications">
            <div class="notifications-header">
              <h4>Notifications</h4>
              <button class="clear-all" (click)="clearAllNotifications()">Clear All</button>
            </div>
            <div class="notifications-list">
              <div *ngIf="headerNotifications.length === 0" class="no-notifications">
                <i class="bx bx-bell-off"></i>
                <p>No new notifications</p>
              </div>
              <div *ngFor="let notification of headerNotifications" 
                   class="notification-item"
                   [class.unread]="!notification.read"
                   (click)="markAsRead(notification.id)">
                <div class="notification-icon" [class]="'type-' + (notification.type || 'info')">
                  <i class="bx" 
                     [class.bx-info-circle]="notification.type === 'info' || !notification.type"
                     [class.bx-check-circle]="notification.type === 'success'"
                     [class.bx-error-circle]="notification.type === 'error'"
                     [class.bx-error-alt]="notification.type === 'warning'"></i>
                </div>
                <div class="notification-content">
                  <p>{{notification.message}}</p>
                  <small>{{notification.time | date:'short'}}</small>
                </div>
                <button class="remove-notification" 
                        (click)="removeHeaderNotification(notification.id); $event.stopPropagation()">
                  <i class="bx bx-x"></i>
                </button>
              </div>
            </div>
            <div class="notifications-footer" *ngIf="headerNotifications.length > 0">
              <button class="mark-all-read" (click)="markAllAsRead()">
                Mark all as read
              </button>
            </div>
          </div>
        </div>

        <!-- User Menu -->
        <div class="user-menu">
          <button class="user-avatar" (click)="toggleUserMenu()">
            <div class="avatar-circle">
              {{getUserInitials()}}
            </div>
            <span class="user-name">{{currentUser?.firstname}} {{currentUser?.lastname}}</span>
            <i class="bx bx-chevron-down" [class.rotated]="showUserMenu"></i>
          </button>
          
          <div class="user-dropdown" *ngIf="showUserMenu">
            <div class="user-info">
              <div class="user-details">
                <strong>{{currentUser?.firstname}} {{currentUser?.lastname}}</strong>
                <small>{{currentUser?.email}}</small>
                <div class="user-roles">
                  <span *ngFor="let role of currentUser?.roles" 
                        class="role-badge" 
                        [class]="getRoleBadgeClass(role.name)">
                    {{role.displayName || role.name}}
                  </span>
                </div>
              </div>
            </div>
            <div class="menu-divider"></div>
            <a class="menu-item" (click)="navigateToProfile()">
              <i class="bx bx-user"></i>
              Profile
            </a>
            <a class="menu-item" (click)="navigateToSettings()">
              <i class="bx bx-cog"></i>
              Settings
            </a>
            <div class="menu-divider" *appHasRole="'ROLE_ADMIN'"></div>
            <a class="menu-item" *appHasRole="'ROLE_ADMIN'" (click)="navigateToAdmin()">
              <i class="bx bx-shield"></i>
              Admin Panel
            </a>
            <div class="menu-divider"></div>
            <a class="menu-item" (click)="testNotifications()">
              <i class="bx bx-test-tube"></i>
              Test Notifications
            </a>
            <div class="menu-divider"></div>
            <a class="menu-item logout" (click)="logout()">
              <i class="bx bx-log-out"></i>
              Logout
            </a>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 60px;
      background: white;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .menu-toggle {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      color: #6c757d;
      transition: all 0.3s ease;
    }

    .menu-toggle:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .logo h2 {
      margin: 0;
      color: #2c3e50;
      font-size: 20px;
      font-weight: 600;
    }

    .header-center {
      flex: 1;
      max-width: 400px;
      margin: 0 40px;
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      padding: 8px 16px 8px 40px;
      border: 1px solid #e9ecef;
      border-radius: 20px;
      background: #f8f9fa;
      font-size: 14px;
      outline: none;
      transition: all 0.3s ease;
    }

    .search-input:focus {
      background: white;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .search-btn {
      position: absolute;
      left: 12px;
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      font-size: 16px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .notification-bell {
      position: relative;
    }

    .icon-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      color: #6c757d;
      position: relative;
      transition: all 0.3s ease;
    }

    .icon-btn:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .notification-count {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: bold;
      min-width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid white;
    }

    .notifications-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 350px;
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 1001;
      margin-top: 8px;
      max-height: 400px;
      display: flex;
      flex-direction: column;
    }

    .notifications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;
    }

    .notifications-header h4 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
      font-weight: 600;
    }

    .clear-all {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .clear-all:hover {
      background: #667eea;
      color: white;
    }

    .notifications-list {
      flex: 1;
      overflow-y: auto;
      max-height: 280px;
    }

    .no-notifications {
      padding: 40px 20px;
      text-align: center;
      color: #6c757d;
    }

    .no-notifications i {
      font-size: 32px;
      margin-bottom: 8px;
      color: #adb5bd;
    }

    .no-notifications p {
      margin: 0;
      font-size: 14px;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid #f8f9fa;
      gap: 12px;
      cursor: pointer;
      transition: background 0.3s ease;
    }

    .notification-item:hover {
      background: #f8f9fa;
    }

    .notification-item.unread {
      background: rgba(102, 126, 234, 0.02);
      border-left: 3px solid #667eea;
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
      margin-top: 2px;
    }

    .notification-icon.type-info {
      background: #17a2b8;
    }

    .notification-icon.type-success {
      background: #28a745;
    }

    .notification-icon.type-warning {
      background: #ffc107;
      color: #333;
    }

    .notification-icon.type-error {
      background: #dc3545;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-content p {
      margin: 0 0 4px 0;
      font-size: 13px;
      color: #2c3e50;
      line-height: 1.4;
    }

    .notification-content small {
      color: #6c757d;
      font-size: 11px;
    }

    .remove-notification {
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    .remove-notification:hover {
      color: #495057;
      background: rgba(0,0,0,0.05);
    }

    .notifications-footer {
      padding: 12px 16px;
      border-top: 1px solid #e9ecef;
      background: #f8f9fa;
      border-radius: 0 0 8px 8px;
    }

    .mark-all-read {
      width: 100%;
      background: none;
      border: 1px solid #667eea;
      color: #667eea;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .mark-all-read:hover {
      background: #667eea;
      color: white;
    }

    /* User menu styles (same as before) */
    .user-menu {
      position: relative;
    }

    .user-avatar {
      background: none;
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .user-avatar:hover {
      background: #f8f9fa;
    }

    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }

    .user-name {
      font-size: 14px;
      color: #2c3e50;
      font-weight: 500;
    }

    .bx-chevron-down {
      font-size: 16px;
      color: #6c757d;
      transition: transform 0.3s ease;
    }

    .bx-chevron-down.rotated {
      transform: rotate(180deg);
    }

    .user-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      width: 250px;
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 1001;
      margin-top: 8px;
    }

    .user-info {
      padding: 16px;
    }

    .user-details strong {
      color: #2c3e50;
      font-size: 14px;
    }

    .user-details small {
      color: #6c757d;
      font-size: 12px;
      display: block;
      margin-top: 2px;
    }

    .user-roles {
      margin-top: 8px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .role-badge {
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
      color: white;
    }

    .role-badge.admin {
      background: #dc3545;
    }

    .role-badge.modeler {
      background: #007bff;
    }

    .role-badge.viewer {
      background: #28a745;
    }

    .role-badge.default {
      background: #6c757d;
    }

    .menu-divider {
      height: 1px;
      background: #e9ecef;
      margin: 0;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: #495057;
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .menu-item:hover {
      background: #f8f9fa;
      color: #2c3e50;
    }

    .menu-item.logout {
      color: #dc3545;
    }

    .menu-item.logout:hover {
      background: #ffe6e6;
    }

    .menu-item i {
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .header-center {
        display: none;
      }

      .user-name {
        display: none;
      }

      .user-dropdown,
      .notifications-dropdown {
        width: 280px;
      }

      .notifications-dropdown {
        right: -50px;
      }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() currentUser: User | null = null;
  
  private destroy$ = new Subject<void>();
  
  searchTerm = '';
  showNotifications = false;
  showUserMenu = false;
  
  headerNotifications: HeaderNotification[] = [
    { 
      id: '1', 
      message: 'New diagram shared with you by John Doe', 
      time: new Date(Date.now() - 5 * 60 * 1000),
      type: 'info',
      read: false
    },
    { 
      id: '2', 
      message: 'Role permissions updated successfully', 
      time: new Date(Date.now() - 15 * 60 * 1000),
      type: 'success',
      read: false
    },
    { 
      id: '3', 
      message: 'System maintenance scheduled for tonight', 
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'warning',
      read: true
    }
  ];

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Listen for clicks outside to close dropdowns
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-bell')) {
      this.showNotifications = false;
    }
    if (!target.closest('.user-menu')) {
      this.showUserMenu = false;
    }
  }

  get unreadCount(): number {
    return this.headerNotifications.filter(n => !n.read).length;
  }

  toggleSidebar(): void {
    document.body.classList.toggle('sidebar-collapsed');
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  search(): void {
    if (this.searchTerm.trim()) {
      this.router.navigate(['/files'], { 
        queryParams: { search: this.searchTerm }
      });
    }
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    return (this.currentUser.firstname?.charAt(0) || '') + 
           (this.currentUser.lastname?.charAt(0) || '');
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    return 'default';
  }

  markAsRead(id: string): void {
    const notification = this.headerNotifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.headerNotifications.forEach(n => n.read = true);
  }

  removeHeaderNotification(id: string): void {
    this.headerNotifications = this.headerNotifications.filter(n => n.id !== id);
  }

  clearAllNotifications(): void {
    this.headerNotifications = [];
    this.showNotifications = false;
  }

  testNotifications(): void {
    this.showUserMenu = false;
    
    // Test different notification types
    setTimeout(() => this.notificationService.showSuccess('Test success notification!'), 100);
    setTimeout(() => this.notificationService.showInfo('Test info notification!'), 600);
    setTimeout(() => this.notificationService.showWarning('Test warning notification!'), 1100);
    setTimeout(() => this.notificationService.showError('Test error notification!'), 1600);
  }

  navigateToProfile(): void {
    this.showUserMenu = false;
    this.router.navigate(['/settings']);
  }

  navigateToSettings(): void {
    this.showUserMenu = false;
    this.router.navigate(['/settings']);
  }

  navigateToAdmin(): void {
    this.showUserMenu = false;
    this.router.navigate(['/admin']);
  }

  logout(): void {
    this.showUserMenu = false;
    
    if (confirm('Are you sure you want to logout?')) {
      this.notificationService.showInfo('Logging out...', 'Goodbye');
      
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 1000);
    }
  }
}