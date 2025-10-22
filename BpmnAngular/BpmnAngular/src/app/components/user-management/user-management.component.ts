import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../services/authentication.service';
import { Role, RoleHierarchy, RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  users: User[] = [];
  filteredUsers: User[] = [];
  roles: Role[] = [];
  searchTerm = '';
  selectedRoleFilter = '';
  loading = false;

  showEditRolesModal = false;
  selectedUser: User | null = null;
  selectedUserRoles: Role[] = [];

  constructor(
    private userService: UserService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: User[]) => {
          this.users = users;
          this.filteredUsers = users;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading users:', error);
          this.loading = false;
        }
      });
  }

  loadRoles(): void {
    this.roleService.getAllRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles: Role[]) => {
          this.roles = roles;
        },
        error: (error: any) => {
          console.error('Error loading roles:', error);
        }
      });
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm || 
        user.firstname.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastname.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = !this.selectedRoleFilter ||
        user.roles.some(role => role.name === this.selectedRoleFilter);

      return matchesSearch && matchesRole;
    });
  }

  getUserInitials(user: User): string {
    return (user.firstname?.charAt(0) || '') + (user.lastname?.charAt(0) || '');
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    return 'default';
  }

  editUserRoles(user: User): void {
    this.selectedUser = user;
    this.selectedUserRoles = [...user.roles];
    this.showEditRolesModal = true;
  }

  isRoleSelected(role: Role): boolean {
    return this.selectedUserRoles.some(r => r.id === role.id);
  }

  toggleRole(role: Role, event: any): void {
    if (event.target.checked) {
      if (!this.isRoleSelected(role)) {
        this.selectedUserRoles.push(role);
      }
    } else {
      this.selectedUserRoles = this.selectedUserRoles.filter(r => r.id !== role.id);
    }
  }

  removeRole(role: Role): void {
    this.selectedUserRoles = this.selectedUserRoles.filter(r => r.id !== role.id);
  }

  saveUserRoles(): void {
    if (this.selectedUser) {
      const roleNames = this.selectedUserRoles.map(role => role.name);
      this.loading = true;
      
      this.userService.updateUserRoles(this.selectedUser.id, roleNames)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedUser: User) => {
            // Update the user in the local array
            const index = this.users.findIndex(u => u.id === updatedUser.id);
            if (index > -1) {
              this.users[index] = updatedUser;
            }
            this.filterUsers();
            this.closeModal();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating user roles:', error);
            alert('Error updating user roles: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete user "${user.firstname} ${user.lastname}"?`)) {
      this.loading = true;
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== user.id);
            this.filterUsers();
            this.loading = false;
          },
          error: (error:any) => {
            console.error('Error deleting user:', error);
            alert('Error deleting user: ' + error.message);
            this.loading = false;
          }
        });
    }
  }

  closeModal(): void {
    this.showEditRolesModal = false;
    this.selectedUser = null;
    this.selectedUserRoles = [];
  }
}