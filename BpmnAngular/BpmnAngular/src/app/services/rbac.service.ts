
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

export interface RoleHierarchy {
  id: number;
  parentRole: Role;
  childRole: Role;
  hierarchyLevel: number;
  isActive: boolean;
}

export interface RoleTreeNode {
  role: Role;
  children: RoleTreeNode[];
  hasChildren: boolean;
  childCount: number;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  createdBy: string;
  createdTime: string;
  updatedTime: string;
  isActive: boolean;
  users?: User[];
}

export interface GroupInfo {
  group: Group;
  userCount: number;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  roles?: Role[];
}

export interface DiagramAssignment {
  id: number;
  diagram: any; // File interface
  assignedUser?: User;
  assignedGroup?: Group;
  assignedRole?: Role;
  assignmentType: 'USER' | 'GROUP' | 'ROLE';
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  assignedBy: string;
  assignedTime: string;
  notes?: string;
  isActive: boolean;
}

export interface DiagramAccessInfo {
  canView: boolean;
  canEdit: boolean;
  canAssign: boolean;
  permissionLevel: string;
}

@Injectable({
  providedIn: 'root'
})
export class RbacService {
  private apiUrl = "http://localhost:8080/api/v1/file";

  private currentUserPermissions = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {}

  // =================== ROLE HIERARCHY METHODS ===================

  getRoleHierarchyTree(): Observable<RoleTreeNode[]> {
    return this.http.get<RoleTreeNode[]>(`${this.apiUrl}/admin/role-hierarchy/tree`);
  }

  createRoleHierarchy(parentRoleId: number, childRoleId: number, hierarchyLevel?: number): Observable<RoleHierarchy> {
    return this.http.post<RoleHierarchy>(`${this.apiUrl}/admin/role-hierarchy`, {
      parentRoleId,
      childRoleId,
      hierarchyLevel
    });
  }

  deleteRoleHierarchy(hierarchyId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/role-hierarchy/${hierarchyId}`);
  }

  getAllRoleHierarchies(): Observable<RoleHierarchy[]> {
    return this.http.get<RoleHierarchy[]>(`${this.apiUrl}/admin/role-hierarchy`);
  }

  getChildRoles(parentRoleId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/admin/role-hierarchy/parent/${parentRoleId}/children`);
  }

  updateHierarchyLevel(hierarchyId: number, level: number): Observable<RoleHierarchy> {
    return this.http.put<RoleHierarchy>(`${this.apiUrl}/admin/role-hierarchy/${hierarchyId}/level`, { level });
  }

  // =================== GROUP METHODS ===================

  createGroup(name: string, description: string): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/groups`, { name, description });
  }

  updateGroup(groupId: number, name: string, description: string): Observable<Group> {
    return this.http.put<Group>(`${this.apiUrl}/groups/${groupId}`, { name, description });
  }

  deleteGroup(groupId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${groupId}`);
  }

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/groups`);
  }

  getGroupsWithUserCount(): Observable<GroupInfo[]> {
    return this.http.get<GroupInfo[]>(`${this.apiUrl}/groups/with-user-count`);
  }

  addUserToGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/groups/${groupId}/users/${userId}`, {});
  }

  removeUserFromGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.delete<Group>(`${this.apiUrl}/groups/${groupId}/users/${userId}`);
  }

  addUsersToGroup(groupId: number, userIds: number[]): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/groups/${groupId}/users`, userIds);
  }

  searchGroups(query: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/groups/search?q=${encodeURIComponent(query)}`);
  }

  getMyGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/groups/my-groups`);
  }

  // =================== DIAGRAM ASSIGNMENT METHODS ===================

  getAvailableDiagrams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/diagrams/available-to-user`);
  }

  assignDiagramToUser(diagramId: number, userId: number, permissionLevel: string, notes?: string): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.apiUrl}/diagrams/${diagramId}/assign/user`, {
      userId,
      permissionLevel,
      notes
    });
  }

  assignDiagramToGroup(diagramId: number, groupId: number, permissionLevel: string, notes?: string): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.apiUrl}/diagrams/${diagramId}/assign/group`, {
      groupId,
      permissionLevel,
      notes
    });
  }

  assignDiagramToRole(diagramId: number, roleId: number, permissionLevel: string, notes?: string): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.apiUrl}/diagrams/${diagramId}/assign/role`, {
      roleId,
      permissionLevel,
      notes
    });
  }

  getDiagramAssignments(diagramId: number): Observable<DiagramAssignment[]> {
    return this.http.get<DiagramAssignment[]>(`${this.apiUrl}/diagrams/${diagramId}/assignments`);
  }

  removeAssignment(assignmentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/diagrams/assignments/${assignmentId}`);
  }

  updateAssignmentPermission(assignmentId: number, permissionLevel: string): Observable<DiagramAssignment> {
    return this.http.put<DiagramAssignment>(`${this.apiUrl}/diagrams/assignments/${assignmentId}/permission`, {
      permissionLevel
    });
  }

  checkDiagramAccess(diagramId: number): Observable<{ hasAccess: boolean; permissionLevel: string }> {
    return this.http.get<{ hasAccess: boolean; permissionLevel: string }>(`${this.apiUrl}/diagrams/${diagramId}/access`);
  }

  // =================== FILE ACCESS METHODS ===================

  getFileAccessInfo(fileId: number): Observable<DiagramAccessInfo> {
    return this.http.get<DiagramAccessInfo>(`${this.apiUrl}/file/${fileId}/access-info`);
  }

  getFileSharingInfo(fileId: number): Observable<{ assignments: DiagramAssignment[]; canAssign: boolean }> {
    return this.http.get<{ assignments: DiagramAssignment[]; canAssign: boolean }>(`${this.apiUrl}/file/${fileId}/sharing`);
  }

  // =================== PERMISSION HELPERS ===================

  hasRole(roleName: string): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.roles?.some((role: Role) => role.name === roleName) || false;
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  isModeler(): boolean {
    return this.hasRole('ROLE_MODELER') || this.isAdmin();
  }

  isViewer(): boolean {
    return this.hasRole('ROLE_VIEWER') || this.isModeler();
  }

  canManageRoles(): boolean {
    return this.isAdmin();
  }

  canManageGroups(): boolean {
    return this.isAdmin();
  }

  canCreateDiagrams(): boolean {
    return this.isModeler();
  }

  // =================== USER CONTEXT ===================

  private getCurrentUser(): any {
    // This should get the current user from your auth service
    // For now, returning null - you'll need to integrate with your existing auth
    return null;
  }

  setCurrentUserPermissions(permissions: any): void {
    this.currentUserPermissions.next(permissions);
  }

  getCurrentUserPermissions(): Observable<any> {
    return this.currentUserPermissions.asObservable();
  }
}

