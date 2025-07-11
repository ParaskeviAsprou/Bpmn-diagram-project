
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
  private readonly API_URL = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  // Role Management
  getAllRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.API_URL}/users/roles`);
  }

  createRole(role: Partial<Role>): Observable<Role> {
    return this.http.post<Role>(`${this.API_URL}/admin/roles`, role);
  }

  updateRole(id: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.API_URL}/admin/roles/${id}`, role);
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/roles/${id}`);
  }

  // Role Hierarchy Management
  getRoleHierarchyTree(): Observable<RoleTreeNode[]> {
    return this.http.get<RoleTreeNode[]>(`${this.API_URL}/admin/role-hierarchy/tree`);
  }

  createHierarchy(parentRoleId: number, childRoleId: number, hierarchyLevel: number): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/role-hierarchy`, {
      parentRoleId,
      childRoleId,
      hierarchyLevel
    });
  }

  deleteHierarchy(hierarchyId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/admin/role-hierarchy/${hierarchyId}`);
  }

  getChildRoles(parentRoleId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.API_URL}/admin/role-hierarchy/parent/${parentRoleId}/children`);
  }
}