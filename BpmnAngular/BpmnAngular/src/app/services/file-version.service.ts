import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';

export interface FileVersion {
  id: number;
  version: number;
  fileName: string;
  fileSize: number;
  createdTime: string;
  createdBy: string;
  notes?: string;
  isCurrent: boolean;
}

export interface CreateVersionRequest {
  file: File;
  notes: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileVersionService {
  private apiServerUrl = 'http://localhost:8080/api/v1/files'; 

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  createNewVersion(fileId: number, request: CreateVersionRequest): Observable<FileVersion> {
    const formData = new FormData();
    formData.append('file', request.file, request.file.name);
    formData.append('notes', request.notes);

    return this.http.post<FileVersion>(`${this.apiServerUrl}/${fileId}/versions`, formData, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(version => {
        console.log('FileVersionService: Version created successfully:', version);
      }),
      catchError(this.handleError)
    );
  }

  getFileVersions(fileId: number): Observable<FileVersion[]> {
    return this.http.get<FileVersion[]>(`${this.apiServerUrl}/${fileId}/versions`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(versions => {
        console.log('FileVersionService: Successfully loaded versions:', versions.length);
      }),
      catchError(this.handleError)
    );
  }

  downloadVersion(fileId: number, versionId: number): Observable<Blob> {
    return this.http.get(`${this.apiServerUrl}/${fileId}/versions/${versionId}/download`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('FileVersionService: Version downloaded successfully');
      }),
      catchError(this.handleError)
    );
  }

  restoreVersion(fileId: number, versionId: number): Observable<any> {
    return this.http.post(`${this.apiServerUrl}/${fileId}/versions/${versionId}/restore`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('FileVersionService: Version restored successfully');
      }),
      catchError(this.handleError)
    );
  }

  deleteVersion(fileId: number, versionId: number): Observable<any> {
    return this.http.delete(`${this.apiServerUrl}/${fileId}/versions/${versionId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log('FileVersionService: Version deleted successfully');
      }),
      catchError(this.handleError)
    );
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

  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred while processing file versions';

    console.error('FileVersionService Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized - your session has expired';
          break;
        case 403:
          errorMessage = 'Forbidden - you do not have permission to access file versions';
          break;
        case 404:
          errorMessage = 'File or version not found';
          break;
        case 409:
          errorMessage = error.error?.message || 'Version conflict';
          break;
        case 400:
          errorMessage = error.error?.message || 'Invalid version operation';
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

    console.error('FileVersionService: Final error message:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };
}