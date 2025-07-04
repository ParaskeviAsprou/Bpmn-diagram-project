import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { Folder } from '../models/Folder';
// import { FolderTreeNode } from '../models/FolderTreeNode'; // Commented out
import { FolderBreadcrumb } from '../models/FolderBreadcrumb';

// Define the payload structure for creating a folder
interface CreateFolderPayload {
  folderName: string;
  description?: string;
  parentFolderId?: number | null;
  createdBy: string; // Add this field
}

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private apiUrl = 'http://localhost:8080/api/v1'; // Αλλαγή του base URL
  
  // Current folder state - Keep this for current folder details
  private currentFolderSubject = new BehaviorSubject<Folder | null>(null);
  public currentFolder$ = this.currentFolderSubject.asObservable();
  
  // Folder tree state - Commented out
  // private folderTreeSubject = new BehaviorSubject<FolderTreeNode[]>([]);
  // public folderTree$ = this.folderTreeSubject.asObservable();
  
  // Breadcrumb state - Keep this for navigation
  private breadcrumbSubject = new BehaviorSubject<FolderBreadcrumb[]>([]);
  public breadcrumb$ = this.breadcrumbSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) {
    // this.loadFolderTree(); // Commented out
  }

  // =================== FOLDER CREATION ===================

  /**
   * Create folder (generic method)
   * This method now takes 'createdBy' and sends a JSON payload.
   */
  createFolder(name: string, description: string, parentFolderId: number | null, createdBy: string): Observable<Folder> {
    const payload: CreateFolderPayload = {
      folderName: name,
      description: description,
      createdBy: createdBy // Pass the createdBy user
    };

    if (parentFolderId !== undefined && parentFolderId !== null) {
      payload.parentFolderId = parentFolderId;
    }

    // Send JSON payload with application/json headers
    return this.http.post<Folder>(`${this.apiUrl}/folders`, payload, { // Endpoint για δημιουργία φακέλου
      headers: this.getAuthHeaders() // Use getAuthHeaders for JSON
    }).pipe(
      // tap(() => this.loadFolderTree()), // Commented out - ανανέωση θα γίνει από το component
      catchError(this.handleError)
    );
  }

  // =================== FOLDER QUERIES ===================

  /**
   * Get folders in a specific folder or root folders if folderId is null
   */
  getFoldersInFolder(folderId: number | null): Observable<Folder[]> {
    const url = folderId === null ? `${this.apiUrl}/folders/root` : `${this.apiUrl}/folders/${folderId}/subfolders`;
    console.log(`Fetching folders from: ${url}`);
    return this.http.get<Folder[]>(url, {
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

  // =================== FOLDER MANAGEMENT (Existing methods remain) ===================

  /**
   * Move folder
   */
  moveFolder(folderId: number, newParentFolderId?: number): Observable<Folder> {
    const payload = {
      newParentFolderId: newParentFolderId
    };
    // Assuming this endpoint also expects JSON now
    return this.http.post<Folder>(`${this.apiUrl}/folders/${folderId}/move`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      // tap(() => this.loadFolderTree()), // Commented out
      catchError(this.handleError)
    );
  }

  /**
   * Rename folder
   */
  renameFolder(folderId: number, newName: string): Observable<Folder> {
    const payload = {
      newName: newName
    };
    // Assuming this endpoint also expects JSON now
    return this.http.put<Folder>(`${this.apiUrl}/folders/${folderId}`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      // tap(() => this.loadFolderTree()), // Commented out
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
      // tap(() => this.loadFolderTree()), // Commented out
      catchError(this.handleError)
    );
  }

  // =================== FOLDER TREE AND NAVIGATION (Modified/Commented) ===================

  /**
   * Get folder tree - Commented out
   */
  // getFolderTree(): Observable<FolderTreeNode[]> {
  //   return this.http.get<FolderTreeNode[]>(`${this.apiUrl}/folders/tree`, {
  //     headers: this.getAuthHeaders()
  //   }).pipe(
  //     tap(tree => this.folderTreeSubject.next(tree)),
  //     catchError(this.handleError)
  //   );
  // }

  /**
   * Load folder tree and update state - Commented out
   */
  // loadFolderTree(): void {
  //   this.getFolderTree().subscribe({
  //     next: (tree) => {
  //       this.folderTreeSubject.next(tree);
  //     },
  //     error: (error) => {
  //       console.error('Error loading folder tree:', error);
  //     }
  //   });
  // }

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

  // =================== FILE MANAGEMENT (Existing methods remain) ===================

  /**
   * Move file to folder
   */
  moveFileToFolder(fileId: number, folderId?: number): Observable<any> {
    const formData = new FormData();
    if (folderId) {
      formData.append('folderId', folderId.toString());
    }

    // This still uses FormData, which is appropriate for file-related operations
    return this.http.post(`${this.apiUrl}/file/${fileId}/move-to-folder`, formData, {
      headers: this.getUploadHeaders() // Use getUploadHeaders for FormData
    }).pipe(
      catchError(this.handleError)
    );
  }

  // =================== STATE MANAGEMENT (Existing methods remain) ===================

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

  // =================== UTILITY METHODS (Existing methods remain) ===================

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

  /**
   * Get authentication headers for JSON requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json' // Explicitly set for JSON
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * Get headers for file upload (multipart form data)
   */
  private getUploadHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // Do NOT set 'Content-Type' for FormData, browser handles it
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
          errorMessage = error.error?.message || 'Folder name already exists'; // Εδώ το μήνυμα μπορεί να έρχεται από το backend
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
