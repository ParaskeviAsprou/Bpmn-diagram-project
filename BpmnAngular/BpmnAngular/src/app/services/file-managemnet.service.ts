// file-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FileModel {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadTime: string;
  updatedTime: string;
  createdBy: string;
  updatedBy?: string;
  currentVersion: number;
  description?: string;
  tags?: string;
  isPublic: boolean;
  isTemplate: boolean;
  base64Data?: string;
  content?: string;
  folderPath?: string;
  attachmentCount?: number;
  versionCount?: number;
  folder?: FolderModel;
}

export interface FolderModel {
  id: number;
  folderName: string;
  description?: string;
  createdTime: string;
  updatedTime?: string;
  createdBy: string;
  folderPath: string;
  isRoot: boolean;
  fileCount?: number;
  subFolderCount?: number;
  totalSize?: number;
  children?: FolderModel[];
}

export interface FileVersion {
  id: number;
  versionNumber: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdTime: string;
  createdBy: string;
  versionNotes?: string;
  base64Data?: string;
  content?: string;
  isCurrect: boolean;
}

export interface ElementAttachment {
  id: number;
  elementId: string;
  elementType?: string;
  attachmentName: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  description?: string;
  createdTime: string;
  createdBy: string;
  updatedTime?: string;
  updatedBy?: string;
  category: AttachmentCategory;
  isPublic: boolean;
  isDownloadable: boolean;
  base64Data?: string;
}

export enum AttachmentCategory {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  SPECIFICATION = 'SPECIFICATION',
  REFERENCE = 'REFERENCE',
  TEMPLATE = 'TEMPLATE',
  OTHER = 'OTHER'
}

export interface SaveOptionsResult {
  saveType: 'overwrite' | 'new-version' | 'new-file';
  fileName?: string;
  versionNotes?: string;
}

export interface SearchResults {
  files: FileModel[];
  folders: FolderModel[];
  attachments: ElementAttachment[];
  totalResults: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileManagementService {
  private baseUrl = 'http://localhost:8080/api/v1/file';
  private currentFolderSubject = new BehaviorSubject<FolderModel | null>(null);
  public currentFolder$ = this.currentFolderSubject.asObservable();

  constructor(private http: HttpClient) {}

  // =================== FILE OPERATIONS ===================

  uploadFile(file: File, folderId?: number, description?: string, tags?: string): Observable<FileModel> {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId.toString());
    if (description) formData.append('description', description);
    if (tags) formData.append('tags', tags);

    return this.http.post<FileModel>(`${this.baseUrl}/upload`, formData);
  }

  getAllFiles(): Observable<FileModel[]> {
    return this.http.get<FileModel[]>(`${this.baseUrl}/all`);
  }

  getFileById(id: number): Observable<FileModel> {
    return this.http.get<FileModel>(`${this.baseUrl}/${id}`);
  }

  getFileContent(id: number): Observable<string> {
    return this.http.get(`${this.baseUrl}/${id}/content`, { responseType: 'text' });
  }

  updateFile(id: number, file: File): Observable<FileModel> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.put<FileModel>(`${this.baseUrl}/${id}`, formData);
  }

  deleteFile(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${id}`);
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/download`, { responseType: 'blob' });
  }

  // =================== VERSION OPERATIONS ===================

  saveNewVersion(id: number, content: string | Blob, versionNotes?: string): Observable<FileVersion> {
    const formData = new FormData();
    if (typeof content === 'string') {
      const blob = new Blob([content], { type: 'application/xml' });
      formData.append('file', blob);
    } else {
      formData.append('file', content);
    }
    if (versionNotes) formData.append('versionNotes', versionNotes);

    return this.http.post<FileVersion>(`${this.baseUrl}/${id}/save-version`, formData);
  }

  saveAsNewFile(id: number, content: string | Blob, newFileName: string, versionNotes?: string): Observable<FileModel> {
    const formData = new FormData();
    if (typeof content === 'string') {
      const blob = new Blob([content], { type: 'application/xml' });
      formData.append('file', blob);
    } else {
      formData.append('file', content);
    }
    formData.append('newFileName', newFileName);
    if (versionNotes) formData.append('versionNotes', versionNotes);

    return this.http.post<FileModel>(`${this.baseUrl}/${id}/save-as-new`, formData);
  }

  getFileVersions(id: number): Observable<FileVersion[]> {
    return this.http.get<FileVersion[]>(`${this.baseUrl}/${id}/versions`);
  }

  getFileVersion(id: number, versionNumber: number): Observable<FileVersion> {
    return this.http.get<FileVersion>(`${this.baseUrl}/${id}/versions/${versionNumber}`);
  }

  restoreVersion(id: number, versionNumber: number): Observable<FileModel> {
    return this.http.post<FileModel>(`${this.baseUrl}/${id}/restore-version/${versionNumber}`, {});
  }

  // =================== FOLDER OPERATIONS ===================

  createFolder(folderName: string, parentFolderId?: number, description?: string): Observable<FolderModel> {
    const formData = new FormData();
    formData.append('folderName', folderName);
    if (parentFolderId) formData.append('parentFolderId', parentFolderId.toString());
    if (description) formData.append('description', description);

    return this.http.post<FolderModel>(`${this.baseUrl}/folders`, formData);
  }

  getRootFolders(): Observable<FolderModel[]> {
    return this.http.get<FolderModel[]>(`${this.baseUrl}/folders`);
  }

  getFolder(folderId: number): Observable<FolderModel> {
    return this.http.get<FolderModel>(`${this.baseUrl}/folders/${folderId}`);
  }

  getSubFolders(folderId: number): Observable<FolderModel[]> {
    return this.http.get<FolderModel[]>(`${this.baseUrl}/folders/${folderId}/subfolders`);
  }

  getFolderFiles(folderId: number): Observable<FileModel[]> {
    return this.http.get<FileModel[]>(`${this.baseUrl}/folders/${folderId}/files`);
  }

  getFolderTree(): Observable<FolderModel[]> {
    return this.http.get<FolderModel[]>(`${this.baseUrl}/folders/tree`);
  }

  moveFolder(folderId: number, newParentFolderId?: number): Observable<FolderModel> {
    const params = new HttpParams()
      .set('newParentFolderId', newParentFolderId?.toString() || '');
    return this.http.post<FolderModel>(`${this.baseUrl}/folders/${folderId}/move`, {}, { params });
  }

  renameFolder(folderId: number, newName: string): Observable<FolderModel> {
    const params = new HttpParams().set('newName', newName);
    return this.http.put<FolderModel>(`${this.baseUrl}/folders/${folderId}`, {}, { params });
  }

  deleteFolder(folderId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/folders/${folderId}`);
  }

  moveFileToFolder(fileId: number, folderId?: number): Observable<FileModel> {
    const params = new HttpParams().set('folderId', folderId?.toString() || '');
    return this.http.post<FileModel>(`${this.baseUrl}/${fileId}/move-to-folder`, {}, { params });
  }

  // =================== ELEMENT ATTACHMENTS ===================

  addElementAttachment(fileId: number, elementId: string, attachment: File, 
                      elementType?: string, description?: string): Observable<ElementAttachment> {
    const formData = new FormData();
    formData.append('attachment', attachment);
    if (elementType) formData.append('elementType', elementType);
    if (description) formData.append('description', description);

    return this.http.post<ElementAttachment>(
      `${this.baseUrl}/${fileId}/elements/${elementId}/attachments`, 
      formData
    );
  }

  getElementAttachments(fileId: number, elementId: string): Observable<ElementAttachment[]> {
    return this.http.get<ElementAttachment[]>(
      `${this.baseUrl}/${fileId}/elements/${elementId}/attachments`
    );
  }

  getAttachment(attachmentId: number): Observable<ElementAttachment> {
    return this.http.get<ElementAttachment>(`${this.baseUrl}/attachments/${attachmentId}`);
  }

  downloadAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/attachments/${attachmentId}/download`, { responseType: 'blob' });
  }

  deleteAttachment(attachmentId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/attachments/${attachmentId}`);
  }

  // =================== SEARCH ===================

  searchFiles(query: string, folderId?: number): Observable<SearchResults> {
    let params = new HttpParams().set('query', query);
    if (folderId) params = params.set('folderId', folderId.toString());

    return this.http.get<SearchResults>(`${this.baseUrl}/search`, { params });
  }

  // =================== EXPORT ===================

  exportToPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export/pdf`, { responseType: 'blob' });
  }

  exportToFormat(id: number, format: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export/${format}`, { responseType: 'blob' });
  }

  validateBpmnFile(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/validate`, {});
  }

  // =================== UTILITY METHODS ===================

  setCurrentFolder(folder: FolderModel | null): void {
    this.currentFolderSubject.next(folder);
  }

  getCurrentFolder(): FolderModel | null {
    return this.currentFolderSubject.value;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  isImageFile(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    return imageExtensions.includes(this.getFileExtension(filename));
  }

  isBpmnFile(filename: string): boolean {
    const extension = this.getFileExtension(filename);
    return extension === 'bpmn' || extension === 'xml';
  }
}