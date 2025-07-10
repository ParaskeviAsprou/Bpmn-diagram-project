import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogConfig, MatDialogContent } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, Observable } from 'rxjs';
import { GroupService, Group } from '../../services/group.service';
import { RoleService, Role } from '../../services/role.service';
import { AssignToGroupRequest, AssignToRoleRequest, AssignToUserRequest, DiagramAssignment, DiagramAssignmentService } from '../../services/diagram-assgnment.service';
import { UserService } from '../../services/user.service';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatRadioButton } from '@angular/material/radio';
import { MatChip } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

export interface DiagramSharingData {
  diagramId: number;
  diagramName: string;
  canAssign: boolean;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}
@Component({
  selector: 'app-diagram-sharing',
  standalone: true,
  imports: [MatTableModule,
    CommonModule,
    MatLabel,MatError,MatOption,MatChip,
    MatRadioButton,
    MatCard,
    ReactiveFormsModule,
    MatCardContent,
    MatCardTitle,
    MatCard,
    MatCardHeader,
    MatIcon,
    MatFormField,
    MatInput,
    MatSelect,
    MatButton,
    MatDialogActions, 
    MatDialogContent
  ],
  templateUrl: './diagram-sharing.component.html',
  styleUrl: './diagram-sharing.component.css'
})
export class DiagramSharingComponent implements OnInit {
  assignmentForm: FormGroup;
  assignments: DiagramAssignment[] = [];
  loading = false;
  
  // Assignment options
  assignmentTypes = [
    { value: 'USER', label: 'User', icon: 'person' },
    { value: 'GROUP', label: 'Group', icon: 'group' },
    { value: 'ROLE', label: 'Role', icon: 'admin_panel_settings' }
  ];
  
  permissionLevels = [
    { value: 'VIEW', label: 'View Only', description: 'Can only view the diagram', color: 'primary' },
    { value: 'EDIT', label: 'Edit', description: 'Can view and edit the diagram', color: 'accent' },
    { value: 'ADMIN', label: 'Admin', description: 'Full control including sharing', color: 'warn' }
  ];
  
  // Available options for selection
  users: UserOption[] = [];
  groups: Group[] = [];
  roles: Role[] = [];
  
  // Filtered options based on assignment type
  get availableOptions(): any[] {
    const type = this.assignmentForm.get('assignmentType')?.value;
    switch (type) {
      case 'USER': return this.users;
      case 'GROUP': return this.groups;
      case 'ROLE': return this.roles;
      default: return [];
    }
  }

  displayedColumns = ['assignedTo', 'type', 'permission', 'assignedBy', 'date', 'actions'];

  constructor(
    public dialogRef: MatDialogRef<DiagramSharingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DiagramSharingData,
    private fb: FormBuilder,
    private assignmentService: DiagramAssignmentService,
    private userService: UserService,
    private groupService: GroupService,
    private roleService: RoleService,
    private snackBar: MatSnackBar
  ) {
    this.assignmentForm = this.fb.group({
      assignmentType: ['USER', Validators.required],
      targetId: ['', Validators.required],
      permissionLevel: ['VIEW', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    this.loadAssignments();
    
    // Watch for assignment type changes
    this.assignmentForm.get('assignmentType')?.valueChanges.subscribe(() => {
      this.assignmentForm.get('targetId')?.setValue('');
    });
  }

  loadData(): void {
    this.loading = true;
    
    forkJoin({
      users: this.userService.getAllUsers(),
      groups: this.groupService.getAllGroups(),
      roles: this.roleService.getAllRoles()
    }).subscribe({
      next: (data) => {
        this.users = data.users.map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          email: user.email
        }));
        this.groups = data.groups;
        this.roles = data.roles;
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to load assignment options');
        this.loading = false;
      }
    });
  }

  loadAssignments(): void {
    this.assignmentService.getDiagramAssignments(this.data.diagramId).subscribe({
      next: (assignments) => {
        this.assignments = assignments;
      },
      error: (error) => {
        this.showError('Failed to load current assignments');
      }
    });
  }

  createAssignment(): void {
    if (!this.assignmentForm.valid) return;
    
    const formValue = this.assignmentForm.value;
    const type = formValue.assignmentType;
    const targetId = formValue.targetId;
    const permissionLevel = formValue.permissionLevel;
    const notes = formValue.notes;
    
    this.loading = true;
    
    let assignmentRequest: Observable<DiagramAssignment>;
    
    switch (type) {
      case 'USER':
        const userRequest: AssignToUserRequest = {
          userId: targetId,
          permissionLevel,
          notes
        };
        assignmentRequest = this.assignmentService.assignToUser(this.data.diagramId, userRequest);
        break;
        
      case 'GROUP':
        const groupRequest: AssignToGroupRequest = {
          groupId: targetId,
          permissionLevel,
          notes
        };
        assignmentRequest = this.assignmentService.assignToGroup(this.data.diagramId, groupRequest);
        break;
        
      case 'ROLE':
        const roleRequest: AssignToRoleRequest = {
          roleId: targetId,
          permissionLevel,
          notes
        };
        assignmentRequest = this.assignmentService.assignToRole(this.data.diagramId, roleRequest);
        break;
        
      default:
        this.loading = false;
        return;
    }
    
    assignmentRequest.subscribe({
      next: (assignment) => {
        this.showSuccess('Assignment created successfully');
        this.loadAssignments();
        this.assignmentForm.reset();
        this.assignmentForm.patchValue({
          assignmentType: 'USER',
          permissionLevel: 'VIEW'
        });
        this.loading = false;
      },
      error: (error) => {
        this.showError(error.error?.message || 'Failed to create assignment');
        this.loading = false;
      }
    });
  }

  removeAssignment(assignment: DiagramAssignment): void {
    const assignedToName = assignment.assignedToName;
    
    if (confirm(`Remove access for "${assignedToName}"?`)) {
      this.assignmentService.removeAssignment(assignment.id).subscribe({
        next: () => {
          this.showSuccess('Assignment removed successfully');
          this.loadAssignments();
        },
        error: () => {
          this.showError('Failed to remove assignment');
        }
      });
    }
  }

  updatePermission(assignment: DiagramAssignment, newPermission: 'VIEW' | 'EDIT' | 'ADMIN'): void {
    this.assignmentService.updateAssignmentPermission(assignment.id, newPermission).subscribe({
      next: () => {
        this.showSuccess('Permission updated successfully');
        assignment.permissionLevel = newPermission;
      },
      error: () => {
        this.showError('Failed to update permission');
      }
    });
  }

  getOptionDisplayName(option: any, type: string): string {
    switch (type) {
      case 'USER':
        return option.name;
      case 'GROUP':
        return option.name;
      case 'ROLE':
        return option.displayName || option.name;
      default:
        return 'Unknown';
    }
  }

  getOptionSecondaryText(option: any, type: string): string {
    switch (type) {
      case 'USER':
        return option.email;
      case 'GROUP':
        return option.description || '';
      case 'ROLE':
        return option.description || '';
      default:
        return '';
    }
  }

  getAssignmentTypeIcon(type: string): string {
    switch (type) {
      case 'USER': return 'person';
      case 'GROUP': return 'group';
      case 'ROLE': return 'admin_panel_settings';
      default: return 'help';
    }
  }

  getPermissionColor(level: string): string {
    switch (level) {
      case 'VIEW': return 'primary';
      case 'EDIT': return 'accent';
      case 'ADMIN': return 'warn';
      default: return 'basic';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { 
      duration: 3000, 
      panelClass: 'success-snackbar' 
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', { 
      duration: 5000, 
      panelClass: 'error-snackbar' 
    });
  }
}