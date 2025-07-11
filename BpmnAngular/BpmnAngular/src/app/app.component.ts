import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthenticationService, User } from './services/authentication.service';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationService } from './services/notification.service';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, FooterComponent, NotificationComponent],
  template: `
    <div class="app-container" [class.authenticated]="currentUser">
      <!-- Header -->
      <app-header 
        *ngIf="currentUser && !isAuthPage"
        [currentUser]="currentUser">
      </app-header>

      <!-- Main Content Area -->
      <div class="main-content" [class.with-sidebar]="currentUser && !isAuthPage">
        <!-- Sidebar -->
        <app-sidebar 
          *ngIf="currentUser && !isAuthPage"
          [currentUser]="currentUser">
        </app-sidebar>

        <!-- Router Outlet -->
        <div class="content-area" [class.full-width]="!currentUser || isAuthPage">
          <router-outlet></router-outlet>
        </div>
      </div>

      <!-- Footer -->
      <app-footer 
        *ngIf="currentUser && !isAuthPage">
      </app-footer>

      <!-- Global Notifications -->
      <app-notification></app-notification>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
      display: flex;
    }

    .main-content.with-sidebar {
      padding-top: 60px; /* Header height */
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
      background: #f5f5f5;
    }

    .content-area.full-width {
      padding-top: 0;
    }

    /* Auth pages styling */
    .app-container:not(.authenticated) .content-area {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  isAuthPage = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Track navigation to determine if we're on auth pages
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.isAuthPage = ['/login', '/register'].includes(event.url);
        }
      });

    // Initialize app
    this.initializeApp();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeApp(): void {
    // Check if user is already authenticated on app start
    if (this.authService.isAuthenticated()) {
      // Validate token and load user data
      this.authService.validateToken()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            if (!result.valid) {
              this.authService.logout().subscribe();
            }
          },
          error: () => {
            this.authService.logout().subscribe();
          }
        });
    } else {
      // Redirect to login if not authenticated and not on auth pages
      const currentUrl = this.router.url;
      if (!['/login', '/register'].includes(currentUrl)) {
        this.router.navigate(['/login']);
      }
    }
  }
}