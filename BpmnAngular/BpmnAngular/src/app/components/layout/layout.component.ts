import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthenticationService, User } from '../../services/authentication.service';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-light" *ngIf="isLoggedIn">
      <div class="container-fluid">
        <a class="navbar-brand" routerLink="/dashboard">AKON-KORIMVOS</a>
        
        <button class="navbar-toggler" type="button" 
                data-bs-toggle="collapse" 
                data-bs-target="#navbarNav"
                [attr.aria-expanded]="isNavbarCollapsed ? 'false' : 'true'"
                aria-label="Toggle navigation"
                (click)="toggleNavbar()">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" 
             id="navbarNav" 
             [class.show]="!isNavbarCollapsed">
          
          <ul class="navbar-nav me-auto">
            <!-- Hidden file input for opening files -->
            <input #fileInput 
                   type="file" 
                   style="display: none"
                   accept=".bpmn,.xml"
                   (change)="openFile($event)" />
            
            <li class="nav-item">
              <a class="nav-link" 
                 routerLink="/dashboard" 
                 routerLinkActive="active">
                <i class="bx bx-home"></i> Dashboard
              </a>
            </li>
            
            <li class="nav-item">
              <a class="nav-link" 
                 routerLink="/modeler" 
                 routerLinkActive="active">
                <i class="bx bx-plus"></i> New Diagram
              </a>
            </li>
            
            <li class="nav-item">
              <a class="nav-link" 
                 routerLink="/files" 
                 routerLinkActive="active">
                <i class="bx bx-folder"></i> Files
              </a>
            </li>
            
            <li class="nav-item" 
                *ngIf="currentUser && (isAdmin || isModeler)">
              <button class="nav-link btn btn-link" 
                      (click)="openFileDialog()"
                      type="button">
                <i class="bx bx-upload"></i> Upload
              </button>
            </li>
            
            <li class="nav-item" *ngIf="isAdmin">
              <a class="nav-link" 
                 routerLink="/admin" 
                 routerLinkActive="active">
                <i class="bx bx-cog"></i> Admin
              </a>
            </li>
          </ul>

          <div class="d-flex align-items-center">
            <!-- User Info -->
            <div class="user-info me-3" *ngIf="currentUser">
              <span class="user-name">
                {{currentUser.firstname}} {{currentUser.lastname}}
              </span>
              <small class="user-role d-block">
                {{getUserRoleDisplay()}}
              </small>
            </div>

            <!-- Settings -->
            <a class="btn btn-outline-secondary me-2" 
               routerLink="/settings"
               title="Settings">
              <i class="bx bx-cog"></i>
            </a>

            <!-- Logout -->
            <button class="btn btn-danger" 
                    type="button"
                    (click)="logout()"
                    title="Logout">
              <i class="bx bx-log-out"></i> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content" [class.with-navbar]="isLoggedIn">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .navbar {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
    }

    .navbar-brand {
      font-weight: bold;
      color: #2c3e50 !important;
      text-decoration: none;
    }

    .navbar-brand:hover {
      color: #34495e !important;
    }

    .nav-link {
      color: #495057 !important;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px !important;
      border-radius: 6px;
      margin: 0 4px;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .nav-link:hover {
      background-color: #f8f9fa;
      color: #2c3e50 !important;
    }

    .nav-link.active {
      background-color: #667eea;
      color: white !important;
    }

    .nav-link.btn {
      border: none;
      background: none;
      cursor: pointer;
    }

    .user-info {
      text-align: right;
    }

    .user-name {
      font-weight: 600;
      color: #2c3e50;
    }

    .user-role {
      color: #6c757d;
      font-size: 0.8rem;
    }

    .main-content {
      min-height: 100vh;
      background-color: #f8f9fa;
    }

    .main-content.with-navbar {
      padding-top: 0;
    }

    .btn-danger {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      border: none;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-danger:hover {
      background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
    }

    .btn-outline-secondary {
      border: 1px solid #6c757d;
      color: #6c757d;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 38px;
      padding: 0;
    }

    .btn-outline-secondary:hover {
      background-color: #6c757d;
      color: white;
    }

    @media (max-width: 992px) {
      .navbar-nav {
        margin-top: 1rem;
      }
      
      .d-flex {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #dee2e6;
      }
      
      .user-info {
        text-align: left;
        margin-bottom: 1rem;
      }
    }

    .navbar-toggler {
      border: none;
    }

    .navbar-toggler:focus {
      box-shadow: none;
    }

    i {
      font-size: 16px;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  isLoggedIn = false;
  isNavbarCollapsed = true;
  
  // User role flags
  isAdmin = false;
  isModeler = false;
  isViewer = false;

  constructor(
    private authService: AuthenticationService,
    private fileService: FileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.currentUser = user;
        this.isLoggedIn = !!user;
        this.updateUserRoles();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateUserRoles(): void {
    this.isAdmin = this.authService.hasRole('ROLE_ADMIN');
    this.isModeler = this.authService.hasRole('ROLE_MODELER');
    this.isViewer = this.authService.hasRole('ROLE_VIEWER');
  }

  toggleNavbar(): void {
    this.isNavbarCollapsed = !this.isNavbarCollapsed;
  }

  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  openFileDialog(): void {
    const fileInput = document.querySelector('#fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  openFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Navigate to modeler with the file content
        this.router.navigate(['/modeler'], { 
          queryParams: { 
            openFile: 'true'
          }
        });
        // Store file content temporarily
        sessionStorage.setItem('uploadedFileContent', content);
        sessionStorage.setItem('uploadedFileName', file.name);
      };
      reader.readAsText(file);
      
      // Clear input
      input.value = '';
    }
  }

  getUserRoleDisplay(): string {
    if (this.isAdmin) return 'Administrator';
    if (this.isModeler) return 'Modeler';
    if (this.isViewer) return 'Viewer';
    return 'User';
  }
}