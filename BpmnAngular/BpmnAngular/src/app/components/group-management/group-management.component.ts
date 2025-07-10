import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import {
  GroupService,
  Group,
  GroupInfo,
  CreateGroupRequest,
  UpdateGroupRequest
} from '../../services/group.service';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { User, UserService } from '../../services/user.service';
import { materialize } from 'rxjs';
import { MatSpinner } from '@angular/material/progress-spinner';
;


interface UserOption {
  id: number;
  name: string;
  email: string;
  selected?: boolean;
}

@Component({
  selector: 'app-group-management',
  standalone: true,
  imports: [CommonModule,
    MatCard, MatError, ReactiveFormsModule, MatSpinner, MatPaginator,
    MatCardTitle,
    MatCardHeader,
    MatCardSubtitle,
    MatCardContent,
    MatChipsModule,
    MatIcon,MatTable,
    MatFormField,
    MatLabel,
    FormsModule],
  templateUrl: './group-management.component.html',
  styleUrl: './group-management.component.css'
})
export class GroupManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<GroupInfo>();
  loading = false;

  // Forms
  groupForm: FormGroup;
  editingGroup: Group | null = null;

  // User management
  availableUsers: UserOption[] = [];
  selectedUsers: Set<number> = new Set();
  userSearchText = '';

  // Table columns
  displayedColumns = ['name', 'description', 'userCount', 'createdBy', 'createdTime', 'actions'];

  // Dialogs and selections
  selectedGroupForUsers: Group | null = null;
  showUserManagement = false;

  constructor(
    private groupService: GroupService,
    private userService: UserService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.loadGroups();
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadGroups(): void {
    this.loading = true;
    this.groupService.getGroupsWithUserCount().subscribe({
      next: (groups) => {
        this.dataSource.data = groups;
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to load groups');
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.availableUsers = users.map(user => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim() || user.email,
          email: user.email,
          selected: false
        }));
      },
      error: (error: any) => {
        this.showError('Failed to load users');
      }
    });
  }

  saveGroup(): void {
    if (!this.groupForm.valid) return;

    const formValue = this.groupForm.value;

    if (this.editingGroup) {

      const updateRequest: UpdateGroupRequest = {
        name: formValue.name,
        description: formValue.description
      };

      this.groupService.updateGroup(this.editingGroup.id, updateRequest).subscribe({
        next: () => {
          this.showSuccess('Group updated successfully');
          this.resetGroupForm();
          this.loadGroups();
        },
        error: (error) => {
          this.showError(error.error?.message || 'Failed to update group');
        }
      });
    } else {
      // Create new group
      const createRequest: CreateGroupRequest = {
        name: formValue.name,
        description: formValue.description
      };

      this.groupService.createGroup(createRequest).subscribe({
        next: () => {
          this.showSuccess('Group created successfully');
          this.resetGroupForm();
          this.loadGroups();
        },
        error: (error) => {
          this.showError(error.error?.message || 'Failed to create group');
        }
      });
    }
  }

  editGroup(group: Group): void {
    this.editingGroup = group;
    this.groupForm.patchValue({
      name: group.name,
      description: group.description
    });

    // Scroll to form
    setTimeout(() => {
      document.querySelector('.group-form-card')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }

  deleteGroup(group: Group): void {
    const confirmMessage = `Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.groupService.deleteGroup(group.id).subscribe({
        next: () => {
          this.showSuccess('Group deleted successfully');
          this.loadGroups();
        },
        error: (error) => {
          this.showError(error.error?.message || 'Failed to delete group');
        }
      });
    }
  }

  resetGroupForm(): void {
    this.groupForm.reset();
    this.editingGroup = null;
  }

  // User management for groups
  openUserManagement(group: Group): void {
    this.selectedGroupForUsers = group;
    this.showUserManagement = true;
    this.loadGroupUsers(group);
  }

  closeUserManagement(): void {
    this.showUserManagement = false;
    this.selectedGroupForUsers = null;
    this.selectedUsers.clear();
    this.resetUserSelections();
  }

  loadGroupUsers(group: Group): void {
    // Reset selections
    this.resetUserSelections();

    // Mark current group members as selected
    if (group.users) {
      group.users.forEach(user => {
        this.selectedUsers.add(user.id);
        const userOption = this.availableUsers.find(u => u.id === user.id);
        if (userOption) {
          userOption.selected = true;
        }
      });
    }
  }

  resetUserSelections(): void {
    this.availableUsers.forEach(user => user.selected = false);
  }

  toggleUserSelection(user: UserOption): void {
    user.selected = !user.selected;

    if (user.selected) {
      this.selectedUsers.add(user.id);
    } else {
      this.selectedUsers.delete(user.id);
    }
  }

  saveGroupUsers(): void {
    if (!this.selectedGroupForUsers) return;

    // Get current group members
    const currentUserIds = new Set(this.selectedGroupForUsers.users?.map(u => u.id) || []);
    const newUserIds = this.selectedUsers;

    // Find users to add and remove
    const usersToAdd = Array.from(newUserIds).filter(id => !currentUserIds.has(id));
    const usersToRemove = Array.from(currentUserIds).filter(id => !newUserIds.has(id));

    const operations: any[] = [];

    // Add users
    if (usersToAdd.length > 0) {
      operations.push(
        this.groupService.addUsersToGroup(this.selectedGroupForUsers.id, usersToAdd)
      );
    }

    // Remove users
    usersToRemove.forEach(userId => {
      operations.push(
        this.groupService.removeUserFromGroup(this.selectedGroupForUsers!.id, userId)
      );
    });

    if (operations.length === 0) {
      this.showSuccess('No changes to save');
      return;
    }

    // Execute all operations
    Promise.all(operations).then(() => {
      this.showSuccess('Group membership updated successfully');
      this.loadGroups();
      this.closeUserManagement();
    }).catch(error => {
      this.showError('Failed to update group membership');
    });
  }

  // Filtering and search
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  get filteredUsers(): UserOption[] {
    if (!this.userSearchText) {
      return this.availableUsers;
    }

    const searchTerm = this.userSearchText.toLowerCase();
    return this.availableUsers.filter(user =>
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  }

  get selectedUserCount(): number {
    return this.selectedUsers.size;
  }

  // Utility methods
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  trackByUserId(index: number, user: any): string {
    return user.id;
  }
  trackByGroupId(index: number, item: any): string {
    return item.group.id;
  }

}