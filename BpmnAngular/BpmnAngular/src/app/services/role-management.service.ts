import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
}

export interface RoleHierarchy {
  id: number;
  parentRoleId: number;
  childRoleId: number;
  hierarchyLevel: number;
  parentRole?: Role;
  childRole?: Role;
}

export interface RoleTreeNode {
  role: Role;
  children: RoleTreeNode[];
  level: number;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles?: Role[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleManagementService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/admin';

  constructor(private http: HttpClient) {}

  // Role Management Methods
  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.baseUrl}/roles`);
  }

  createRole(role: Partial<Role>): Observable<Role> {
    return this.http.post<Role>(`${this.baseUrl}/roles`, role);
  }

  updateRole(roleId: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.baseUrl}/roles/${roleId}`, role);
  }

  deleteRole(roleId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/roles/${roleId}`);
  }

  getRoleById(roleId: number): Observable<Role> {
    return this.http.get<Role>(`${this.baseUrl}/roles/${roleId}`);
  }

  // Role Hierarchy Methods
  getAllHierarchies(): Observable<RoleHierarchy[]> {
    return this.http.get<RoleHierarchy[]>(`${this.baseUrl}/role-hierarchy`);
  }

  createRoleHierarchy(parentRoleId: number, childRoleId: number, hierarchyLevel: number): Observable<RoleHierarchy> {
    return this.http.post<RoleHierarchy>(`${this.baseUrl}/role-hierarchy`, {
      parentRoleId,
      childRoleId,
      hierarchyLevel
    });
  }

  updateHierarchyLevel(hierarchyId: number, hierarchyLevel: number): Observable<RoleHierarchy> {
    return this.http.put<RoleHierarchy>(`${this.baseUrl}/role-hierarchy/${hierarchyId}`, {
      hierarchyLevel
    });
  }

  deleteRoleHierarchy(hierarchyId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/role-hierarchy/${hierarchyId}`);
  }

  getRoleHierarchyTree(): Observable<RoleTreeNode[]> {
    return this.http.get<RoleTreeNode[]>(`${this.baseUrl}/role-hierarchy/tree`);
  }

  // User Management Methods
  getManageableUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  assignRoleToUser(userId: number, roleName: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/users/${userId}/roles`, { roleName });
  }

  removeRoleFromUser(userId: number, roleName: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${userId}/roles/${roleName}`);
  }
}