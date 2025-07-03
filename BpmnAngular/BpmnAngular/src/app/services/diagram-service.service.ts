// import { HttpClient } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { AuthenticationService } from './authentication.service';

// import { BehaviorSubject, Observable, tap, timer, catchError, of, throwError } from 'rxjs';
// import { CustomProperty } from './custom-properties.service';

// export interface DiagramVersion {
//   id: number;
//   versionNumber: number;
//   fileName: string;
//   description?: string;
//   createdTime: Date;
//   createdBy: string;
//   versionNotes?: string;
//   hasMetadata: boolean;
// }

// export interface DiagramChangeTracker {
//   hasUnsavedChanges: boolean;
//   lastSaveTime: Date | null;
//   changeCount: number;
//   lastModificationTime: Date;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class DiagramService {
//   private apiUrl = 'http://localhost:8080/api/v1/diagrams';

//   private currentDiagramSubject = new BehaviorSubject<DiagramFile | null>(null);
//   public currentDiagram$ = this.currentDiagramSubject.asObservable();

//   private lastSaveTimeSubject = new BehaviorSubject<Date | null>(null);
//   public lastSaveTime$ = this.lastSaveTimeSubject.asObservable();

//   private changeTrackerSubject = new BehaviorSubject<DiagramChangeTracker>({
//     hasUnsavedChanges: false,
//     lastSaveTime: null,
//     changeCount: 0,
//     lastModificationTime: new Date()
//   });
//   public changeTracker$ = this.changeTrackerSubject.asObservable();

//   private autoSaveEnabled = true;
//   private autoSaveInterval = 30000; // 30 seconds
//   private changeCount = 0;

//   constructor(
//     private http: HttpClient,
//     private authService: AuthenticationService
//   ) { }

//   /**
//    * Save diagram with complete metadata and automatic versioning
//    */
//   saveDiagramWithMetadata(
//     diagramXml: string,
//     elementColors: { [elementId: string]: { fill?: string; stroke?: string } },
//     customProperties: { [elementId: string]: CustomProperty[] },
//     fileName: string,
//     diagramSettings?: any,
//     fileId?: number,
//     description?: string,
//     tags?: string[]
//   ): Observable<DiagramFile> {

//     const metadata: DiagramMetadata = {
//       elementColors: this.convertColorsToBackendFormat(elementColors),
//       customProperties: this.convertPropertiesToBackendFormat(customProperties),
//       diagramSettings: {
//         zoom: diagramSettings?.zoom || 1,
//         viewBox: diagramSettings?.viewBox || '',
//         theme: diagramSettings?.theme || 'default',
//         gridEnabled: diagramSettings?.gridEnabled || false,
//         snapToGrid: diagramSettings?.snapToGrid || false,
//         lastModified: new Date().toISOString(),
//         version: '2.0',
//         ...diagramSettings
//       }
//     };

//     const diagramFile: DiagramFile = {
//       fileName,
//       content: diagramXml,
//       metadata,
//       description,
//       tags
//     };

//     if (fileId) {
//       diagramFile.id = fileId;
//       // Update existing diagram
//       return this.http.put<DiagramFile>(`${this.apiUrl}/${fileId}`, diagramFile, {
//         headers: this.authService.getAuthHeaders()
//       }).pipe(
//         tap((saved: DiagramFile) => {
//           this.handleSuccessfulSave(saved);
//         }),
//         catchError(error => {
//           console.error('Error updating diagram:', error);
//           throw error;
//         })
//       );
//     } else {
//       // Create new diagram
//       return this.http.post<DiagramFile>(this.apiUrl, diagramFile, {
//         headers: this.authService.getAuthHeaders()
//       }).pipe(
//         tap((saved: DiagramFile) => {
//           this.handleSuccessfulSave(saved);
//         }),
//         catchError(error => {
//           console.error('Error creating diagram:', error);
//           throw error;
//         })
//       );
//     }
//   }

//   /**
//    * Simplified save method for compatibility
//    */
//   saveDiagram(
//     diagramXml: string,
//     elementColors: { [elementId: string]: { fill?: string; stroke?: string } },
//     customProperties: { [elementId: string]: CustomProperty[] },
//     fileName: string,
//     diagramSettings?: any,
//     fileId?: number
//   ): Observable<DiagramFile> {
//     return this.saveDiagramWithMetadata(
//       diagramXml, elementColors, customProperties, fileName, diagramSettings, fileId
//     );
//   }

//   /**
//    * Auto-save functionality with change tracking
//    */
//   autoSave(
//     diagramXml: string,
//     elementColors: { [elementId: string]: { fill?: string; stroke?: string } },
//     customProperties: { [elementId: string]: CustomProperty[] },
//     diagramSettings?: any
//   ): Observable<DiagramFile> | null {
//     const currentDiagram = this.currentDiagramSubject.value;
    
//     if (!this.autoSaveEnabled || !currentDiagram?.id || !currentDiagram?.fileName) {
//       return null;
//     }

//     // Check if there are actual changes to save
//     const tracker = this.changeTrackerSubject.value;
//     if (!tracker.hasUnsavedChanges) {
//       return null;
//     }

//     console.log('Auto-saving diagram with', tracker.changeCount, 'changes...');
    
//     return this.saveDiagramWithMetadata(
//       diagramXml,
//       elementColors,
//       customProperties,
//       currentDiagram.fileName,
//       diagramSettings,
//       currentDiagram.id,
//       currentDiagram.description,
//       currentDiagram.tags
//     ).pipe(
//       tap(() => {
//         console.log('Auto-save completed successfully');
//         this.resetChangeTracker();
//       }),
//       catchError(error => {
//         console.error('Auto-save failed:', error);
//         return of(currentDiagram); // Return current diagram on error
//       })
//     );
//   }

//   /**
//    * Load diagram with complete metadata
//    */
//   loadDiagramWithMetadata(fileId: number): Observable<DiagramFile> {
//     return this.http.get<DiagramFile>(`${this.apiUrl}/${fileId}`, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       tap(diagram => {
//         this.currentDiagramSubject.next(diagram);
//         this.resetChangeTracker();
//       }),
//       catchError(error => {
//         console.error('Error loading diagram:', error);
//         throw error;
//       })
//     );
//   }

//   /**
//    * Load diagram with validation options
//    */
//   loadDiagram(fileId: number, options?: { validateMetadata?: boolean }): Observable<DiagramFile> {
//     return this.loadDiagramWithMetadata(fileId).pipe(
//       tap(diagram => {
//         if (options?.validateMetadata && diagram.metadata) {
//           this.validateMetadata(diagram.metadata);
//         }
//       })
//     );
//   }

//   /**
//    * Get all enhanced diagrams with version information
//    */
//   getAllEnhancedDiagrams(): Observable<DiagramFile[]> {
//     return this.http.get<DiagramFile[]>(this.apiUrl, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       catchError(error => {
//         console.error('Error loading diagrams:', error);
//         return of([]);
//       })
//     );
//   }

//   /**
//    * Delete enhanced diagram
//    */
//   deleteEnhancedDiagram(fileId: number): Observable<void> {
//     return this.http.delete<void>(`${this.apiUrl}/${fileId}`, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       tap(() => {
//         // Clear current diagram if it was deleted
//         const current = this.currentDiagramSubject.value;
//         if (current?.id === fileId) {
//           this.currentDiagramSubject.next(null);
//           this.resetChangeTracker();
//         }
//       }),
//       catchError(error => {
//         console.error('Error deleting diagram:', error);
//         throw error;
//       })
//     );
//   }

//   // =================== VERSION MANAGEMENT ===================

//   /**
//    * Get all versions of a diagram
//    */
//   getDiagramVersions(diagramId: number): Observable<DiagramVersion[]> {
//     return this.http.get<DiagramVersion[]>(`${this.apiUrl}/${diagramId}/versions`, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       catchError(error => {
//         console.error('Error loading diagram versions:', error);
//         return of([]);
//       })
//     );
//   }

//   /**
//    * Create a new version manually
//    */
//   createVersion(diagramId: number, versionNotes?: string): Observable<DiagramVersion> {
//     const params: any = {};
//     if (versionNotes) {
//       params.versionNotes = versionNotes;
//     }

//     return this.http.post<DiagramVersion>(`${this.apiUrl}/${diagramId}/versions`, null, {
//       headers: this.authService.getAuthHeaders(),
//       params
//     }).pipe(
//       catchError(error => {
//         console.error('Error creating version:', error);
//         throw error;
//       })
//     );
//   }

//   /**
//    * Restore a specific version
//    */
//   restoreVersion(diagramId: number, versionNumber: number): Observable<DiagramFile> {
//     return this.http.post<DiagramFile>(`${this.apiUrl}/${diagramId}/versions/${versionNumber}/restore`, null, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       tap(restored => {
//         this.currentDiagramSubject.next(restored);
//         this.resetChangeTracker();
//       }),
//       catchError(error => {
//         console.error('Error restoring version:', error);
//         throw error;
//       })
//     );
//   }

//   /**
//    * Compare two versions
//    */
//   compareVersions(diagramId: number, version1: number, version2: number): Observable<any> {
//     return this.http.get(`${this.apiUrl}/${diagramId}/versions/compare`, {
//       headers: this.authService.getAuthHeaders(),
//       params: { 
//         version1: version1.toString(), 
//         version2: version2.toString() 
//       }
//     }).pipe(
//       catchError(error => {
//         console.error('Error comparing versions:', error);
//         return of(null);
//       })
//     );
//   }

//   // =================== CHANGE TRACKING ===================

//   /**
//    * Mark diagram as modified
//    */
//   markAsModified(): void {
//     this.changeCount++;
//     const tracker = this.changeTrackerSubject.value;
//     this.changeTrackerSubject.next({
//       ...tracker,
//       hasUnsavedChanges: true,
//       changeCount: this.changeCount,
//       lastModificationTime: new Date()
//     });
//   }

//   /**
//    * Reset change tracker after successful save
//    */
//   private resetChangeTracker(): void {
//     this.changeCount = 0;
//     this.changeTrackerSubject.next({
//       hasUnsavedChanges: false,
//       lastSaveTime: new Date(),
//       changeCount: 0,
//       lastModificationTime: new Date()
//     });
//     this.lastSaveTimeSubject.next(new Date());
//   }

//   /**
//    * Handle successful save
//    */
//   private handleSuccessfulSave(saved: DiagramFile): void {
//     this.currentDiagramSubject.next(saved);
//     this.resetChangeTracker();
//   }

//   /**
//    * Get change status
//    */
//   getChangeTracker(): DiagramChangeTracker {
//     return this.changeTrackerSubject.value;
//   }

//   /**
//    * Check if there are unsaved changes
//    */
//   hasUnsavedChanges(): boolean {
//     return this.changeTrackerSubject.value.hasUnsavedChanges;
//   }

//   // =================== EXPORT/IMPORT ===================

//   /**
//    * Export diagram with metadata as JSON
//    */
//   exportDiagramData(diagram: DiagramFile): string {
//     const exportData = {
//       ...diagram,
//       exportedAt: new Date().toISOString(),
//       exportVersion: '2.0'
//     };
//     return JSON.stringify(exportData, null, 2);
//   }

//   /**
//    * Import diagram from JSON data
//    */
//   importDiagramData(jsonData: string): Observable<DiagramFile> {
//     try {
//       const diagramData: DiagramFile = JSON.parse(jsonData);

//       // Validate the imported data
//       if (!diagramData.content || !diagramData.metadata) {
//         throw new Error('Invalid diagram data format - missing content or metadata');
//       }

//       // Remove import-specific fields
//       delete (diagramData as any).exportedAt;
//       delete (diagramData as any).exportVersion;
//       delete diagramData.id; // Remove ID to create new

//       return this.http.post<DiagramFile>(`${this.apiUrl}/import`, diagramData, {
//         headers: this.authService.getAuthHeaders()
//       }).pipe(
//         tap(imported => {
//           this.currentDiagramSubject.next(imported);
//           this.resetChangeTracker();
//         }),
//         catchError(error => {
//           console.error('Error importing diagram:', error);
//           throw error;
//         })
//       );
//     } catch (error) {
//       return throwError(() => new Error('Failed to parse diagram data: ' + error));
//     }
//   }

//   // =================== VALIDATION ===================

//   /**
//    * Validate diagram metadata
//    */
//   validateDiagramMetadata(diagramId: number): Observable<any> {
//     return this.http.post(`${this.apiUrl}/${diagramId}/validate`, null, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       catchError(error => {
//         console.error('Error validating metadata:', error);
//         return of({ valid: false, errors: ['Validation failed'] });
//       })
//     );
//   }

//   /**
//    * Get metadata statistics
//    */
//   getMetadataStatistics(diagramId: number): Observable<any> {
//     return this.http.get(`${this.apiUrl}/${diagramId}/metadata/statistics`, {
//       headers: this.authService.getAuthHeaders()
//     }).pipe(
//       catchError(error => {
//         console.error('Error getting statistics:', error);
//         return of({});
//       })
//     );
//   }

//   // =================== HELPER METHODS ===================

//   /**
//    * Convert frontend colors to backend format
//    */
//   private convertColorsToBackendFormat(colors: { [elementId: string]: { fill?: string; stroke?: string } }): any {
//     const converted: any = {};
//     Object.keys(colors).forEach(elementId => {
//       converted[elementId] = {
//         fill: colors[elementId].fill || null,
//         stroke: colors[elementId].stroke || null
//       };
//     });
//     return converted;
//   }

//   /**
//    * Convert frontend properties to backend format
//    */
//   private convertPropertiesToBackendFormat(properties: { [elementId: string]: CustomProperty[] }): any {
//     const converted: any = {};
//     Object.keys(properties).forEach(elementId => {
//       converted[elementId] = properties[elementId].map(prop => ({
//         id: prop.id,
//         title: prop.title,
//         type: prop.type,
//         value: prop.value,
//         required: prop.required || false,
//         description: prop.description || null,
//         options: prop.options || null,
//         category: prop.category || null,
//         order: prop.order || 0
//       }));
//     });
//     return converted;
//   }

//   /**
//    * Validate metadata structure
//    */
//   private validateMetadata(metadata: DiagramMetadata): { valid: boolean; errors: string[] } {
//     const errors: string[] = [];

//     if (!metadata) {
//       errors.push('Metadata is required');
//       return { valid: false, errors };
//     }

//     // Validate element colors
//     if (metadata.elementColors) {
//       Object.keys(metadata.elementColors).forEach(elementId => {
//         const colors = metadata.elementColors[elementId];
//         if (colors && typeof colors !== 'object') {
//           errors.push(`Invalid color data for element ${elementId}`);
//         }
//       });
//     }

//     // Validate custom properties
//     if (metadata.customProperties) {
//       Object.keys(metadata.customProperties).forEach(elementId => {
//         const props = metadata.customProperties[elementId];
//         if (!Array.isArray(props)) {
//           errors.push(`Invalid properties data for element ${elementId}`);
//         }
//       });
//     }

//     return { valid: errors.length === 0, errors };
//   }

//   // =================== SETTINGS AND STATE MANAGEMENT ===================

//   /**
//    * Get current diagram
//    */
//   getCurrentDiagram(): DiagramFile | null {
//     return this.currentDiagramSubject.value;
//   }

//   /**
//    * Set current diagram
//    */
//   setCurrentDiagram(diagram: DiagramFile | null): void {
//     this.currentDiagramSubject.next(diagram);
//     if (!diagram) {
//       this.resetChangeTracker();
//     }
//   }

//   /**
//    * Get last save time
//    */
//   getLastSaveTime(): Date | null {
//     return this.lastSaveTimeSubject.value;
//   }

//   /**
//    * Check if auto-save is enabled
//    */
//   isAutoSaveEnabled(): boolean {
//     return this.autoSaveEnabled;
//   }

//   /**
//    * Set auto-save enabled state
//    */
//   setAutoSaveEnabled(enabled: boolean): void {
//     this.autoSaveEnabled = enabled;
//   }

//   /**
//    * Set auto-save interval
//    */
//   setAutoSaveInterval(interval: number): void {
//     this.autoSaveInterval = interval;
//   }

//   /**
//    * Get auto-save interval
//    */
//   getAutoSaveInterval(): number {
//     return this.autoSaveInterval;
//   }

//   /**
//    * Create backup of current diagram state
//    */
//   createBackup(): string {
//     const currentDiagram = this.getCurrentDiagram();
//     if (!currentDiagram) {
//       throw new Error('No current diagram to backup');
//     }

//     const backup = {
//       ...currentDiagram,
//       backupCreated: new Date().toISOString(),
//       changeTracker: this.changeTrackerSubject.value
//     };

//     return JSON.stringify(backup, null, 2);
//   }

//   /**
//    * Restore from backup
//    */
//   restoreFromBackup(backupData: string): Observable<DiagramFile> {
//     try {
//       const backup = JSON.parse(backupData);
//       delete backup.backupCreated; // Remove backup metadata
//       delete backup.changeTracker; // Remove change tracker
//       delete backup.id; // Remove ID to create new file

//       return this.http.post<DiagramFile>(`${this.apiUrl}/restore`, backup, {
//         headers: this.authService.getAuthHeaders()
//       }).pipe(
//         tap(restored => {
//           this.currentDiagramSubject.next(restored);
//           this.resetChangeTracker();
//         }),
//         catchError(error => {
//           console.error('Error restoring from backup:', error);
//           throw error;
//         })
//       );
//     } catch (error) {
//       return throwError(() => new Error('Failed to restore from backup: ' + error));
//     }
//   }

//   /**
//    * Clear all cached data
//    */
//   clearCache(): void {
//     this.currentDiagramSubject.next(null);
//     this.lastSaveTimeSubject.next(null);
//     this.resetChangeTracker();
//   }
// }