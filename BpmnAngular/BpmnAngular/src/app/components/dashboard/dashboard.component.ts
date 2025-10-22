// dashboard.component.ts - Updated with proper navigation
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { UserService } from '../../services/user.service';
import { AuthenticationService, User } from '../../services/authentication.service';
import { DiagramFile, DiagramService } from '../../services/diagram-assgnment.service';
import { PermissionDirective } from '../../directives/permission.directive';
import { RoleDirective } from '../../directives/role.directive';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface DashboardStats {
  totalDiagrams: number;
  myDiagrams: number;
  sharedWithMe: number;
  totalUsers: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  loading = false;
  
  // Permission flags
  canCreateDiagrams = false;
  canEditDiagrams = false;
  canViewDiagrams = false;
  isAdmin = false;
  
  stats: DashboardStats = {
    totalDiagrams: 0,
    myDiagrams: 0,
    sharedWithMe: 0,
    totalUsers: 0
  };
  
  recentDiagrams: DiagramFile[] = [];

  constructor(
    private authService: AuthenticationService,
    private diagramService: DiagramService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.initializePermissions();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializePermissions(): void {
    this.canViewDiagrams = this.authService.hasRole('ROLE_VIEWER') ||
                          this.authService.hasRole('ROLE_MODELER') ||
                          this.authService.hasRole('ROLE_ADMIN');

    this.canCreateDiagrams = this.authService.hasRole('ROLE_MODELER') ||
                            this.authService.hasRole('ROLE_ADMIN');

    this.canEditDiagrams = this.authService.hasRole('ROLE_MODELER') ||
                          this.authService.hasRole('ROLE_ADMIN');

    this.isAdmin = this.authService.hasRole('ROLE_ADMIN');

    console.log('Dashboard permissions:', {
      canView: this.canViewDiagrams,
      canCreate: this.canCreateDiagrams,
      canEdit: this.canEditDiagrams,
      isAdmin: this.isAdmin
    });
  }

  loadDashboardData(): void {
    this.loading = true;
    
    const requests = {
      diagrams: this.diagramService.getAvailableDiagrams()
    };

    // Add admin-only requests
    if (this.authService.hasRole('ROLE_ADMIN')) {
      Object.assign(requests, {
        allDiagrams: this.diagramService.getAllFiles(),
        users: this.userService.getAllUsers()
      });
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          // Set available diagrams
          this.recentDiagrams = data.diagrams.slice(0, 5);
          this.stats.sharedWithMe = data.diagrams.length;

          // Set admin stats if available
          if (data.allDiagrams) {
            this.stats.totalDiagrams = data.allDiagrams.length;
            this.stats.myDiagrams = data.allDiagrams.filter(
              (d: DiagramFile) => d.createdBy === this.currentUser?.email
            ).length;
          } else {
            this.stats.totalDiagrams = data.diagrams.length;
            this.stats.myDiagrams = data.diagrams.filter(
              (d: DiagramFile) => d.createdBy === this.currentUser?.email
            ).length;
          }

          if (data.users) {
            this.stats.totalUsers = data.users.length;
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.loading = false;
        }
      });
  }

  // Navigation methods
  createNewDiagram(): void {
    if (this.canCreateDiagrams) {
      this.router.navigate(['/modeler'], { queryParams: { new: 'true' } });
    }
  }

  viewDiagram(diagramId: number): void {
    if (this.canViewDiagrams) {
      this.router.navigate(['/modeler', diagramId]);
    }
  }

  editDiagram(diagramId: number): void {
    if (this.canEditDiagrams) {
      this.router.navigate(['/modeler'], { queryParams: { fileId: diagramId } });
    }
  }

  navigateToFiles(): void {
    this.router.navigate(['/files']);
  }

  navigateToAdmin(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin']);
    }
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    return 'default';
  }

  hasPermission(permission: string): boolean {
    const permissionMap: { [key: string]: string[] } = {
      'view-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER', 'ROLE_VIEWER'],
      'edit-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'create-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'assign-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'manage-users': ['ROLE_ADMIN']
    };

    const allowedRoles = permissionMap[permission] || [];
    return this.authService.hasAnyRole(allowedRoles);
  }

  // New methods for dashboard functionality
  navigateToUserManagement(): void {
    if (this.isAdmin) {
      this.router.navigate(['/user-management']);
    }
  }

  getRoleColor(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'accent';
    if (roleName.includes('MODELER')) return 'primary';
    if (roleName.includes('VIEWER')) return 'warn';
    return 'primary';
  }

  getRoleIcon(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin_panel_settings';
    if (roleName.includes('MODELER')) return 'edit';
    if (roleName.includes('VIEWER')) return 'visibility';
    return 'person';
  }

  canEdit(): boolean {
    return this.authService.canEdit();
  }

  canView(): boolean {
    return this.authService.canView();
  }
}