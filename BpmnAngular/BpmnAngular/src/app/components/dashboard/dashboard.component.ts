
// dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { UserService } from '../../services/user.service';
import { AuthenticationService, User } from '../../services/authentication.service';
import { DiagramFile, DiagramService } from '../../services/diagram-assgnment.service';
import { PermissionDirective } from '../../directives/permission.directive';
import { RoleDirective } from '../../directives/role.directive';

interface DashboardStats {
  totalDiagrams: number;
  myDiagrams: number;
  sharedWithMe: number;
  totalUsers: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PermissionDirective, RoleDirective],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="welcome-section">
          <h1>Welcome back, {{currentUser?.firstName}}!</h1>
          <p>Here's what's happening with your business processes today.</p>
        </div>
        <div class="header-actions">
          <button 
            *appHasPermission="'create-diagrams'"
            class="btn btn-primary" 
            routerLink="/diagrams/create">
            <i class="icon-plus"></i>
            Create New Diagram
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="icon-diagrams"></i>
          </div>
          <div class="stat-content">
            <h3>{{stats.totalDiagrams}}</h3>
            <p>Total Diagrams</p>
          </div>
        </div>
        
        <div class="stat-card" *appHasPermission="'create-diagrams'">
          <div class="stat-icon">
            <i class="icon-user"></i>
          </div>
          <div class="stat-content">
            <h3>{{stats.myDiagrams}}</h3>
            <p>My Diagrams</p>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">
            <i class="icon-share"></i>
          </div>
          <div class="stat-content">
            <h3>{{stats.sharedWithMe}}</h3>
            <p>Shared with Me</p>
          </div>
        </div>
        
        <div class="stat-card" *appHasRole="'ROLE_ADMIN'">
          <div class="stat-icon">
            <i class="icon-users"></i>
          </div>
          <div class="stat-content">
            <h3>{{stats.totalUsers}}</h3>
            <p>Total Users</p>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Recent Diagrams -->
        <div class="dashboard-card">
          <div class="card-header">
            <h2>Recent Diagrams</h2>
            <a routerLink="/diagrams" class="view-all">View All</a>
          </div>
          <div class="card-content">
            <div class="diagram-list" *ngIf="recentDiagrams.length > 0; else noDiagrams">
              <div *ngFor="let diagram of recentDiagrams" class="diagram-item">
                <div class="diagram-info">
                  <h4>{{diagram.fileName}}</h4>
                  <p>{{diagram.description || 'No description'}}</p>
                  <div class="diagram-meta">
                    <span>Updated {{diagram.updatedTime | date:'short'}}</span>
                    <span>by {{diagram.updatedBy || diagram.createdBy}}</span>
                  </div>
                </div>
                <div class="diagram-actions">
                  <button class="btn btn-sm btn-outline" [routerLink]="['/diagrams/view', diagram.id]">
                    View
                  </button>
                  <button 
                    *appHasPermission="'edit-diagrams'"
                    class="btn btn-sm btn-primary" 
                    [routerLink]="['/diagrams/edit', diagram.id]">
                    Edit
                  </button>
                </div>
              </div>
            </div>
            <ng-template #noDiagrams>
              <div class="empty-state">
                <i class="icon-diagrams"></i>
                <h3>No diagrams yet</h3>
                <p>Start by creating your first BPMN diagram</p>
                <button 
                  *appHasPermission="'create-diagrams'"
                  class="btn btn-primary" 
                  routerLink="/diagrams/create">
                  Create Diagram
                </button>
              </div>
            </ng-template>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-card">
          <div class="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div class="card-content">
            <div class="quick-actions">
              <a 
                *appHasPermission="'create-diagrams'"
                routerLink="/diagrams/create" 
                class="quick-action-item">
                <i class="icon-plus"></i>
                <span>Create Diagram</span>
              </a>
              <a routerLink="/diagrams" class="quick-action-item">
                <i class="icon-list"></i>
                <span>Browse Diagrams</span>
              </a>
              <a 
                *appHasRole="'ROLE_ADMIN'"
                routerLink="/admin" 
                class="quick-action-item">
                <i class="icon-admin"></i>
                <span>Admin Panel</span>
              </a>
              <a routerLink="/profile" class="quick-action-item">
                <i class="icon-settings"></i>
                <span>Settings</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Role Information -->
        <div class="dashboard-card">
          <div class="card-header">
            <h2>Your Roles</h2>
          </div>
          <div class="card-content">
            <div class="role-info">
              <div class="role-badges">
                <span 
                  *ngFor="let role of currentUser?.roles" 
                  class="role-badge"
                  [class]="getRoleBadgeClass(role.name)">
                  {{role.displayName || role.name}}
                </span>
              </div>
              <div class="role-permissions">
                <h4>Your Permissions:</h4>
                <ul class="permission-list">
                  <li *ngIf="hasPermission('view-diagrams')">
                    <i class="icon-check"></i>
                    View diagrams
                  </li>
                  <li *ngIf="hasPermission('edit-diagrams')">
                    <i class="icon-check"></i>
                    Create and edit diagrams
                  </li>
                  <li *ngIf="hasPermission('assign-diagrams')">
                    <i class="icon-check"></i>
                    Manage diagram access
                  </li>
                  <li *ngIf="hasPermission('manage-users')">
                    <i class="icon-check"></i>
                    Manage users and roles
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 30px;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
    }

    .welcome-section h1 {
      margin: 0 0 5px 0;
      color: #2c3e50;
      font-size: 28px;
      font-weight: 600;
    }

    .welcome-section p {
      margin: 0;
      color: #7f8c8d;
      font-size: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .stat-content h3 {
      margin: 0 0 5px 0;
      color: #2c3e50;
      font-size: 24px;
      font-weight: 600;
    }

    .stat-content p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 30px;
    }

    .dashboard-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #f0f0f0;
    }

    .card-header h2 {
      margin: 0;
      color: #2c3e50;
      font-size: 18px;
      font-weight: 600;
    }

    .view-all {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
    }

    .view-all:hover {
      text-decoration: underline;
    }

    .card-content {
      padding: 20px;
    }

    .diagram-list {
      display: grid;
      gap: 15px;
    }

    .diagram-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      transition: all 0.3s ease;
    }

    .diagram-item:hover {
      background: #f8f9fa;
    }

    .diagram-info h4 {
      margin: 0 0 5px 0;
      color: #2c3e50;
      font-size: 16px;
    }

    .diagram-info p {
      margin: 0 0 8px 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .diagram-meta {
      display: flex;
      gap: 10px;
      font-size: 12px;
      color: #95a5a6;
    }

    .diagram-actions {
      display: flex;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #7f8c8d;
    }

    .empty-state i {
      font-size: 48px;
      margin-bottom: 15px;
      color: #bdc3c7;
    }

    .empty-state h3 {
      margin: 0 0 10px 0;
      color: #7f8c8d;
    }

    .empty-state p {
      margin: 0 0 20px 0;
    }

    .quick-actions {
      display: grid;
      gap: 10px;
    }

    .quick-action-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      text-decoration: none;
      color: #2c3e50;
      transition: all 0.3s ease;
    }

    .quick-action-item:hover {
      background: #f8f9fa;
      border-color: #667eea;
    }

    .quick-action-item i {
      color: #667eea;
    }

    .role-info {
      display: grid;
      gap: 20px;
    }

    .role-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .role-badge {
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      color: white;
    }

    .role-badge.admin {
      background: #e74c3c;
    }

    .role-badge.modeler {
      background: #3498db;
    }

    .role-badge.viewer {
      background: #27ae60;
    }

    .role-badge.default {
      background: #95a5a6;
    }

    .role-permissions h4 {
      margin: 0 0 10px 0;
      color: #2c3e50;
      font-size: 14px;
    }

    .permission-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .permission-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      color: #27ae60;
      font-size: 14px;
    }

    .permission-list i {
      color: #27ae60;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .dashboard {
        padding: 20px;
      }

      .dashboard-header {
        flex-direction: column;
        gap: 20px;
        align-items: stretch;
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  loading = false;
  
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
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
}
