import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

// Mock interface - replace with actual import
interface DiagramAssignment {
  id: number;
  assignmentType: 'USER' | 'GROUP' | 'ROLE';
  assignedUserId?: number;
  assignedGroupId?: number;
  assignedRoleId?: number;
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
}

export interface DiagramSharingData {
  diagramId: number;
  diagramName: string;
  canAssign: boolean;
}

export interface DiagramSharingResult {
  assignments: {
    users: number[];
    groups: number[];
    roles: number[];
  };
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
}

@Component({
  selector: 'app-diagram-sharing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './diagram-sharing.component.html',
  styleUrls: ['./diagram-sharing.component.css']
})
export class DiagramSharingComponent implements OnInit {
  permissionControl = new FormControl<'VIEW' | 'EDIT' | 'ADMIN'>('VIEW');
  usersControl = new FormControl<number[]>([]);
  groupsControl = new FormControl<number[]>([]);
  rolesControl = new FormControl<number[]>([]);

  availableUsers: any[] = [];
  availableGroups: any[] = [];
  availableRoles: any[] = [];
  currentAssignments: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DiagramSharingComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DiagramSharingData
  ) {}

  ngOnInit() {
    this.loadAvailableOptions();
    this.loadCurrentAssignments();
  }

  private loadAvailableOptions() {
    // Mock data - replace with actual service calls
    this.availableUsers = [
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
    ];
    
    this.availableGroups = [
      { id: 1, name: 'Developers', description: 'Development Team' },
      { id: 2, name: 'Managers', description: 'Management Team' }
    ];
    
    this.availableRoles = [
      { id: 1, name: 'ROLE_MODELER', displayName: 'Modeler', description: 'Can edit diagrams' },
      { id: 2, name: 'ROLE_VIEWER', displayName: 'Viewer', description: 'Can view diagrams' }
    ];
  }

  private loadCurrentAssignments() {
    if (this.data.diagramId) {
      // Mock current assignments - replace with actual service call
      this.currentAssignments = [
        {
          id: 1,
          assignmentType: 'USER',
          assignedUserId: 1,
          permissionLevel: 'EDIT'
        }
      ];
    }
  }

  hasSelections(): boolean {
    return (this.usersControl.value?.length || 0) > 0 ||
           (this.groupsControl.value?.length || 0) > 0 ||
           (this.rolesControl.value?.length || 0) > 0;
  }

  getUserName(userId: number): string {
    const user = this.availableUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  }

  getGroupName(groupId: number): string {
    const group = this.availableGroups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  }

  getRoleName(roleId: number): string {
    const role = this.availableRoles.find(r => r.id === roleId);
    return role ? role.displayName : 'Unknown Role';
  }

  removeUser(userId: number) {
    const current = this.usersControl.value || [];
    this.usersControl.setValue(current.filter(id => id !== userId));
  }

  removeGroup(groupId: number) {
    const current = this.groupsControl.value || [];
    this.groupsControl.setValue(current.filter(id => id !== groupId));
  }

  removeRole(roleId: number) {
    const current = this.rolesControl.value || [];
    this.rolesControl.setValue(current.filter(id => id !== roleId));
  }

  getAssignmentIcon(type: string): string {
    switch (type) {
      case 'USER': return 'person';
      case 'GROUP': return 'group';
      case 'ROLE': return 'security';
      default: return 'help';
    }
  }

  getAssignmentName(assignment: any): string {
    switch (assignment.assignmentType) {
      case 'USER':
        return this.getUserName(assignment.assignedUserId);
      case 'GROUP':
        return this.getGroupName(assignment.assignedGroupId);
      case 'ROLE':
        return this.getRoleName(assignment.assignedRoleId);
      default:
        return 'Unknown';
    }
  }

  getPermissionColor(level: string): string {
    switch (level) {
      case 'ADMIN': return 'warn';
      case 'EDIT': return 'accent';
      case 'VIEW': return 'primary';
      default: return 'basic';
    }
  }

  removeAssignment(assignment: any) {
    if (confirm('Are you sure you want to remove this assignment?')) {
      // Mock removal - replace with actual service call
      console.log('Removing assignment:', assignment);
      this.loadCurrentAssignments();
    }
  }

  onShare() {
    const result: DiagramSharingResult = {
      assignments: {
        users: this.usersControl.value || [],
        groups: this.groupsControl.value || [],
        roles: this.rolesControl.value || []
      },
      permissionLevel: this.permissionControl.value || 'VIEW'
    };

    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close();
  }
}