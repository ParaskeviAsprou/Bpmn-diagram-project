import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-admin-panel',
  template: `
    <div class="admin-panel">
      <div class="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage users, roles, and system configuration</p>
      </div>

      <nav class="admin-nav">
        <button 
          class="nav-btn"
          [class.active]="activeTab === 'users'"
          (click)="activeTab = 'users'">
          <i class="icon-users"></i>
          Users
        </button>
        <button 
          class="nav-btn"
          [class.active]="activeTab === 'roles'"
          (click)="activeTab = 'roles'">
          <i class="icon-roles"></i>
          Roles & Hierarchy
        </button>
        <button 
          class="nav-btn"
          [class.active]="activeTab === 'groups'"
          (click)="activeTab = 'groups'">
          <i class="icon-groups"></i>
          Groups
        </button>
        <button 
          class="nav-btn"
          [class.active]="activeTab === 'diagrams'"
          (click)="activeTab = 'diagrams'">
          <i class="icon-diagrams"></i>
          Diagram Access
        </button>
      </nav>

      <div class="admin-content">
        <app-user-management *ngIf="activeTab === 'users'"></app-user-management>
        <app-role-management *ngIf="activeTab === 'roles'"></app-role-management>
        <app-group-management *ngIf="activeTab === 'groups'"></app-group-management>
        <app-diagram-access-management *ngIf="activeTab === 'diagrams'"></app-diagram-access-management>
      </div>
    </div>
  `,
  styles: [`
    .admin-panel {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .admin-header {
      margin-bottom: 30px;
      text-align: center;
    }

    .admin-header h1 {
      color: #333;
      margin-bottom: 10px;
    }

    .admin-nav {
      display: flex;
      justify-content: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #e0e0e0;
    }

    .nav-btn {
      padding: 12px 24px;
      border: none;
      background: none;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }

    .nav-btn:hover {
      color: #2196f3;
      background-color: #f5f5f5;
    }

    .nav-btn.active {
      color: #2196f3;
      border-bottom-color: #2196f3;
    }

    .admin-content {
      min-height: 600px;
    }
  `]
})
export class AdminPanelComponent implements OnInit {
  activeTab: string = 'users';

  ngOnInit(): void {}
}
