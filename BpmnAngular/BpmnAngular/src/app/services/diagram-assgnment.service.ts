
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DiagramFile {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadTime: string;
  updatedTime: string;
  createdBy: string;
  updatedBy: string;
  description?: string;
  xml?: string;
  folderId?: number;
  base64Data?: string;
}

export interface DiagramAssignment {
  id: number;
  assignmentType: 'USER' | 'GROUP' | 'ROLE';
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  assignedBy: string;
  assignedTime: string;
  notes?: string;
  assignedToName: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiagramService {
  private readonly API_URL = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  // Diagram File Management
  getAllFiles(): Observable<DiagramFile[]> {
    return this.http.get<DiagramFile[]>(`${this.API_URL}/file/all`);
  }

  getAvailableDiagrams(): Observable<DiagramFile[]> {
    return this.http.get<DiagramFile[]>(`${this.API_URL}/diagrams/available-to-user`);
  }

  getFileById(id: number): Observable<DiagramFile> {
    return this.http.get<DiagramFile>(`${this.API_URL}/file/${id}`);
  }

  getDiagram(id: string): Observable<DiagramFile> {
    return this.http.get<DiagramFile>(`${this.API_URL}/file/${id}`);
  }

  saveDiagram(diagramData: any): Observable<DiagramFile> {
    return this.http.post<DiagramFile>(`${this.API_URL}/file/save`, diagramData);
  }

  updateDiagramContent(id: number, content: any): Observable<DiagramFile> {
    return this.http.put<DiagramFile>(`${this.API_URL}/file/${id}/content`, content);
  }

  deleteDiagram(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/file/delete/${id}`);
  }

  // Diagram Access Management
  checkDiagramAccess(diagramId: number): Observable<{hasAccess: boolean, permissionLevel: string, canView: boolean, canEdit: boolean, canAssign: boolean}> {
    return this.http.get<any>(`${this.API_URL}/diagrams/${diagramId}/access`);
  }

  getDiagramAssignments(diagramId: number): Observable<DiagramAssignment[]> {
    return this.http.get<DiagramAssignment[]>(`${this.API_URL}/diagrams/${diagramId}/assignments`);
  }

  assignDiagramToUser(diagramId: number, userId: number, permissionLevel: string, notes?: string): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.API_URL}/diagrams/${diagramId}/assign/user`, {
      userId,
      permissionLevel,
      notes
    });
  }

  assignDiagramToRole(diagramId: number, roleId: number, permissionLevel: string, notes?: string): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.API_URL}/diagrams/${diagramId}/assign/role`, {
      roleId,
      permissionLevel,
      notes
    });
  }

  assignDiagramToGroup(diagramId: number, groupId: number, permissionLevel: string, notes?: string): Observable<DiagramAssignment> {
    return this.http.post<DiagramAssignment>(`${this.API_URL}/diagrams/${diagramId}/assign/group`, {
      groupId,
      permissionLevel,
      notes
    });
  }

  removeAssignment(assignmentId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/diagrams/assignments/${assignmentId}`);
  }

  updateAssignmentPermission(assignmentId: number, permissionLevel: string): Observable<DiagramAssignment> {
    return this.http.put<DiagramAssignment>(`${this.API_URL}/diagrams/assignments/${assignmentId}/permission`, {
      permissionLevel
    });
  }

  // Folder Management
  getAllFolders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/folders/all`);
  }

  createFolder(name: string, description?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/folders/create`, {
      folderName: name,
      description
    });
  }

  deleteFolder(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/folders/delete/${id}`);
  }
}