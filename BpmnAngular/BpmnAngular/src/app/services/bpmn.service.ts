import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, EMPTY, timer } from 'rxjs';
import { catchError, map, tap, retryWhen, scan, delayWhen, take } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';

export interface BpmnDiagram {
  id: number;
  name: string;
  description?: string;
  xml: string;
  svg?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isPublic: boolean;
  tags?: string[];
  category?: string;
  permissions?: DiagramPermissions;
}

export interface DiagramPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export interface DiagramCreateRequest {
  name: string;
  description?: string;
  xml: string;
  svg?: string;
  isPublic?: boolean;
  tags?: string[];
  category?: string;
}

export interface DiagramUpdateRequest extends DiagramCreateRequest {
  id: number;
  version: number;
}

export interface DiagramListResponse {
  diagrams: BpmnDiagram[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}

export interface DiagramSearchParams {
  query?: string;
  tags?: string[];
  category?: string;
  createdBy?: string;
  isPublic?: boolean;
  page?: number;
  size?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class BpmnService {
  private apiUrl = 'http://localhost:8080/api/v1/diagrams';
  private currentDiagramSubject = new BehaviorSubject<BpmnDiagram | null>(null);
  private diagramsListSubject = new BehaviorSubject<BpmnDiagram[]>([]);
  
  public currentDiagram$ = this.currentDiagramSubject.asObservable();
  public diagramsList$ = this.diagramsListSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) {
    // Only load user diagrams if logged in and has proper permissions
    if (this.authService.isLoggedIn() && this.canAccessDiagrams()) {
      this.loadUserDiagramsSafely();
    }
  }

  /**
   * Check if user has basic diagram access permissions
   */
  private canAccessDiagrams(): boolean {
    return this.authService.canView() || this.authService.canEdit() || this.authService.isAdmin();
  }

  /**
   * Get all diagrams accessible to the current user based on their role
   */
  getAllDiagrams(params?: DiagramSearchParams): Observable<DiagramListResponse> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to view diagrams'));
    }

    const queryParams = this.buildQueryParams(params);
    
    return this.http.get<DiagramListResponse>(`${this.apiUrl}`, {
      params: queryParams,
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        // Update local diagrams list
        this.diagramsListSubject.next(response.diagrams);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get diagram by ID with permission checking
   */
  getDiagram(id: number): Observable<BpmnDiagram> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to view diagrams'));
    }

    return this.http.get<BpmnDiagram>(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(diagram => this.enrichDiagramWithPermissions(diagram)),
      tap(diagram => this.setCurrentDiagram(diagram)),
      catchError(this.handleError)
    );
  }

  /**
   * Create new diagram (MODELER, ADMIN only)
   */
  createDiagram(diagram: DiagramCreateRequest): Observable<BpmnDiagram> {
    if (!this.authService.canEdit()) {
      return throwError(() => new Error('Insufficient permissions to create diagrams'));
    }

    return this.http.post<BpmnDiagram>(`${this.apiUrl}`, diagram, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(newDiagram => this.enrichDiagramWithPermissions(newDiagram)),
      tap(newDiagram => {
        // Add to local list and set as current
        this.addDiagramToList(newDiagram);
        this.setCurrentDiagram(newDiagram);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update existing diagram (MODELER, ADMIN only)
   */
  updateDiagram(diagram: DiagramUpdateRequest): Observable<BpmnDiagram> {
    if (!this.authService.canEdit()) {
      return throwError(() => new Error('Insufficient permissions to update diagrams'));
    }

    return this.http.put<BpmnDiagram>(`${this.apiUrl}/${diagram.id}`, diagram, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(updatedDiagram => this.enrichDiagramWithPermissions(updatedDiagram)),
      tap(updatedDiagram => {
        // Update local list and current diagram
        this.updateDiagramInList(updatedDiagram);
        this.setCurrentDiagram(updatedDiagram);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete diagram (ADMIN only, or owner if MODELER)
   */
  deleteDiagram(id: number): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    // Check permissions
    const currentDiagram = this.currentDiagramSubject.value;
    const canDelete = this.authService.isAdmin() || 
                     (this.authService.isModeler() && 
                      currentDiagram?.createdBy === currentUser.username);

    if (!canDelete) {
      return throwError(() => new Error('Insufficient permissions to delete diagrams'));
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(() => {
        // Remove from local list
        this.removeDiagramFromList(id);
        // Clear current if it was the deleted one
        if (this.currentDiagramSubject.value?.id === id) {
          this.setCurrentDiagram(null);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get user's own diagrams - with better error handling
   */
  getUserDiagrams(): Observable<BpmnDiagram[]> {
    // Check if user has required permissions
    if (!this.authService.canView()) {
      console.warn('User lacks permission to view diagrams');
      return EMPTY; // Return empty observable instead of error
    }

    return this.http.get<BpmnDiagram[]>(`${this.apiUrl}/my-diagrams`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(diagrams => diagrams.map(d => this.enrichDiagramWithPermissions(d))),
      tap(diagrams => this.diagramsListSubject.next(diagrams)),
      catchError((error) => {
        console.warn('Failed to load user diagrams, falling back to empty list:', error.message);
        return EMPTY; // Return empty instead of propagating error
      })
    );
  }

  /**
   * Get public diagrams (accessible to all authenticated users)
   */
  getPublicDiagrams(): Observable<BpmnDiagram[]> {
    return this.http.get<BpmnDiagram[]>(`${this.apiUrl}/public`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(diagrams => diagrams.map(d => this.enrichDiagramWithPermissions(d))),
      catchError(this.handleError)
    );
  }

  /**
   * Search diagrams with advanced filters
   */
  searchDiagrams(params: DiagramSearchParams): Observable<DiagramListResponse> {
    const queryParams = this.buildQueryParams(params);
    
    return this.http.get<DiagramListResponse>(`${this.apiUrl}/search`, {
      params: queryParams,
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(response => {
        response.diagrams = response.diagrams.map(d => this.enrichDiagramWithPermissions(d));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Export diagram in various formats
   */
  exportDiagram(id: number, format: 'xml' | 'svg' | 'png' | 'pdf'): Observable<Blob> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to export diagrams'));
    }

    return this.http.get(`${this.apiUrl}/${id}/export/${format}`, {
      responseType: 'blob',
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Import diagram from file
   */
  importDiagram(file: File, metadata?: Partial<DiagramCreateRequest>): Observable<BpmnDiagram> {
    if (!this.authService.canEdit()) {
      return throwError(() => new Error('Insufficient permissions to import diagrams'));
    }

    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        const value = (metadata as any)[key];
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
    }

    return this.http.post<BpmnDiagram>(`${this.apiUrl}/import`, formData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(diagram => this.enrichDiagramWithPermissions(diagram)),
      tap(diagram => {
        this.addDiagramToList(diagram);
        this.setCurrentDiagram(diagram);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Validate diagram XML
   */
  validateDiagram(xml: string): Observable<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    return this.http.post<{ valid: boolean; errors?: string[]; warnings?: string[] }>(`${this.apiUrl}/validate`, { xml }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Share diagram with specific users
   */
  shareDiagram(id: number, userIds: number[]): Observable<void> {
    if (!this.authService.canEdit()) {
      return throwError(() => new Error('Insufficient permissions to share diagrams'));
    }

    return this.http.post<void>(`${this.apiUrl}/${id}/share`, { userIds }, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get diagram history/versions
   */
  getDiagramHistory(id: number): Observable<BpmnDiagram[]> {
    return this.http.get<BpmnDiagram[]>(`${this.apiUrl}/${id}/history`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      map(diagrams => diagrams.map(d => this.enrichDiagramWithPermissions(d))),
      catchError(this.handleError)
    );
  }

  // ============= STATE MANAGEMENT =============

  /**
   * Set current diagram
   */
  setCurrentDiagram(diagram: BpmnDiagram | null): void {
    this.currentDiagramSubject.next(diagram);
  }

  /**
   * Get current diagram
   */
  get currentDiagram(): BpmnDiagram | null {
    return this.currentDiagramSubject.value;
  }

  /**
   * Load user's diagrams into local state - with safe error handling
   */
  private loadUserDiagramsSafely(): void {
    this.getUserDiagrams().subscribe({
      next: (diagrams) => {
        console.log(`Loaded ${diagrams.length} user diagrams`);
      },
      error: (error) => {
        console.warn('Failed to load user diagrams:', error.message);
        // Don't throw error, just log it
      }
    });
  }

  // ============= PERMISSION HELPERS =============

  /**
   * Enrich diagram with permission information based on current user
   */
  private enrichDiagramWithPermissions(diagram: BpmnDiagram): BpmnDiagram {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return { ...diagram, permissions: { canView: false, canEdit: false, canDelete: false, canShare: false } };
    }

    const isOwner = diagram.createdBy === currentUser.username;
    const isAdmin = this.authService.isAdmin();
    const isModeler = this.authService.isModeler();
    const canView = this.authService.canView();

    const permissions: DiagramPermissions = {
      canView: canView && (diagram.isPublic || isOwner || isAdmin),
      canEdit: isModeler && (isOwner || isAdmin),
      canDelete: isAdmin || (isModeler && isOwner),
      canShare: isModeler && (isOwner || isAdmin)
    };

    return { ...diagram, permissions };
  }

  /**
   * Check if current user can edit specific diagram
   */
  canEditDiagram(diagram: BpmnDiagram): boolean {
    return diagram.permissions?.canEdit ?? false;
  }

  /**
   * Check if current user can view specific diagram
   */
  canViewDiagram(diagram: BpmnDiagram): boolean {
    return diagram.permissions?.canView ?? false;
  }

  /**
   * Check if current user can delete specific diagram
   */
  canDeleteDiagram(diagram: BpmnDiagram): boolean {
    return diagram.permissions?.canDelete ?? false;
  }

  // ============= UTILITY METHODS =============

  /**
   * Build query parameters for API calls
   */
  private buildQueryParams(params?: DiagramSearchParams): any {
    if (!params) return {};

    const queryParams: any = {};
    
    Object.keys(params).forEach(key => {
      const value = (params as any)[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams[key] = value.join(',');
        } else {
          queryParams[key] = value.toString();
        }
      }
    });

    return queryParams;
  }

  /**
   * Add diagram to local list
   */
  private addDiagramToList(diagram: BpmnDiagram): void {
    const currentList = this.diagramsListSubject.value;
    this.diagramsListSubject.next([diagram, ...currentList]);
  }

  /**
   * Update diagram in local list
   */
  private updateDiagramInList(updatedDiagram: BpmnDiagram): void {
    const currentList = this.diagramsListSubject.value;
    const index = currentList.findIndex(d => d.id === updatedDiagram.id);
    
    if (index !== -1) {
      const newList = [...currentList];
      newList[index] = updatedDiagram;
      this.diagramsListSubject.next(newList);
    }
  }

  /**
   * Remove diagram from local list
   */
  private removeDiagramFromList(diagramId: number): void {
    const currentList = this.diagramsListSubject.value;
    const newList = currentList.filter(d => d.id !== diagramId);
    this.diagramsListSubject.next(newList);
  }

  /**
   * Handle HTTP errors with improved error messages and logging
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred';

    console.error('BPMN Service Error Details:', {
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
          console.warn('Authentication failed, user may need to re-login');
          // Don't auto-logout here as it might be called during initialization
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          console.warn('User lacks required permissions for this operation');
          // Log current user roles for debugging
          console.debug('User roles:', this.authService.getUserRoles());
          break;
        case 404:
          errorMessage = 'Diagram not found';
          break;
        case 409:
          errorMessage = 'Conflict - diagram may have been modified by another user';
          break;
        case 422:
          errorMessage = 'Invalid diagram data';
          break;
        case 500:
          errorMessage = 'Server error - please try again later';
          break;
        default:
          errorMessage = error.error?.message || `Error: ${error.status}`;
      }
    }

    console.error('BPMN Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.currentDiagramSubject.next(null);
    this.diagramsListSubject.next([]);
  }

  /**
   * Retry failed operations with exponential backoff
   */
  retryOperation<T>(operation: () => Observable<T>, maxRetries: number = 3): Observable<T> {
    return operation().pipe(
      retryWhen(errors =>
        errors.pipe(
          scan((retryCount, error) => {
            if (retryCount >= maxRetries || error.status < 500) {
              throw error;
            }
            return retryCount + 1;
          }, 0),
          delayWhen(retryCount => {
            const delayMs = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying operation in ${delayMs}ms (attempt ${retryCount + 1})`);
            return timer(delayMs);
          }),
          take(maxRetries)
        )
      )
    );
  }
}