import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthenticationService, User } from '../../services/authentication.service';
import { NotificationService } from '../../services/notification.service';
import { RoleDirective } from '../../directives/role.directive';
import { Subject, takeUntil } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

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
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    RoleDirective,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
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