import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Role, RoleService, RoleTreeNode } from '../../services/role.service';


interface RoleFormData {
  name: string;
  displayName: string;
  description: string;
}

@Component({
  selector: 'app-role-management',
  standalone:true,
  imports: [],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css'],
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

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    this.loadRoles();
    this.loadRoleHierarchy();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRoles(): void {
    this.roleService.getAllRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.roles = roles;
        },
        error: (error) => {
          console.error('Error loading roles:', error);
        }
      });
  }

  loadRoleHierarchy(): void {
    this.roleService.getRoleHierarchyTree()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tree) => {
          this.roleTree = tree;
        },
        error: (error) => {
          console.error('Error loading role hierarchy:', error);
        }
      });
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
      this.roleService.deleteRole(role.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadRoles();
            this.loadRoleHierarchy();
          },
          error: (error) => {
            console.error('Error deleting role:', error);
            alert('Error deleting role: ' + error.message);
          }
        });
    }
  }

  addChildRole(): void {
    if (this.selectedParentRole && this.selectedChildRoleId) {
      this.roleService.createHierarchy(
        this.selectedParentRole.id,
        this.selectedChildRoleId,
        this.hierarchyLevel
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRoleHierarchy();
          this.closeModals();
        },
        error: (error) => {
          console.error('Error adding child role:', error);
          alert('Error adding child role: ' + error.message);
        }
      });
    }
  }

  // addChildRole(parentRole: Role): void {
  //   this.selectedParentRole = parentRole;
  //   this.availableChildRoles = this.roles.filter(role => 
  //     role.id !== parentRole.id && !this.isInHierarchy(role.id, parentRole.id)
  //   );
  //   this.showAddChildModal = true;
  // }

  private isInHierarchy(childId: number, parentId: number): boolean {
    // Implementation to check if childId is already in the hierarchy under parentId
    // This would require traversing the role tree
    return false; // Simplified for now
  }

  saveRole(): void {
    if (this.editingRole) {
      this.roleService.updateRole(this.editingRole.id, this.roleFormData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadRoles();
            this.closeModals();
          },
          error: (error) => {
            console.error('Error updating role:', error);
            alert('Error updating role: ' + error.message);
          }
        });
    } else {
      this.roleService.createRole(this.roleFormData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadRoles();
            this.closeModals();
          },
          error: (error) => {
            console.error('Error creating role:', error);
            alert('Error creating role: ' + error.message);
          }
        });
    }
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