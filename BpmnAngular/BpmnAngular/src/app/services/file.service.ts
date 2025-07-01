import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AppFile } from '../models/File';
import { Folder } from '../models/Folder';


@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiServerUrl = "http://localhost:8080/api/v1/file";

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  /**
   * Upload a file to the server
   */
  public uploadFile(file: File): Observable<AppFile> {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const headers = this.getUploadHeaders();

    console.log('Uploading file with headers:', headers.keys());

    return this.http.post<AppFile>(`${this.apiServerUrl}/upload`, formData, {
      headers: headers
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Upload BPMN content as new file
   */
  public uploadBpmnContent(fileName: string, content: string): Observable<AppFile> {
    const blob = new Blob([content], { type: 'application/xml' });
    const file = new File([blob], fileName, { type: 'application/xml' });
    return this.uploadFile(file);
  }

  /**
   * Get all files from server
   */
  public getFiles(): Observable<AppFile[]> {
    return this.http.get<AppFile[]>(`${this.apiServerUrl}/all`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete file by ID
   */
  public deleteFile(id: number): Observable<any> {
    return this.http.delete(`${this.apiServerUrl}/delete/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get file by filename
   */
  public getFile(filename: string): Observable<AppFile> {
    return this.http.get<AppFile>(`${this.apiServerUrl}/file/${filename}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get file by ID
   */
  public getFileById(id: number): Observable<AppFile> {
    return this.http.get<AppFile>(`${this.apiServerUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  getRootFiles(): Observable<AppFile[]> {
    return this.http.get<AppFile[]>(`${this.apiServerUrl}/root-files`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }
  /**
   * Get file content as string
   */
  public getFileContent(id: number): Observable<string> {
    return this.http.get(`${this.apiServerUrl}/${id}/content`, {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    });
  }

  /**
   * Export file in various formats (NEW METHOD)
   */
  public exportFile(fileId: number, format: 'xml' | 'svg' | 'png' | 'pdf'): Observable<Blob> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to export files'));
    }

    return this.http.get(`${this.apiServerUrl}/${fileId}/export/${format}`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Export element to PDF (client-side conversion)
   */
  public exportElementToPdf(elementId: string = 'content', fileName: string = 'exported-file.pdf'): Promise<void> {
    return new Promise((resolve, reject) => {
      const element = document.getElementById(elementId);

      if (!element) {
        reject(new Error(`Element with ID '${elementId}' not found`));
        return;
      }

      html2canvas(element).then(canvas => {
        const imgWidth = 208;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        const contentDataURL = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        pdf.addImage(contentDataURL, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(fileName);
        resolve();
      }).catch(error => {
        reject(error);
      });
    });
  }

  /**
   * Download file as blob
   */
  public downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiServerUrl}/${fileId}/download`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validate BPMN file
   */
  public validateBpmnFile(fileId: number): Observable<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    return this.http.post<{ valid: boolean; errors?: string[]; warnings?: string[] }>(`${this.apiServerUrl}/${fileId}/validate`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get file preview/thumbnail
   */
  public getFilePreview(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiServerUrl}/${fileId}/preview`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update existing file content
   */
  updateFileContent(fileId: number, content: string): Observable<AppFile> {
    const formData = new FormData();
    formData.append('content', content);

    return this.http.put<AppFile>(`${this.apiServerUrl}/${fileId}/content`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }


  /**
   * Get authentication headers for JSON requests
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Don't set Content-Type for requests that might need different content types
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
    return headers;
  }

  /**
   * Error handling with detailed logging and better permission handling
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred while processing the file';

    console.error('File Service Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      message: error.message,
      error: error.error
    });

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized - please log in again';
          console.error('Authentication failed - redirecting to login');
          this.authService.logout();
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          console.error('Permission denied. Check user roles and endpoint security configuration.');
          console.error('Current user token:', this.authService.getToken() ? 'Present' : 'Missing');
          console.error('User roles:', this.authService.getUserRoles());
          // Don't auto-logout on 403 as it might be expected for some operations
          break;
        case 404:
          errorMessage = 'File not found';
          break;
        case 413:
          errorMessage = 'File too large';
          break;
        case 415:
          errorMessage = 'Unsupported file type';
          break;
        case 422:
          errorMessage = 'Invalid file format';
          break;
        case 500:
          errorMessage = 'Server error - please try again later';
          break;
        default:
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          } else {
            errorMessage = `Error: ${error.status} - ${error.statusText}`;
          }
      }
    }

    console.error('File Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  getFilesInFolder(folderId: number): Observable<AppFile[]> {
    return this.http.get<AppFile[]>(`${this.apiServerUrl}/folders/${folderId}/files`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }


  uploadFileToFolder(
    file: File,
    folderId: number | null,
    description: string = '',
    tags: string = '',
    customName?: string
  ): Observable<AppFile> {
    const formData = new FormData();
    formData.append('file', file);

    if (folderId !== null && folderId !== undefined) {
      formData.append('folderId', folderId.toString());
    }

    if (description) {
      formData.append('description', description);
    }

    if (tags) {
      formData.append('tags', tags);
    }

    if (customName) {
      formData.append('customName', customName);
    }

    return this.http.post<AppFile>(`${this.apiServerUrl}/upload`, formData, {
      headers: this.getUploadHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

}