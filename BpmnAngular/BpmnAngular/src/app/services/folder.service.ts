import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { Folder } from '../models/Folder';

// Define the payload structure for creating a folder
interface CreateFolderPayload {
  folderName: string;
  description?: string;
  createdBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private apiUrl = 'http://localhost:8080/api/v1/file';

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  // =================== SIMPLIFIED FOLDER OPERATIONS ===================

  /**
   * Create simple folder (no parent-child relationships)
   */
  createFolder(name: string, description: string, createdBy: string): Observable<Folder> {
    const payload: CreateFolderPayload = {
      folderName: name,
      description: description,
      createdBy: createdBy
    };

    return this.http.post<Folder>(`${this.apiUrl}/create-folder`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(folder => {
        console.log('Folder created successfully:', folder);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get all folders (simplified - no hierarchy)
   */
  getAllSimpleFolders(): Observable<Folder[]> {
    console.log('FolderService: Getting all folders...');
    
    return this.http.get<Folder[]>(`${this.apiUrl}/all/folders`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(folders => {
        console.log('FolderService: Successfully loaded folders:', folders.length);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get folder by ID
   */
  getFolderById(folderId: number): Observable<Folder> {
    console.log('FolderService: Getting folder by ID:', folderId);
    
    return this.http.get<Folder>(`${this.apiUrl}/folders/${folderId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(folder => {
        console.log('FolderService: Successfully loaded folder:', folder);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get files in folder
   */
  getFilesInFolder(folderId: number): Observable<any[]> {
    console.log('FolderService: Getting files in folder:', folderId);
    
    return this.http.get<any[]>(`${this.apiUrl}/folders/${folderId}/files`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(files => {
        console.log('FolderService: Successfully loaded files in folder:', files.length);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete folder
   */
  deleteFolder(folderId: number): Observable<any> {
    console.log('FolderService: Deleting folder:', folderId);
    
    return this.http.delete(`${this.apiUrl}/folders/delete/${folderId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('FolderService: Folder deleted successfully');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Rename folder
   */
  renameFolder(folderId: number, newName: string): Observable<Folder> {
    const payload = {
      folderName: newName,
      updatedBy: this.authService.getCurrentUser()?.username || 'unknown'
    };

    console.log('FolderService: Renaming folder:', folderId, 'to:', newName);

    return this.http.put<Folder>(`${this.apiUrl}/folders/${folderId}`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(folder => {
        console.log('FolderService: Folder renamed successfully:', folder);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Move file to folder
   */
  moveFileToFolder(fileId: number, folderId?: number): Observable<any> {
    const payload = {
      folderId: folderId
    };
    
    console.log('FolderService: Moving file to folder:', fileId, 'to folder:', folderId);
    
    return this.http.post(`${this.apiUrl}/files/${fileId}/move-to-folder`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('FolderService: File moved successfully');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update folder description
   */
  updateFolderDescription(folderId: number, description: string): Observable<Folder> {
    const payload = {
      description: description,
      updatedBy: this.authService.getCurrentUser()?.username || 'unknown'
    };

    console.log('FolderService: Updating folder description:', folderId);

    return this.http.put<Folder>(`${this.apiUrl}/folders/${folderId}/description`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(folder => {
        console.log('FolderService: Folder description updated successfully:', folder);
      }),
      catchError(this.handleError)
    );
  }

  // =================== ARCHIVE EXPORT ===================

  /**
   * Export file as archive (ZIP with all formats)
   */
  exportFileAsArchive(fileId: number): Observable<Blob> {
    console.log('FolderService: Exporting file as archive:', fileId);
    
    return this.http.get(`${this.apiUrl}/${fileId}/export/archive`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('FolderService: File exported as archive successfully');
      }),
      catchError(this.handleError)
    );
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

  /**
   * Get authentication headers for JSON requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('FolderService: Added Authorization header with token');
    } else {
      console.warn('FolderService: No token available for request');
    }
    
    return headers;
  }

  /**
   * ΒΕΛΤΙΩΜΕΝΟ ERROR HANDLING - δεν κάνει logout για κάθε error
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred while processing folders';
    let shouldLogout = false;

    console.error('FolderService Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error,
      headers: error.headers
    });

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized - your session has expired';
          shouldLogout = true;
          break;
        case 403:
          // ΣΗΜΑΝΤΙΚΟ: Δεν κάνουμε logout για 403 - μπορεί να είναι permission issue
          errorMessage = 'Forbidden - you do not have permission to access folders';
          console.warn('FolderService: 403 error - permission issue, not logging out');
          break;
        case 404:
          errorMessage = 'Folder not found';
          break;
        case 409:
          errorMessage = error.error?.message || 'Folder name already exists';
          break;
        case 400:
          errorMessage = error.error?.message || 'Invalid folder operation';
          break;
        case 0:
          errorMessage = 'Network connection error - please check your internet connection';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Server error - please try again in a few moments';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.status}`;
      }
    }

  
    console.error('FolderService: Final error message:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };
}