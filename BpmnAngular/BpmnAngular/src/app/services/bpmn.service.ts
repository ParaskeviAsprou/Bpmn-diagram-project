import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, EMPTY, from } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { AuthenticationService } from './authentication.service';
import { FileService } from './file.service';
import { AppFile } from '../models/File';

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
  folderId?: number;
  customProperties?: string;
  elementColors?: string;
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
  folderId?: number;
  customProperties?: string;
  elementColors?: string;
}

export interface DiagramUpdateRequest extends DiagramCreateRequest {
  id: number;
  version: number;
}

export interface BpmnSavePayload {
  name: string;
  xml: string;
  customProperties?: string;
  elementColors?: string;
  folderId?: number | undefined; // Allow undefined
  overwrite?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BpmnService {
  private currentDiagramSubject = new BehaviorSubject<BpmnDiagram | null>(null);
  private diagramsListSubject = new BehaviorSubject<BpmnDiagram[]>([]);
  
  public currentDiagram$ = this.currentDiagramSubject.asObservable();
  public diagramsList$ = this.diagramsListSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService,
    private fileService: FileService
  ) {
    // Initialize with user diagrams if logged in
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
   * Save BPMN diagram using FileService
   */
  saveBpmnDiagram(payload: BpmnSavePayload): Observable<AppFile> {
    if (!this.authService.canEdit()) {
      return throwError(() => new Error('Insufficient permissions to save diagrams'));
    }

    console.log('BpmnService.saveBpmnDiagram called with:', payload);

    return this.fileService.saveBpmnDiagram({
      name: payload.name,
      xml: payload.xml,
      customProperties: payload.customProperties || '{}',
      elementColors: payload.elementColors || '{}',
      folderId: payload.folderId,
      overwrite: payload.overwrite || false
    }).pipe(
      tap(savedFile => {
        console.log('BPMN diagram saved successfully:', savedFile);
        // Convert AppFile to BpmnDiagram if needed for compatibility
        const diagram = this.convertFileToDiagram(savedFile);
        this.setCurrentDiagram(diagram);
        this.addDiagramToList(diagram);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update existing BPMN diagram
   */
  updateBpmnDiagram(fileId: number, xml: string, customProperties?: string, elementColors?: string): Observable<AppFile> {
    if (!this.authService.canEdit()) {
      return throwError(() => new Error('Insufficient permissions to update diagrams'));
    }

    return this.fileService.updateFileContent(
      fileId,
      xml,
      customProperties || '{}',
      elementColors || '{}'
    ).pipe(
      tap(updatedFile => {
        console.log('BPMN diagram updated successfully:', updatedFile);
        const diagram = this.convertFileToDiagram(updatedFile);
        this.setCurrentDiagram(diagram);
        this.updateDiagramInList(diagram);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get diagram by ID
   */
  getDiagram(id: number): Observable<BpmnDiagram> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to view diagrams'));
    }

    return this.fileService.getFileById(id).pipe(
      map(file => this.convertFileToDiagram(file)),
      tap(diagram => this.setCurrentDiagram(diagram)),
      catchError(this.handleError)
    );
  }

  /**
   * Get all user diagrams
   */
  getUserDiagrams(): Observable<BpmnDiagram[]> {
    if (!this.authService.canView()) {
      console.warn('User lacks permission to view diagrams');
      return EMPTY;
    }

    return this.fileService.getFiles().pipe(
      map(files => files
        .filter(file => this.isBpmnFile(file))
        .map(file => this.convertFileToDiagram(file))
      ),
      tap(diagrams => this.diagramsListSubject.next(diagrams)),
      catchError((error) => {
        console.warn('Failed to load user diagrams:', error.message);
        return EMPTY;
      })
    );
  }

  /**
   * Get diagrams in specific folder
   */
  getDiagramsInFolder(folderId: number): Observable<BpmnDiagram[]> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to view diagrams'));
    }

    return this.fileService.getFilesInFolder(folderId).pipe(
      map(files => files
        .filter(file => this.isBpmnFile(file))
        .map(file => this.convertFileToDiagram(file))
      ),
      catchError(this.handleError)
    );
  }

  /**
   * Get root diagrams (not in any folder)
   */
  getRootDiagrams(): Observable<BpmnDiagram[]> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to view diagrams'));
    }

    return this.fileService.getRootFiles().pipe(
      map(files => files
        .filter(file => this.isBpmnFile(file))
        .map(file => this.convertFileToDiagram(file))
      ),
      catchError(this.handleError)
    );
  }

  /**
   * Delete diagram
   */
  deleteDiagram(id: number): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('User not authenticated'));
    }

    if (!this.authService.isAdmin()) {
      return throwError(() => new Error('Insufficient permissions to delete diagrams'));
    }

    return this.fileService.deleteFile(id).pipe(
      tap(() => {
        this.removeDiagramFromList(id);
        if (this.currentDiagramSubject.value?.id === id) {
          this.setCurrentDiagram(null);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Export diagram
   */
  exportDiagram(id: number, format: 'xml' | 'svg' | 'png' | 'pdf'): Observable<Blob> {
    if (!this.authService.canView()) {
      return throwError(() => new Error('Insufficient permissions to export diagrams'));
    }

    return this.fileService.exportFile(id, format).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create new diagram from template
   */
  createFromTemplate(name: string, templateXml: string, folderId?: number | undefined): Observable<AppFile> {
    return this.saveBpmnDiagram({
      name: name,
      xml: templateXml,
      customProperties: '{}',
      elementColors: '{}',
      folderId: folderId,
      overwrite: false
    });
  }

  /**
   * Duplicate existing diagram
   */
  duplicateDiagram(sourceId: number, newName: string, folderId?: number | undefined): Observable<AppFile> {
    return this.getDiagram(sourceId).pipe(
      switchMap(sourceDiagram => {
        return this.saveBpmnDiagram({
          name: newName,
          xml: sourceDiagram.xml,
          customProperties: sourceDiagram.customProperties || '{}',
          elementColors: sourceDiagram.elementColors || '{}',
          folderId: folderId,
          overwrite: false
        });
      })
    );
  }

  /**
   * Check if file name exists in folder
   */
  checkFileExists(fileName: string, folderId?: number | undefined): Observable<boolean> {
    return from(this.fileService.fileExistsInFolder(fileName, folderId));
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
      }
    });
  }

  // ============= UTILITY METHODS =============

  /**
   * Convert AppFile to BpmnDiagram for compatibility
   */
  private convertFileToDiagram(file: AppFile): BpmnDiagram {
    return {
      id: file.id!,
      name: file.fileName,
      description: file.description,
      xml: file.xml || file.fileData || '',
      createdBy: file.createdBy || 'unknown',
      createdAt: new Date(file.uploadTime || Date.now()),
      updatedAt: new Date(file.updatedTime || Date.now()),
      version: file.currentVersion || 1,
      isPublic: false,
      tags: file.tags ? file.tags.split(',') : [],
      folderId: file.folderId,
      customProperties: file.customProperties,
      elementColors: file.elementColors,
      permissions: this.calculatePermissions(file)
    };
  }

  /**
   * Calculate permissions for a diagram based on current user
   */
  private calculatePermissions(file: AppFile): DiagramPermissions {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      return { canView: false, canEdit: false, canDelete: false, canShare: false };
    }

    const isOwner = file.createdBy === currentUser.username;
    const isAdmin = this.authService.isAdmin();
    const isModeler = this.authService.isModeler();
    const canView = this.authService.canView();

    return {
      canView: canView,
      canEdit: isModeler && (isOwner || isAdmin),
      canDelete: isAdmin,
      canShare: isModeler && (isOwner || isAdmin)
    };
  }

  /**
   * Check if file is a BPMN file
   */
  private isBpmnFile(file: AppFile): boolean {
    if (!file.fileName) return false;
    const lowerName = file.fileName.toLowerCase();
    return lowerName.endsWith('.bpmn') || 
           lowerName.endsWith('.xml') || 
           (typeof file.fileType === 'string' && file.fileType.includes('xml'));
  }

  /**
   * Add diagram to local list
   */
  private addDiagramToList(diagram: BpmnDiagram): void {
    const currentList = this.diagramsListSubject.value;
    const existingIndex = currentList.findIndex(d => d.id === diagram.id);
    
    if (existingIndex !== -1) {
      // Update existing
      const newList = [...currentList];
      newList[existingIndex] = diagram;
      this.diagramsListSubject.next(newList);
    } else {
      // Add new
      this.diagramsListSubject.next([diagram, ...currentList]);
    }
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
   * Handle HTTP errors with improved error messages
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
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 401:
          errorMessage = 'Unauthorized - please log in again';
          break;
        case 403:
          errorMessage = 'Forbidden - insufficient permissions';
          break;
        case 404:
          errorMessage = 'Diagram not found';
          break;
        case 409:
          errorMessage = 'Conflict - diagram may already exist';
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
   * Validate BPMN XML
   */
  validateBpmnXml(xml: string): boolean {
    if (!xml || xml.trim().length === 0) return false;
    
    try {
      return xml.includes('bpmn:definitions') && 
             (xml.includes('bpmn:process') || xml.includes('bpmn:collaboration'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate unique file name
   */
  generateUniqueFileName(baseName: string, existingNames: string[]): string {
    if (!existingNames.includes(baseName)) {
      return baseName;
    }

    const nameWithoutExt = baseName.replace(/\.(bpmn|xml)$/, '');
    const extension = baseName.includes('.') ? baseName.substring(baseName.lastIndexOf('.')) : '.bpmn';
    
    let counter = 1;
    let uniqueName = `${nameWithoutExt}_${counter}${extension}`;
    
    while (existingNames.includes(uniqueName)) {
      counter++;
      uniqueName = `${nameWithoutExt}_${counter}${extension}`;
    }
    
    return uniqueName;
  }
}