import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatIcon } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatOption } from '@angular/material/core';

import { Role, RoleHierarchy, RoleTreeNode, User, RoleManagementService } from '../../services/role-management.service';
import { RoleTreeNodeComponent } from "../role-tree-node/role-tree-node.component";

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    MatTab,
    MatTabGroup,
    ReactiveFormsModule,
    MatHint,
    MatError,
    CommonModule,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatCardSubtitle,
    MatCardContent,
    MatChipsModule,
    MatIcon,
    MatFormField,
    MatLabel,
    FormsModule,
    MatOption,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    RoleTreeNodeComponent
],
  templateUrl: './role-managment.component.html',
  styleUrls: ['./role-managment.component.css'],
})
export class RoleManagementComponent implements OnInit {
  // Tab management
  selectedTab = 0;

  // Role management
  roleForm!: FormGroup;
  roles: Role[] = [];
  editingRole: Role | null = null;
  displayedColumns = ['name', 'displayName', 'description', 'actions'];

  // Hierarchy management
  hierarchyForm!: FormGroup;
  hierarchies: RoleHierarchy[] = [];
  roleHierarchyTree: RoleTreeNode[] = [];
  availableParentRoles: Role[] = [];
  availableChildRoles: Role[] = [];
  hierarchyColumns = ['parentRole', 'childRole', 'level', 'actions'];

  // Loading state
  loading = false;

  constructor(
    private roleManagementService: RoleManagementService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadRoles();
    this.loadHierarchies();
    this.loadRoleHierarchyTree();
  }

  private initializeForms() {
    // Role form
    this.roleForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.pattern(/^ROLE_[A-Z_]+$/)
      ]],
      displayName: ['', Validators.required],
      description: ['']
    });

    // Hierarchy form
    this.hierarchyForm = this.fb.group({
      parentRoleId: ['', Validators.required],
      childRoleId: ['', Validators.required],
      hierarchyLevel: [1, [Validators.required, Validators.min(1)]]
    });
  }

  // Role Management Methods
  loadRoles() {
    this.loading = true;
    this.roleManagementService.getAllRoles().subscribe({
      next: (roles: Role[]) => {
        this.roles = roles;
        this.updateAvailableRoles();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading roles:', error);
        this.snackBar.open('Failed to load roles', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  saveRole() {
    if (!this.roleForm.valid) return;

    this.loading = true;
    const roleData = this.roleForm.value;

    const operation = this.editingRole
      ? this.roleManagementService.updateRole(this.editingRole.id, roleData)
      : this.roleManagementService.createRole(roleData);

    operation.subscribe({
      next: () => {
        const message = this.editingRole ? 'Role updated successfully' : 'Role created successfully';
        this.snackBar.open(message, 'Close', { duration: 3000 });
        this.resetRoleForm();
        this.loadRoles();
      },
      error: (error: any) => {
        console.error('Error saving role:', error);
        this.snackBar.open('Failed to save role', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  editRole(role: Role) {
    this.editingRole = role;
    this.roleForm.patchValue({
      name: role.name,
      displayName: role.displayName,
      description: role.description
    });
  }

  resetRoleForm() {
    this.editingRole = null;
    this.roleForm.reset();
    this.loading = false;
  }

  deleteRole(role: Role) {
    if (role.name === 'ROLE_ADMIN') {
      this.snackBar.open('Cannot delete ROLE_ADMIN', 'Close', { duration: 3000 });
      return;
    }

    if (confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) {
      this.roleManagementService.deleteRole(role.id).subscribe({
        next: () => {
          this.snackBar.open('Role deleted successfully', 'Close', { duration: 3000 });
          this.loadRoles();
        },
        error: (error: any) => {
          console.error('Error deleting role:', error);
          this.snackBar.open('Failed to delete role', 'Close', { duration: 3000 });
        }
      });
    }
  }

  // Hierarchy Management Methods
  loadHierarchies() {
    this.roleManagementService.getAllHierarchies().subscribe({
      next: (hierarchies: RoleHierarchy[]) => {
        this.hierarchies = hierarchies;
      },
      error: (error: any) => {
        console.error('Error loading hierarchies:', error);
        this.snackBar.open('Failed to load hierarchies', 'Close', { duration: 3000 });
      }
    });
  }

  loadRoleHierarchyTree() {
    this.roleManagementService.getRoleHierarchyTree().subscribe({
      next: (tree: RoleTreeNode[]) => {
        this.roleHierarchyTree = tree;
      },
      error: (error: any) => {
        console.error('Error loading role hierarchy tree:', error);
        this.snackBar.open('Failed to load role hierarchy tree', 'Close', { duration: 3000 });
      }
    });
  }

  updateAvailableRoles() {
    this.availableParentRoles = [...this.roles];
    this.availableChildRoles = [...this.roles];
  }

  onParentRoleChange() {
    const parentRoleId = this.hierarchyForm.get('parentRoleId')?.value;
    
    // Filter out the selected parent role from child roles to prevent self-reference
    this.availableChildRoles = this.roles.filter(role => role.id !== parentRoleId);
    
    // Reset child role selection if it's the same as parent
    const childRoleId = this.hierarchyForm.get('childRoleId')?.value;
    if (childRoleId === parentRoleId) {
      this.hierarchyForm.get('childRoleId')?.setValue('');
    }
  }

  createHierarchy() {
    if (!this.hierarchyForm.valid) return;

    this.loading = true;
    const formValue = this.hierarchyForm.value;

    this.roleManagementService.createRoleHierarchy(
      formValue.parentRoleId,
      formValue.childRoleId,
      formValue.hierarchyLevel
    ).subscribe({
      next: () => {
        this.snackBar.open('Hierarchy created successfully', 'Close', { duration: 3000 });
        this.hierarchyForm.reset();
        this.hierarchyForm.get('hierarchyLevel')?.setValue(1);
        this.loadHierarchies();
        this.loadRoleHierarchyTree();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error creating hierarchy:', error);
        this.snackBar.open('Failed to create hierarchy', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  updateHierarchyLevel(hierarchy: RoleHierarchy, newLevel: string) {
    const level = parseInt(newLevel, 10);
    if (level < 1 || isNaN(level)) {
      this.snackBar.open('Invalid hierarchy level', 'Close', { duration: 3000 });
      return;
    }

    this.roleManagementService.updateHierarchyLevel(hierarchy.id, level).subscribe({
      next: () => {
        this.snackBar.open('Hierarchy level updated', 'Close', { duration: 3000 });
        this.loadHierarchies();
        this.loadRoleHierarchyTree();
      },
      error: (error: any) => {
        console.error('Error updating hierarchy level:', error);
        this.snackBar.open('Failed to update hierarchy level', 'Close', { duration: 3000 });
      }
    });
  }

  deleteHierarchy(hierarchy: RoleHierarchy) {
    if (confirm('Are you sure you want to delete this hierarchy relationship?')) {
      this.roleManagementService.deleteRoleHierarchy(hierarchy.id).subscribe({
        next: () => {
          this.snackBar.open('Hierarchy deleted successfully', 'Close', { duration: 3000 });
          this.loadHierarchies();
          this.loadRoleHierarchyTree();
        },
        error: (error: any) => {
          console.error('Error deleting hierarchy:', error);
          this.snackBar.open('Failed to delete hierarchy', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.displayName : 'Unknown Role';
  }
  onHierarchyLevelBlur(hierarchy: any, event: FocusEvent) {
  const input = event.target as HTMLInputElement | null;
  if (input && input.value !== undefined) {
    this.updateHierarchyLevel(hierarchy, input.value);
  }
}
}
