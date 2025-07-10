// src/app/services/diagram-assignment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface DiagramAssignment {
  id: number;
  diagram: any; // File interface
  assignedUser?: any;
  assignedGroup?: any;
  assignedRole?: any;
  assignmentType: 'USER' | 'GROUP' | 'ROLE';
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  assignedBy: string;
  assignedTime: string;
  notes?: string;
  isActive: boolean;
  assignedToName: string;
}

export interface AssignToUserRequest {
  userId: number;
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  notes?: string;
}

export interface AssignToGroupRequest {
  groupId: number;
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  notes?: string;
}

export interface AssignToRoleRequest {
  roleId: number;
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  notes?: string;
}

export interface AccessInfo {
  canView: boolean;
  canEdit: boolean;
  canAssign: boolean;
  permissionLevel: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiagramAssignmentService {
  private apiUrl = 'http://localhost:8080/api/v1/file';

  constructor(private http: HttpClient) {}

  // Get diagrams available to current user
  getAvailableDiagrams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available-to-user`);
  }

  // Assignment operations
  assignToUser(diagramId: number, request: AssignToUserRequest): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.apiUrl}/${diagramId}/assign/user`, request);
  }

  assignToGroup(diagramId: number, request: AssignToGroupRequest): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.apiUrl}/${diagramId}/assign/group`, request);
  }

  assignToRole(diagramId: number, request: AssignToRoleRequest): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.apiUrl}/${diagramId}/assign/role`, request);
  }

  // Get assignments for diagram
  getDiagramAssignments(diagramId: number): Observable<DiagramAssignment[]> {
    return this.http.get<DiagramAssignment[]>(`${this.apiUrl}/${diagramId}/assignments`);
  }

  // Remove assignment
  removeAssignment(assignmentId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/assignments/${assignmentId}`);
  }

  // Update assignment permission
  updateAssignmentPermission(assignmentId: number, permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN'): Observable<DiagramAssignment> {
    return this.http.put<DiagramAssignment>(`${this.apiUrl}/assignments/${assignmentId}/permission`, { permissionLevel });
  }

  // Check user access to diagram
  checkDiagramAccess(diagramId: number): Observable<AccessInfo> {
    return this.http.get<AccessInfo>(`${this.apiUrl}/${diagramId}/access`);
  }

  // Get sharing info for diagram
  getDiagramSharingInfo(diagramId: number): Observable<{assignments: DiagramAssignment[], canAssign: boolean}> {
    return this.http.get<{assignments: DiagramAssignment[], canAssign: boolean}>(`${this.apiUrl}/${diagramId}/sharing`);
  }
}