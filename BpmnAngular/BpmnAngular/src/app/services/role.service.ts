
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

export interface RoleHierarchy {
  id: number;
  parentRoleId: number;
  childRoleId: number;
  hierarchyLevel: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  parentRole: Role;
  childRole: Role;
}

export interface RoleTreeNode {
  role: Role;
  children: RoleTreeNode[];
  hasChildren: boolean;
  childCount: number;
}

export interface CreateHierarchyRequest {
  parentRoleId: number;
  childRoleId: number;
  hierarchyLevel: number;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = 'http://localhost:8080/api/v1/file';

  constructor(private http: HttpClient) {}

  // Role CRUD operations
  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/users/roles`);
  }

  createRole(role: Partial<Role>): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/admin/roles`, role);
  }

  updateRole(id: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/admin/roles/${id}`, role);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/roles/${id}`);
  }

  // Role Hierarchy operations
  getRoleHierarchyTree(): Observable<RoleTreeNode[]> {
    return this.http.get<RoleTreeNode[]>(`${this.apiUrl}/admin/role-hierarchy/tree`);
  }

  getAllHierarchies(): Observable<RoleHierarchy[]> {
    return this.http.get<RoleHierarchy[]>(`${this.apiUrl}/admin/role-hierarchy`);
  }

  createHierarchy(request: CreateHierarchyRequest): Observable<RoleHierarchy> {
    return this.http.post<RoleHierarchy>(`${this.apiUrl}/admin/role-hierarchy`, request);
  }

  deleteHierarchy(hierarchyId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/admin/role-hierarchy/${hierarchyId}`);
  }

  getChildRoles(parentRoleId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/admin/role-hierarchy/parent/${parentRoleId}/children`);
  }

  updateHierarchyLevel(hierarchyId: number, level: number): Observable<RoleHierarchy> {
    return this.http.put<RoleHierarchy>(`${this.apiUrl}/admin/role-hierarchy/${hierarchyId}/level`, { level });
  }
}