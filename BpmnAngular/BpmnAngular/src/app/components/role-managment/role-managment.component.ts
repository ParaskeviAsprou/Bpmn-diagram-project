import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Mock interfaces - replace with actual imports
interface Role {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
}

interface RoleTreeNode {
  role: Role;
  level: number;
  children: RoleTreeNode[];
}

interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-managment.component.html',
  styleUrls: ['./role-managment.component.css']
})
export class RoleManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  roles: Role[] = [];
  roleTree: RoleTreeNode[] = [];
  
  showCreateRoleModal = false;
  showEditRoleModal = false;
  showAddChildModal = false;
  
  editingRole: Role | null = null;
  selectedParentRole: Role | null = null;
  selectedChildRoleId: number | null = null;
  hierarchyLevel = 1;
  availableChildRoles: Role[] = [];
  
  roleFormData: RoleFormData = {
    name: '',
    displayName: '',
    description: ''
  };

  constructor() {}

  ngOnInit(): void {
    this.loadMockData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMockData(): void {
    // Mock roles data
    this.roles = [
      {
        id: 1,
        name: 'ROLE_ADMIN',
        displayName: 'Administrator',
        description: 'Full system access'
      },
      {
        id: 2,
        name: 'ROLE_MODELER',
        displayName: 'Modeler',
        description: 'Can create and edit diagrams'
      },
      {
        id: 3,
        name: 'ROLE_VIEWER',
        displayName: 'Viewer',
        description: 'Can view diagrams only'
      }
    ];

    // Mock role tree
    this.roleTree = [
      {
        role: this.roles[0], // Admin
        level: 1,
        children: [
          {
            role: this.roles[1], // Modeler
            level: 2,
            children: [
              {
                role: this.roles[2], // Viewer
                level: 3,
                children: []
              }
            ]
          }
        ]
      }
    ];
  }

  editRole(role: Role): void {
    this.editingRole = role;
    this.roleFormData = {
      name: role.name,
      displayName: role.displayName || '',
      description: role.description || ''
    };
    this.showEditRoleModal = true;
  }

  deleteRole(role: Role): void {
    if (confirm(`Are you sure you want to delete the role "${role.displayName || role.name}"?`)) {
      // Mock deletion - replace with actual service call
      console.log('Deleting role:', role);
      this.roles = this.roles.filter(r => r.id !== role.id);
      this.loadMockData(); // Refresh hierarchy
    }
  }

  addChildRole(): void {
    if (this.selectedParentRole && this.selectedChildRoleId) {
      // Mock hierarchy creation - replace with actual service call
      console.log('Adding child role:', {
        parentId: this.selectedParentRole.id,
        childId: this.selectedChildRoleId,
        level: this.hierarchyLevel
      });
      
      this.closeModals();
      this.loadMockData(); // Refresh hierarchy
    }
  }

  saveRole(): void {
    if (this.editingRole) {
      // Mock update - replace with actual service call
      console.log('Updating role:', this.editingRole.id, this.roleFormData);
      
      const index = this.roles.findIndex(r => r.id === this.editingRole!.id);
      if (index > -1) {
        this.roles[index] = { ...this.roles[index], ...this.roleFormData };
      }
    } else {
      // Mock create - replace with actual service call
      console.log('Creating role:', this.roleFormData);
      
      const newRole: Role = {
        id: Math.max(...this.roles.map(r => r.id)) + 1,
        ...this.roleFormData
      };
      this.roles.push(newRole);
    }
    
    this.closeModals();
    this.loadMockData(); // Refresh data
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    if (roleName.includes('MANAGER')) return 'manager';
    return 'default';
  }

  closeModals(): void {
    this.showCreateRoleModal = false;
    this.showEditRoleModal = false;
    this.showAddChildModal = false;
    this.editingRole = null;
    this.selectedParentRole = null;
    this.selectedChildRoleId = null;
    this.roleFormData = {
      name: '',
      displayName: '',
      description: ''
    };
  }
}