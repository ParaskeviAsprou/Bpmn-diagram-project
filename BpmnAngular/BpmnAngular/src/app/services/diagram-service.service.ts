import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { DiagramFile, DiagramMetadata } from '../models/DiagramFile';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CustomProperty } from './custom-properties.service';

@Injectable({
  providedIn: 'root'
})
export class DiagramService {
  private apiUrl = 'http://localhost:8080/api/v1/enhanced-diagrams';

  private currentDiagramSubject = new BehaviorSubject<DiagramFile | null>(null);
  public currentDiagram$ = this.currentDiagramSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) { }

  /**
   * Save diagram with all metadata (colors, properties, etc.)
   */
  saveDiagramWithMetadata(
    diagramXml: string,
    elementColors: { [elementId: string]: { fill?: string; stroke?: string } },
    customProperties: { [elementId: string]: CustomProperty[] },
    fileName: string,
    diagramSettings?: any,
    fileId?: number
  ): Observable<DiagramFile> {

    const metadata: DiagramMetadata = {
      elementColors,
      customProperties,
      diagramSettings: {
        zoom: diagramSettings?.zoom || 1,
        viewBox: diagramSettings?.viewBox || '',
        lastModified: new Date().toISOString(),
        version: '1.0',
        ...diagramSettings
      }
    };

    const diagramFile: DiagramFile = {
      fileName,
      content: diagramXml,
      metadata
    };

    if (fileId) {
      // Update existing file
      return this.http.put<DiagramFile>(`${this.apiUrl}/${fileId}`, diagramFile, {
        headers: this.authService.getAuthHeaders()
      }).pipe(
        tap((saved: DiagramFile) => this.currentDiagramSubject.next(saved))
      )
    } else {
      // Create new file
      return this.http.post<DiagramFile>(this.apiUrl, diagramFile, {
        headers: this.authService.getAuthHeaders()
      }).pipe(
        tap((saved: DiagramFile) => this.currentDiagramSubject.next(saved))
      )
    }
  }

  /**
   * Load diagram with all metadata
   */
  loadDiagramWithMetadata(fileId: number): Observable<DiagramFile> {
    return this.http.get<DiagramFile>(`${this.apiUrl}/${fileId}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      tap(diagram => this.currentDiagramSubject.next(diagram))
    );
  }

  /**
   * Get all enhanced diagrams
   */
  getAllEnhancedDiagrams(): Observable<DiagramFile[]> {
    return this.http.get<DiagramFile[]>(this.apiUrl, {
      headers: this.authService.getAuthHeaders()
    });
  }

  /**
   * Delete enhanced diagram
   */
  deleteEnhancedDiagram(fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${fileId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  /**
   * Export diagram with metadata as JSON
   */
  exportDiagramData(diagram: DiagramFile): string {
    return JSON.stringify(diagram, null, 2);
  }

  /**
   * Import diagram from JSON data
   */
  importDiagramData(jsonData: string): Observable<DiagramFile> {
    try {
      const diagramData: DiagramFile = JSON.parse(jsonData);

      // Validate the imported data
      if (!diagramData.content || !diagramData.metadata) {
        throw new Error('Invalid diagram data format');
      }

      return this.http.post<DiagramFile>(`${this.apiUrl}/import`, diagramData, {
        headers: this.authService.getAuthHeaders()
      });
    } catch (error) {
      throw new Error('Failed to parse diagram data: ' + error);
    }
  }

  /**
   * Create metadata object from current modeler state
   */
  createMetadataFromModelerState(
    elementColors: { [elementId: string]: { fill?: string; stroke?: string } },
    customProperties: { [elementId: string]: CustomProperty[] },
    modelerInstance?: any
  ): DiagramMetadata {
    let diagramSettings: any = {
      lastModified: new Date().toISOString(),
      version: '1.0'
    };

    // Extract additional settings from modeler if available
    if (modelerInstance) {
      try {
        const canvas = modelerInstance.get('canvas');
        const zoom = canvas.zoom();
        const viewbox = canvas.viewbox();

        diagramSettings = {
          ...diagramSettings,
          zoom,
          viewBox: `${viewbox.x} ${viewbox.y} ${viewbox.width} ${viewbox.height}`
        };
      } catch (error) {
        console.warn('Could not extract modeler settings:', error);
      }
    }

    return {
      elementColors,
      customProperties,
      diagramSettings
    };
  }

  /**
   * Apply metadata to modeler
   */
  applyMetadataToModeler(
    metadata: DiagramMetadata,
    modelerInstance: any,
    colorService: any,
    customPropertyService: any
  ): void {
    try {
      // Apply element colors
      if (metadata.elementColors && modelerInstance.get) {
        const elementRegistry = modelerInstance.get('elementRegistry');
        const modeling = modelerInstance.get('modeling');

        Object.keys(metadata.elementColors).forEach(elementId => {
          const element = elementRegistry.get(elementId);
          if (element) {
            const colors = metadata.elementColors[elementId];
            modeling.setColor(element, colors);
          }
        });
      }

      // Apply custom properties
      if (metadata.customProperties && customPropertyService) {
        Object.keys(metadata.customProperties).forEach(elementId => {
          const properties = metadata.customProperties[elementId];
          customPropertyService.setElementProperties(elementId, properties);
        });
      }

      // Apply diagram settings
      if (metadata.diagramSettings && modelerInstance.get) {
        const canvas = modelerInstance.get('canvas');

        if (metadata.diagramSettings.zoom) {
          canvas.zoom(metadata.diagramSettings.zoom);
        }

        if (metadata.diagramSettings.viewBox) {
          const [x, y, width, height] = metadata.diagramSettings.viewBox.split(' ').map(Number);
          canvas.viewbox({ x, y, width, height });
        }
      }

    } catch (error) {
      console.error('Error applying metadata to modeler:', error);
    }
  }

  /**
   * Get current diagram
   */
  getCurrentDiagram(): DiagramFile | null {
    return this.currentDiagramSubject.value;
  }

  /**
   * Set current diagram
   */
  setCurrentDiagram(diagram: DiagramFile | null): void {
    this.currentDiagramSubject.next(diagram);
  }

  /**
   * Validate diagram metadata
   */
  validateMetadata(metadata: DiagramMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata) {
      errors.push('Metadata is required');
      return { valid: false, errors };
    }

    if (!metadata.diagramSettings) {
      errors.push('Diagram settings are required');
    }

    if (!metadata.elementColors) {
      metadata.elementColors = {};
    }

    if (!metadata.customProperties) {
      metadata.customProperties = {};
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Merge metadata from multiple sources
   */
  mergeMetadata(base: DiagramMetadata, overlay: Partial<DiagramMetadata>): DiagramMetadata {
    return {
      elementColors: { ...base.elementColors, ...overlay.elementColors },
      customProperties: { ...base.customProperties, ...overlay.customProperties },
      diagramSettings: { ...base.diagramSettings, ...overlay.diagramSettings }
    };
  }

  /**
   * Create backup of current diagram state
   */
  createBackup(): string {
    const currentDiagram = this.getCurrentDiagram();
    if (!currentDiagram) {
      throw new Error('No current diagram to backup');
    }

    const backup = {
      ...currentDiagram,
      backupCreated: new Date().toISOString()
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restore from backup
   */
  restoreFromBackup(backupData: string): Observable<DiagramFile> {
    try {
      const backup = JSON.parse(backupData);
      delete backup.backupCreated; // Remove backup metadata
      delete backup.id; // Remove ID to create new file

      return this.http.post<DiagramFile>(`${this.apiUrl}/restore`, backup, {
        headers: this.authService.getAuthHeaders()
      });
    } catch (error) {
      throw new Error('Failed to restore from backup: ' + error);
    }
  }
}
