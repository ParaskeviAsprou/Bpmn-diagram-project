
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  roles: Role[];
  enabled?: boolean;
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
}

export interface Role {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  password: string;
  roleNames: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmationPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
   private apiUrl = "http://localhost:8080/api/v1/file";

  constructor(private http: HttpClient) {}

  // User CRUD operations
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`);
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}`, request);
  }

  updateUser(userId: number, request: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, request);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  // Role management
  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  updateUserRoles(userId: number, roleNames: Set<string>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}/roles`, Array.from(roleNames));
  }

  assignRoleToUser(userId: number, roleName: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/assign-role`, null, {
      params: { userId: userId.toString(), roleName }
    });
  }

  removeRoleFromUser(userId: number, roleName: string): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/${userId}/roles/${roleName}`);
  }

  // Password management
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/change-password`, request);
  }

  // User filtering and search
  getUsersByRole(roleName: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`, {
      params: { role: roleName }
    });
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`, {
      params: { search: query }
    });
  }

  // User status management
  enableUser(userId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/enable`, {});
  }

  disableUser(userId: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/disable`, {});
  }

  // Utility methods
  getUserDisplayName(user: User): string {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    return fullName || user.email;
  }

  hasRole(user: User, roleName: string): boolean {
    return user.roles.some(role => role.name === roleName);
  }

  hasAnyRole(user: User, roleNames: string[]): boolean {
    return roleNames.some(roleName => this.hasRole(user, roleName));
  }

  hasAllRoles(user: User, roleNames: string[]): boolean {
    return roleNames.every(roleName => this.hasRole(user, roleName));
  }

  isAdmin(user: User): boolean {
    return this.hasRole(user, 'ROLE_ADMIN');
  }

  isModeler(user: User): boolean {
    return this.hasAnyRole(user, ['ROLE_MODELER', 'ROLE_ADMIN']);
  }

  isViewer(user: User): boolean {
    return this.hasAnyRole(user, ['ROLE_VIEWER', 'ROLE_MODELER', 'ROLE_ADMIN']);
  }

  getRoleDisplayNames(user: User): string[] {
    return user.roles.map(role => role.displayName || role.name);
  }

  getHighestRole(user: User): Role | null {
    const roleHierarchy = ['ROLE_ADMIN', 'ROLE_MODELER', 'ROLE_VIEWER'];
    
    for (const roleName of roleHierarchy) {
      const role = user.roles.find(r => r.name === roleName);
      if (role) return role;
    }
    
    return user.roles[0] || null;
  }
}