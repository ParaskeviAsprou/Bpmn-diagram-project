import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthenticationService, User } from './services/authentication.service';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslateModule, HeaderComponent, SidebarComponent, FooterComponent, NotificationComponent],
  template: `
    <div class="app-container" [class.authenticated]="currentUser">
      <!-- Header - only show when authenticated and not on auth pages -->
      <app-header 
        *ngIf="currentUser && !isAuthPage"
        [currentUser]="currentUser">
      </app-header>

      <!-- Main Content Area -->
      <div class="main-content" [class.with-sidebar]="currentUser && !isAuthPage">
        <!-- Sidebar - only show when authenticated and not on auth pages -->
        <app-sidebar 
          *ngIf="currentUser && !isAuthPage"
          [currentUser]="currentUser">
        </app-sidebar>

        <!-- Router Outlet - main content area -->
        <div class="content-area" [class.full-width]="!currentUser || isAuthPage">
          <router-outlet></router-outlet>
        </div>
      </div>

      <!-- Footer - only show when authenticated and not on auth pages -->
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
      width: 100%;
    }

    .main-content {
      flex: 1;
      display: flex;
      position: relative;
    }

    .main-content.with-sidebar {
      padding-top: 60px; /* Header height */
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
      background: #f5f5f5;
      margin-left: 260px; /* Sidebar width */
      transition: margin-left 0.3s ease;
      min-height: calc(100vh - 60px); /* Full height minus header */
    }

    .content-area.full-width {
      margin-left: 0;
      padding-top: 0;
      min-height: 100vh;
    }

    /* When sidebar is collapsed */
    :host-context(body.sidebar-collapsed) .content-area {
      margin-left: 70px;
    }

    /* Auth pages styling */
    .app-container:not(.authenticated) {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .app-container:not(.authenticated) .content-area {
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .content-area {
        margin-left: 0 !important;
      }
      
      .main-content.with-sidebar {
        padding-top: 60px;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  isAuthPage = false;

  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('AppComponent initializing...');

    // Set initial auth page state based on current URL
    const initialUrl = this.router.url;
    this.isAuthPage = initialUrl.startsWith('/login') || initialUrl.startsWith('/register');
    console.log('Initial URL:', this.router.url, 'Is auth page:', this.isAuthPage);

    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user
      });

    // Track navigation to determine if we're on auth pages
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          const url = (event as NavigationEnd).urlAfterRedirects || event.url;
          this.isAuthPage = url.startsWith('/login') || url.startsWith('/register');
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
    console.log('Initializing application...');
    
    // Initialize user from storage if available (only if not on auth pages)
    if (!this.isAuthPage) {
      this.authService.initializeUserFromStorage();
    }
    
    // Check if user is already authenticated on app start
    const isAuthenticated = this.authService.isAuthenticated();
    console.log('Initial authentication check:', isAuthenticated);

    if (!isAuthenticated) {
      // Ensure user state is cleared if not authenticated
      console.log('User not authenticated, ensuring clean state');
      // Force clear any potential user state
      this.currentUser = null;
    }

    if (isAuthenticated && !this.isAuthPage) {
      // Validate token and load user data (only if not on auth pages)
      this.authService.ensureValidToken()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (isValid) => {
            if (!isValid) {
              console.log('Token validation failed, redirecting to login');
              this.authService.logout();
              this.router.navigate(['/login']);
            } else {
              console.log('Token is valid, user is authenticated');
              // If we're on the root page but authenticated, redirect to dashboard
              const currentUrl = this.router.url;
              if (currentUrl === '/') {
                console.log('Redirecting authenticated user to dashboard');
                this.router.navigate(['/dashboard']);
              }
            }
          },
          error: (error) => {
            console.error('Token validation error:', error);
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        });
    } else if (!isAuthenticated && !this.isAuthPage) {
      // Redirect to login if not authenticated and not on auth pages
      const currentUrl = this.router.url;
      if (!['/login', '/register'].includes(currentUrl)) {
        console.log('User not authenticated, redirecting to login from:', currentUrl);
        this.router.navigate(['/login']);
      }
    }
  }
}

