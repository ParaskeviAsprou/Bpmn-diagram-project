import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { AppFile } from '../models/File';

export interface SaveBpmnPayload {
  name: string;
  xml: string;
  customProperties?: string;
  elementColors?: string;
  folderId?: number;
  overwrite: boolean;
}

export interface UpdateBpmnPayload {
  xml: string;
  customProperties?: string;
  elementColors?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiServerUrl = "http://localhost:8080/api/v1/file";

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  // =================== BPMN DIAGRAM SAVE ===================

  /**
   * Save BPMN diagram with proper payload format
   */
  saveBpmnDiagram(payload: SaveBpmnPayload): Observable<AppFile> {
    console.log('FileService.saveBpmnDiagram called with:', {
      name: payload.name,
      xmlLength: payload.xml?.length,
      customPropertiesLength: payload.customProperties?.length,
      elementColorsLength: payload.elementColors?.length,
      folderId: payload.folderId,
      overwrite: payload.overwrite
    });

    // Validate payload before sending
    if (!payload.name || !payload.xml) {
      return throwError(() => new Error('Name and XML content are required'));
    }

    // Ensure proper JSON format for custom properties and element colors
    const processedPayload = {
      ...payload,
      customProperties: this.ensureValidJsonString(payload.customProperties),
      elementColors: this.ensureValidJsonString(payload.elementColors)
    };

    return this.http.post<AppFile>(`${this.apiServerUrl}/save`, processedPayload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => console.log('Server response:', response)),
      catchError(this.handleError)
    );
  }

  /**
   * Update existing file content
   */
  updateFileContent(fileId: number, xml: string, customProperties?: string, elementColors?: string): Observable<AppFile> {
    console.log('FileService.updateFileContent called with fileId:', fileId);

    const payload: UpdateBpmnPayload = {
      xml: xml,
      customProperties: this.ensureValidJsonString(customProperties),
      elementColors: this.ensureValidJsonString(elementColors)
    };

    return this.http.put<AppFile>(`${this.apiServerUrl}/${fileId}/content`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => console.log('Update response:', response)),
      catchError(this.handleError)
    );
  }

  /**
   * Save BPMN diagram as new file (convenience method)
   */
  saveAsNewBpmnFile(
    fileName: string,
    xml: string,
    customProperties?: any,
    elementColors?: any,
    folderId?: number
  ): Observable<AppFile> {
    const payload: SaveBpmnPayload = {
      name: fileName,
      xml: xml,
      customProperties: typeof customProperties === 'string' ? customProperties : JSON.stringify(customProperties || {}),
      elementColors: typeof elementColors === 'string' ? elementColors : JSON.stringify(elementColors || {}),
      folderId: folderId,
      overwrite: false
    };

    return this.saveBpmnDiagram(payload);
  }

  /**
   * Save BPMN diagram with overwrite option
   */
  saveBpmnDiagramWithOverwrite(
    fileName: string,
    xml: string,
    customProperties?: any,
    elementColors?: any,
    folderId?: number,
    overwrite: boolean = false
  ): Observable<AppFile> {
    const payload: SaveBpmnPayload = {
      name: fileName,
      xml: xml,
      customProperties: typeof customProperties === 'string' ? customProperties : JSON.stringify(customProperties || {}),
      elementColors: typeof elementColors === 'string' ? elementColors : JSON.stringify(elementColors || {}),
      folderId: folderId,
      overwrite: overwrite
    };

    return this.saveBpmnDiagram(payload);
  }

  /**
   * Helper method to ensure valid JSON string format
   */
  private ensureValidJsonString(value?: string): string {
    if (!value) return '{}';

    // If already a string, validate it's valid JSON
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
        return value;
      } catch (e) {
        console.warn('Invalid JSON string provided, using empty object:', value);
        return '{}';
      }
    }

    // If it's an object, stringify it
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        console.warn('Could not stringify object, using empty object:', value);
        return '{}';
      }
    }

    return '{}';
  }

  // =================== FILE OPERATIONS ===================

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
   * Get root files (files not in any folder)
   */
  getRootFiles(): Observable<AppFile[]> {
    return this.http.get<AppFile[]>(`${this.apiServerUrl}/root-files`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get files in specific folder
   */
  getFilesInFolder(folderId: number): Observable<AppFile[]> {
    return this.http.get<AppFile[]>(`${this.apiServerUrl}/folders/${folderId}/files`, {
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
   * Delete file by ID
   */
  public deleteFile(id: number): Observable<any> {
    return this.http.delete(`${this.apiServerUrl}/delete/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // =================== EXPORT OPERATIONS ===================

  /**
   * Export file in various formats (PDF, XML, SVG, PNG)
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
   * Export file as archive (ZIP with all formats)
   */
  public exportFileAsArchive(fileId: number): Observable<Blob> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to export files'));
    }

    return this.http.get(`${this.apiServerUrl}/${fileId}/export/archive`, {
      responseType: 'blob',
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
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

  // =================== FILE UPLOAD ===================

  /**
   * Upload file to specific folder
   */
  uploadFileToFolder(
    file: File,
    folderId: number | null,
    description: string = '',
    tags: string = '',
    customName?: string,
    overwrite: boolean = false
  ): Observable<AppFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwrite', overwrite.toString());

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

  /**
   * Upload BPMN content as file using SAVE endpoint (recommended)
   */
  public uploadBpmnContentViaeSave(fileName: string, content: string, folderId?: number): Observable<AppFile> {
    console.log('Uploading BPMN content via SAVE endpoint');
    return this.saveBpmnDiagramWithOverwrite(
      fileName,
      content,
      '{}', // empty custom properties
      '{}', // empty element colors
      folderId ?? undefined,
      false // don't overwrite by default
    );
  }

  /**
   * Save BPMN content as new file (preferred method)
   */
  public saveBpmnContent(fileName: string, content: string, folderId?: number): Observable<AppFile> {
    return this.saveBpmnDiagramWithOverwrite(
      fileName,
      content,
      '{}', // empty custom properties
      '{}', // empty element colors
      folderId ?? undefined,
      false // don't overwrite by default
    );
  }

  // =================== FILE EXISTENCE CHECK ===================

  /**
   * Check if file exists in specific folder
   */
  async fileExistsInFolder(fileName: string, folderId: number | null): Promise<boolean> {
    try {
      const url = folderId
        ? `${this.apiServerUrl}/folders/${folderId}/files/check-exists`
        : `${this.apiServerUrl}/root-files/check-exists`;

      const response = await this.http.post<{ exists: boolean }>(url,
        { fileName },
        { headers: this.getAuthHeaders() }
      ).toPromise();

      return response?.exists || false;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  // =================== DEBUG METHODS ===================

  /**
   * Test the save functionality
   */
  public testSave(xml?: string): Observable<any> {
    const payload = {
      xml: xml || '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>'
    };

    return this.http.post<any>(`${this.apiServerUrl}/debug/test-save`, payload, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => console.log('Test save response:', response)),
      catchError(this.handleError)
    );
  }

  /**
   * Get system status for debugging
   */
  public getSystemStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiServerUrl}/debug/status`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => console.log('System status:', response)),
      catchError(this.handleError)
    );
  }

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
    return headers;
  }

  /**
   * Format file size helper
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
          this.authService.logout();
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          break;
        case 404:
          errorMessage = 'File not found';
          break;
        case 409:
          errorMessage = 'File already exists';
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
          if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (error.error?.message) {
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
}