import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthenticationService, User } from '../../services/authentication.service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { notificationService } from '../../services/notification.service';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnDestroy {
  @Input() currentUser: User | null = null;
  
  private destroy$ = new Subject<void>();
  
  searchTerm = '';
  showNotifications = false;
  showUserMenu = false;
  notificationCount = 3; 
  
  notifications = [
    { id: 1, message: 'New diagram shared with you', time: new Date() },
    { id: 2, message: 'Role permissions updated', time: new Date() },
    { id: 3, message: 'System maintenance scheduled', time: new Date() }
  ];

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private notificationService: notificationService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    // Emit event to toggle sidebar
    document.body.classList.toggle('sidebar-collapsed');
  }

  search(): void {
    if (this.searchTerm.trim()) {
      this.router.navigate(['/diagrams'], { 
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

  navigateToProfile(): void {
    this.showUserMenu = false;
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.showUserMenu = false;
    this.router.navigate(['/profile'], { queryParams: { tab: 'settings' } });
  }

  navigateToAdmin(): void {
    this.showUserMenu = false;
    this.router.navigate(['/admin']);
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.notificationCount = 0;
    this.showNotifications = false;
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationCount = this.notifications.length;
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => {
          this.router.navigate(['/login']);
        }
      });
  }
}


