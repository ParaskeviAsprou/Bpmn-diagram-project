import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { RoleService, Role } from '../../services/role.service';
import { GroupService, Group } from '../../services/group.service';
import { User } from '../../services/authentication.service';
import { UserService } from '../../services/user.service';
// Make sure User is only imported from authentication.service and not redefined elsewhere
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardModule, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { MatOption, MatSelect, MatSelectModule } from '@angular/material/select';
import { MatChip, MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatSpinner } from '@angular/material/progress-spinner';


interface UserWithRoles {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  roles: Role[];
  groups?: Group[];
  enabled?: boolean;
  lastLogin?: string;
}

interface RoleAssignmentData {
  userId: number;
  userName: string;
  currentRoles: Role[];
  availableRoles: Role[];
}
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatMenuModule,MatSpinner
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<UserWithRoles>();
  loading = false;
  
  // Available data
  allRoles: Role[] = [];
  allGroups: Group[] = [];
  
  // Filters
  filterText = '';
  selectedRoleFilter = 'all';
  roleFilters: any[] = [
    { value: 'all', label: 'All Users', count: 0 }
  ];
  
  // Table configuration
  displayedColumns = [
    'name', 
    'email', 
    'roles', 
    'status', 
    'actions'
  ];

  // Role assignment dialog
  showRoleAssignment = false;
  roleAssignmentData: RoleAssignmentData | null = null;
  selectedRoles: Set<number> = new Set();

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private groupService: GroupService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadData(): void {
    this.loading = true;
    
    Promise.all([
      this.userService.getAllUsers().toPromise(),
      this.roleService.getAllRoles().toPromise(),
      this.groupService.getAllGroups().toPromise()
    ]).then(([users, roles, groups]) => {
      this.allRoles = roles || [];
      this.allGroups = groups || [];
      
      // Transform users data
      const usersWithRoles: UserWithRoles[] = (users || []).map(user => ({
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        username: user.username,
        roles: (user.roles || []).map((role: any) => {
          // Find the matching role from allRoles to ensure correct type and displayName
          const matchedRole = this.allRoles.find(r => r.name === role.name);
          return {
            ...role,
            displayName: matchedRole ? matchedRole.displayName : (role.displayName ?? role.name)
          };
        }),
        enabled: true // You might want to get this from the user object
      }));
      
      this.dataSource.data = usersWithRoles;
      this.updateRoleFilters();
      this.loading = false;
    }).catch(error => {
      this.showError('Failed to load user data');
      this.loading = false;
    });
  }

  setupFilters(): void {
    this.dataSource.filterPredicate = (data: UserWithRoles, filter: string) => {
      const filterObj = JSON.parse(filter);
      
      // Text filter
      const fullName = `${data.firstName} ${data.lastName}`.trim().toLowerCase();
      const textMatch = !filterObj.text || 
        fullName.includes(filterObj.text.toLowerCase()) ||
        data.email.toLowerCase().includes(filterObj.text.toLowerCase());
      
      // Role filter
      const roleMatch = filterObj.role === 'all' || 
        data.roles.some(role => role.name === filterObj.role);
      
      return textMatch && roleMatch;
    };
  }

  updateRoleFilters(): void {
    const roleCounts = new Map<string, number>();
    
    // Count users by role
    this.dataSource.data.forEach(user => {
      user.roles.forEach(role => {
        roleCounts.set(role.name, (roleCounts.get(role.name) || 0) + 1);
      });
    });
    
    // Build filter options
    this.roleFilters = [
      { value: 'all', label: 'All Users', count: this.dataSource.data.length }
    ];
    
    this.allRoles.forEach(role => {
      this.roleFilters.push({
        value: role.name,
        label: role.displayName || role.name,
        count: roleCounts.get(role.name) || 0
      });
    });
  }

  applyFilters(): void {
    const filterValue = JSON.stringify({
      text: this.filterText,
      role: this.selectedRoleFilter
    });
    
    this.dataSource.filter = filterValue;
  }

  // Role management
  openRoleAssignment(user: UserWithRoles): void {
    this.roleAssignmentData = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      currentRoles: [...user.roles],
      availableRoles: [...this.allRoles]
    };
    
    // Set currently selected roles
    this.selectedRoles.clear();
    user.roles.forEach(role => {
      this.selectedRoles.add(role.id);
    });
    
    this.showRoleAssignment = true;
  }

  closeRoleAssignment(): void {
    this.showRoleAssignment = false;
    this.roleAssignmentData = null;
    this.selectedRoles.clear();
  }

  toggleRoleSelection(role: Role): void {
    if (this.selectedRoles.has(role.id)) {
      this.selectedRoles.delete(role.id);
    } else {
      this.selectedRoles.add(role.id);
    }
  }

  isRoleSelected(role: Role): boolean {
    return this.selectedRoles.has(role.id);
  }

  saveRoleAssignment(): void {
    if (!this.roleAssignmentData) return;
    
    const userId = this.roleAssignmentData.userId;
    const selectedRoleNames = Array.from(this.selectedRoles)
      .map(roleId => this.allRoles.find(r => r.id === roleId)?.name)
      .filter(name => name) as string[];
    
    this.userService.updateUserRoles(userId, new Set(selectedRoleNames)).subscribe({
      next: (updatedUser) => {
        this.showSuccess('User roles updated successfully');
        this.loadData(); // Reload to get fresh data
        this.closeRoleAssignment();
      },
      error: (error:any) => {
        this.showError(error.error?.message || 'Failed to update user roles');
      }
    });
  }

  // Quick role assignment methods
  assignRole(user: UserWithRoles, role: Role): void {
    this.userService.assignRoleToUser(user.id, role.name).subscribe({
      next: () => {
        this.showSuccess(`Role ${role.displayName} assigned to ${user.firstName} ${user.lastName}`);
        this.loadData();
      },
      error: (error:any) => {
        this.showError(error.error?.message || 'Failed to assign role');
      }
    });
  }

  removeRole(user: UserWithRoles, role: Role): void {
    if (confirm(`Remove role "${role.displayName}" from ${user.firstName} ${user.lastName}?`)) {
      this.userService.removeRoleFromUser(user.id, role.name).subscribe({
        next: () => {
          this.showSuccess(`Role ${role.displayName} removed from ${user.firstName} ${user.lastName}`);
          this.loadData();
        },
        error: (error:any) => {
          this.showError(error.error?.message || 'Failed to remove role');
        }
      });
    }
  }

  // User management
  deleteUser(user: UserWithRoles): void {
    const confirmMessage = `Are you sure you want to delete user "${user.firstName} ${user.lastName}"? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showSuccess('User deleted successfully');
          this.loadData();
        },
        error: (error:any) => {
          this.showError(error.error?.message || 'Failed to delete user');
        }
      });
    }
  }

  // Utility methods
  getUserDisplayName(user: UserWithRoles): string {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.email;
  }

  getRoleDisplayNames(roles: Role[]): string {
    return roles.map(role => role.displayName || role.name).join(', ');
  }

  getRoleColor(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'warn';
    if (roleName.includes('MODELER')) return 'accent';
    return 'primary';
  }

  hasRole(user: UserWithRoles, roleName: string): boolean {
    return user.roles.some(role => role.name === roleName);
  }

  get selectedRoleCount(): number {
    return this.selectedRoles.size;
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

getRoleIcon(roleName: string): string {
  switch (roleName) {
    case 'ROLE_ADMIN':
      return 'security';
    case 'ROLE_USER':
      return 'person';
    case 'ROLE_MANAGER':
      return 'supervisor_account';
    case 'ROLE_VIEWER':
      return 'visibility';
    default:
      return 'account_circle';
  }
}
}
