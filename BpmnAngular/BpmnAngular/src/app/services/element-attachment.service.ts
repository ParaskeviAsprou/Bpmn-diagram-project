// element-attachment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';

export interface ElementAttachment {
  id: number;
  elementId: string;
  elementType: string;
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
  downloadUrl?: string;
}

export enum AttachmentCategory {
  DOCUMENT = 'DOCUMENT',
  IMAGE = 'IMAGE',
  SPECIFICATION = 'SPECIFICATION',
  REFERENCE = 'REFERENCE',
  TEMPLATE = 'TEMPLATE',
  OTHER = 'OTHER'
}

export interface AttachmentStatistics {
  totalAttachments: number;
  totalSize: number;
  imageCount: number;
  documentCount: number;
  pdfCount: number;
  averageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class ElementAttachmentService {
  private apiUrl = 'http://localhost:8080/api/v1/file';
  
  // Track attachments for current file
  private currentFileAttachmentsSubject = new BehaviorSubject<ElementAttachment[]>([]);
  public currentFileAttachments$ = this.currentFileAttachmentsSubject.asObservable();
  
  // Track attachments for current element
  private currentElementAttachmentsSubject = new BehaviorSubject<ElementAttachment[]>([]);
  public currentElementAttachments$ = this.currentElementAttachmentsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  /**
   * Add attachment to BPMN element
   */
  addElementAttachment(
    fileId: number,
    elementId: string,
    file: File,
    elementType?: string,
    description?: string
  ): Observable<ElementAttachment> {
    const formData = new FormData();
    formData.append('attachment', file);
    if (elementType) {
      formData.append('elementType', elementType);
    }
    if (description) {
      formData.append('description', description);
    }

    return this.http.post<ElementAttachment>(
      `${this.apiUrl}/${fileId}/elements/${elementId}/attachments`,
      formData,
      { headers: this.getUploadHeaders() }
    ).pipe(
      tap(() => this.refreshAttachments(fileId, elementId)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all attachments for a specific element
   */
  getElementAttachments(fileId: number, elementId: string): Observable<ElementAttachment[]> {
    return this.http.get<ElementAttachment[]>(
      `${this.apiUrl}/${fileId}/elements/${elementId}/attachments`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(attachments => this.currentElementAttachmentsSubject.next(attachments)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all attachments for a file
   */
  getFileAttachments(fileId: number): Observable<ElementAttachment[]> {
    return this.http.get<ElementAttachment[]>(
      `${this.apiUrl}/${fileId}/attachments`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(attachments => this.currentFileAttachmentsSubject.next(attachments)),
      catchError(this.handleError)
    );
  }

  /**
   * Get specific attachment
   */
  getAttachment(attachmentId: number): Observable<ElementAttachment> {
    return this.http.get<ElementAttachment>(
      `${this.apiUrl}/attachments/${attachmentId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update attachment metadata
   */
  updateAttachment(
    attachmentId: number,
    newName: string,
    newDescription?: string
  ): Observable<ElementAttachment> {
    const formData = new FormData();
    formData.append('newName', newName);
    if (newDescription) {
      formData.append('newDescription', newDescription);
    }

    return this.http.put<ElementAttachment>(
      `${this.apiUrl}/attachments/${attachmentId}`,
      formData,
      { headers: this.getUploadHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Replace attachment file
   */
  replaceAttachmentFile(attachmentId: number, newFile: File): Observable<ElementAttachment> {
    const formData = new FormData();
    formData.append('newFile', newFile);

    return this.http.put<ElementAttachment>(
      `${this.apiUrl}/attachments/${attachmentId}/file`,
      formData,
      { headers: this.getUploadHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete attachment
   */
  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/attachments/${attachmentId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Download attachment
   */
  downloadAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/attachments/${attachmentId}/download`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob'
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Open attachment in new window
   */
  openAttachment(attachment: ElementAttachment): void {
    if (attachment.base64Data) {
      // Create blob URL and open in new window
      const byteCharacters = atob(attachment.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.fileType });
      const url = URL.createObjectURL(blob);
      
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      // Download and open
      this.downloadAttachment(attachment.id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (error) => {
          console.error('Error opening attachment:', error);
          this.showMessage('Error opening attachment: ' + error.message, 'error');
        }
      });
    }
  }

  /**
   * Preview attachment (for images and PDFs)
   */
  previewAttachment(attachment: ElementAttachment): Observable<string> {
    if (attachment.base64Data) {
      return new Observable(observer => {
        const dataUrl = `data:${attachment.fileType};base64,${attachment.base64Data}`;
        observer.next(dataUrl);
        observer.complete();
      });
    } else {
      return this.downloadAttachment(attachment.id).pipe(
        map(blob => {
          return URL.createObjectURL(blob);
        })
      );
    }
  }

  /**
   * Search attachments
   */
  searchAttachments(searchTerm: string): Observable<ElementAttachment[]> {
    return this.http.get<ElementAttachment[]>(
      `${this.apiUrl}/attachments/search?query=${encodeURIComponent(searchTerm)}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get attachments by category
   */
  getAttachmentsByCategory(category: AttachmentCategory): Observable<ElementAttachment[]> {
    return this.http.get<ElementAttachment[]>(
      `${this.apiUrl}/attachments/category/${category}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get attachment statistics for file
   */
  getFileAttachmentStatistics(fileId: number): Observable<AttachmentStatistics> {
    return this.http.get<AttachmentStatistics>(
      `${this.apiUrl}/${fileId}/attachments/statistics`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Copy attachments from one element to another
   */
  copyElementAttachments(
    sourceFileId: number,
    sourceElementId: string,
    targetFileId: number,
    targetElementId: string
  ): Observable<ElementAttachment[]> {
    const body = {
      sourceFileId,
      sourceElementId,
      targetFileId,
      targetElementId
    };

    return this.http.post<ElementAttachment[]>(
      `${this.apiUrl}/attachments/copy`,
      body,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get attachment count for element
   */
  getElementAttachmentCount(fileId: number, elementId: string): Observable<number> {
    return this.http.get<number>(
      `${this.apiUrl}/${fileId}/elements/${elementId}/attachments/count`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Validate attachment file
   */
  validateAttachmentFile(file: File): { valid: boolean; error?: string } {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    // Check file type (allow most common types)
    const allowedTypes = [
      'image/', 'application/pdf', 'text/', 'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
      'application/zip', 'application/x-zip-compressed'
    ];

    const isValidType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isValidType) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(attachment: ElementAttachment): string {
    const fileType = attachment.fileType.toLowerCase();
    const extension = attachment.originalFilename?.split('.').pop()?.toLowerCase();

    if (fileType.startsWith('image/')) {
      return 'bx-image';
    } else if (fileType === 'application/pdf') {
      return 'bx-file-pdf';
    } else if (fileType.includes('word') || extension === 'doc' || extension === 'docx') {
      return 'bx-file-doc';
    } else if (fileType.includes('excel') || extension === 'xls' || extension === 'xlsx') {
      return 'bx-spreadsheet';
    } else if (fileType.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') {
      return 'bx-file-presentation';
    } else if (fileType.startsWith('text/') || extension === 'txt') {
      return 'bx-file-text';
    } else if (fileType.includes('zip') || extension === 'zip' || extension === 'rar') {
      return 'bx-archive';
    } else {
      return 'bx-file';
    }
  }

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
   * Get category display name
   */
  getCategoryDisplayName(category: AttachmentCategory): string {
    const categoryNames = {
      [AttachmentCategory.DOCUMENT]: 'Document',
      [AttachmentCategory.IMAGE]: 'Image',
      [AttachmentCategory.SPECIFICATION]: 'Specification',
      [AttachmentCategory.REFERENCE]: 'Reference',
      [AttachmentCategory.TEMPLATE]: 'Template',
      [AttachmentCategory.OTHER]: 'Other'
    };
    return categoryNames[category] || 'Unknown';
  }

  /**
   * Refresh attachments for element
   */
  private refreshAttachments(fileId: number, elementId: string): void {
    this.getElementAttachments(fileId, elementId).subscribe();
    this.getFileAttachments(fileId).subscribe();
  }

  /**
   * Clear current attachments
   */
  clearCurrentAttachments(): void {
    this.currentElementAttachmentsSubject.next([]);
    this.currentFileAttachmentsSubject.next([]);
  }

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
    let errorMessage = 'An error occurred while processing attachments';
    
    console.error('Element Attachment Service Error:', error);
    
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
          errorMessage = 'Attachment or element not found';
          break;
        case 413:
          errorMessage = 'File too large';
          break;
        case 415:
          errorMessage = 'Unsupported file type';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };

  private showMessage(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    // This should integrate with your existing notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}