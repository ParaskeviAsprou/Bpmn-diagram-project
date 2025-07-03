import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { Folder } from '../models/Folder';
import { FolderTreeNode } from '../models/FolderTreeNode';
import { FolderBreadcrumb } from '../models/FolderBreadcrumb';

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private apiUrl = 'http://localhost:8080/api/v1/file';
  
  // Current folder state
  private currentFolderSubject = new BehaviorSubject<Folder | null>(null);
  public currentFolder$ = this.currentFolderSubject.asObservable();
  
  // Folder tree state
  private folderTreeSubject = new BehaviorSubject<FolderTreeNode[]>([]);
  public folderTree$ = this.folderTreeSubject.asObservable();
  
  // Breadcrumb state
  private breadcrumbSubject = new BehaviorSubject<FolderBreadcrumb[]>([]);
  public breadcrumb$ = this.breadcrumbSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) {
    this.loadFolderTree();
  }

  // =================== FOLDER CREATION ===================

  /**
   * Create root folder
   */
  createRootFolder(folderName: string, description?: string): Observable<Folder> {
    const formData = new FormData();
    formData.append('folderName', folderName);
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<Folder>(`${this.apiUrl}/folders`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      tap(() => this.loadFolderTree()),
      catchError(this.handleError)
    );
  }

  /**
   * Create subfolder
   */
  createSubFolder(parentFolderId: number, folderName: string, description?: string): Observable<Folder> {
    const formData = new FormData();
    formData.append('folderName', folderName);
    formData.append('parentFolderId', parentFolderId.toString());
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<Folder>(`${this.apiUrl}/folders`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      tap(() => this.loadFolderTree()),
      catchError(this.handleError)
    );
  }

  /**
   * Create folder (generic method)
   */
  createFolder(name: string, description: string, parentFolderId?: number): Observable<Folder> {
    if (parentFolderId !== undefined && parentFolderId !== null) {
      return this.createSubFolder(parentFolderId, name, description);
    } else {
      return this.createRootFolder(name, description);
    }
  }

  // =================== FOLDER QUERIES ===================

  /**
   * Get root folders
   */
  getRootFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiUrl}/folders`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get folder by ID
   */
  getFolder(folderId: number): Observable<Folder> {
    return this.http.get<Folder>(`${this.apiUrl}/folders/${folderId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(folder => this.currentFolderSubject.next(folder)),
      catchError(this.handleError)
    );
  }

  /**
   * Get subfolders
   */
  getSubFolders(folderId: number): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiUrl}/folders/${folderId}/subfolders`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get files in folder
   */
  getFolderFiles(folderId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/folders/${folderId}/files`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // =================== FOLDER MANAGEMENT ===================

  /**
   * Move folder
   */
  moveFolder(folderId: number, newParentFolderId?: number): Observable<Folder> {
    const formData = new FormData();
    if (newParentFolderId) {
      formData.append('newParentFolderId', newParentFolderId.toString());
    }

    return this.http.post<Folder>(`${this.apiUrl}/folders/${folderId}/move`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      tap(() => this.loadFolderTree()),
      catchError(this.handleError)
    );
  }

  /**
   * Rename folder
   */
  renameFolder(folderId: number, newName: string): Observable<Folder> {
    const formData = new FormData();
    formData.append('newName', newName);

    return this.http.put<Folder>(`${this.apiUrl}/folders/${folderId}`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      tap(() => this.loadFolderTree()),
      catchError(this.handleError)
    );
  }

  /**
   * Delete folder
   */
  deleteFolder(folderId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/folders/delete/${folderId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => this.loadFolderTree()),
      catchError(this.handleError)
    );
  }

  // =================== FOLDER TREE AND NAVIGATION ===================

  /**
   * Get folder tree
   */
  getFolderTree(): Observable<FolderTreeNode[]> {
    return this.http.get<FolderTreeNode[]>(`${this.apiUrl}/folders/tree`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(tree => this.folderTreeSubject.next(tree)),
      catchError(this.handleError)
    );
  }

  /**
   * Load folder tree and update state
   */
  loadFolderTree(): void {
    this.getFolderTree().subscribe({
      next: (tree) => {
        this.folderTreeSubject.next(tree);
      },
      error: (error) => {
        console.error('Error loading folder tree:', error);
      }
    });
  }

  /**
   * Get folder breadcrumb
   */
  getFolderBreadcrumb(folderId: number): Observable<FolderBreadcrumb[]> {
    return this.http.get<FolderBreadcrumb[]>(`${this.apiUrl}/folders/${folderId}/breadcrumb`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(breadcrumb => this.breadcrumbSubject.next(breadcrumb)),
      catchError(this.handleError)
    );
  }

  // =================== FILE MANAGEMENT ===================

  /**
   * Move file to folder
   */
  moveFileToFolder(fileId: number, folderId?: number): Observable<any> {
    const formData = new FormData();
    if (folderId) {
      formData.append('folderId', folderId.toString());
    }

    return this.http.post(`${this.apiUrl}/${fileId}/move-to-folder`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // =================== STATE MANAGEMENT ===================

  /**
   * Set current folder
   */
  setCurrentFolder(folder: Folder | null): void {
    this.currentFolderSubject.next(folder);
    if (folder) {
      this.getFolderBreadcrumb(folder.id).subscribe();
    } else {
      this.breadcrumbSubject.next([]);
    }
  }

  /**
   * Navigate to folder
   */
  navigateToFolder(folderId?: number): Observable<Folder | null> {
    if (folderId) {
      return this.getFolder(folderId).pipe(
        tap(folder => {
          this.setCurrentFolder(folder);
          this.getFolderBreadcrumb(folderId).subscribe();
        })
      );
    } else {
      this.setCurrentFolder(null);
      this.breadcrumbSubject.next([]);
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }
  }

  /**
   * Get current folder
   */
  getCurrentFolder(): Folder | null {
    return this.currentFolderSubject.value;
  }

  /**
   * Get current breadcrumb
   */
  getCurrentBreadcrumb(): FolderBreadcrumb[] {
    return this.breadcrumbSubject.value;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // =================== PRIVATE METHODS ===================

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private getUploadHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred while processing folders';
    
    console.error('Folder Service Error:', error);
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized - please log in again';
          this.authService.logout();
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          break;
        case 404:
          errorMessage = 'Folder not found';
          break;
        case 409:
          errorMessage = 'Folder name already exists';
          break;
        case 400:
          errorMessage = error.error?.message || 'Invalid folder operation';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };
}