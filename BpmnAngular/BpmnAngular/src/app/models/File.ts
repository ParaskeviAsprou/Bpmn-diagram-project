export interface AppFile {
    id?: number;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    uploadTime?: string;
    content?: string;
    shortLink?: string;
    base64Data?: string;
    newFile?:string;
}
export interface DiagramFile {
  id?: number;
  fileName: string;
  content: string;
  metadata: DiagramMetadata;
  description?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  versionCount?: number;
  hasVersions?: boolean;
}

export interface DiagramMetadata {
  elementColors: { [elementId: string]: ElementColor };
  customProperties: { [elementId: string]: CustomPropertyData[] };
  diagramSettings: DiagramSettings;
}

export interface ElementColor {
  fill?: string;
  stroke?: string;
}

export interface CustomPropertyData {
  id: string;
  title: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';
  value: any;
  required?: boolean;
  description?: string;
  options?: string[];
  category?: string;
  order?: number;
}

export interface DiagramSettings {
  zoom?: number;
  viewBox?: string;
  theme?: string;
  gridEnabled?: boolean;
  snapToGrid?: boolean;
  lastModified?: string;
  version?: string;
  [key: string]: any; // Allow additional settings
}

export interface DiagramVersion {
  id: number;
  versionNumber: number;
  fileName: string;
  description?: string;
  createdTime: Date;
  createdBy: string;
  versionNotes?: string;
  hasMetadata: boolean;
}

export interface DiagramValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DiagramStatistics {
  totalElements: number;
  coloredElements: number;
  elementsWithProperties: number;
  totalCustomProperties: number;
  lastModified: string;
  diagramVersion: string;
}

export interface DiagramChangeTracker {
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  changeCount: number;
  lastModificationTime: Date;
}

export interface DiagramExportOptions {
  format: 'xml' | 'svg' | 'png' | 'pdf' | 'json';
  includeMetadata?: boolean;
  includeVersionHistory?: boolean;
}

export interface DiagramImportResult {
  success: boolean;
  diagram?: DiagramFile;
  errors?: string[];
  warnings?: string[];
}

export interface VersionComparisonResult {
  diagramId: number;
  version1: number;
  version2: number;
  hasDifferences: boolean;
  differencesCount: number;
  differences?: {
    type: 'content' | 'metadata' | 'properties';
    description: string;
    elementId?: string;
  }[];
}

// Helper type for creating new diagrams
export type CreateDiagramRequest = Omit<DiagramFile, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'versionCount' | 'hasVersions'>;

// Helper type for updating diagrams
export type UpdateDiagramRequest = Partial<DiagramFile> & { id: number };

// Utility functions
export class DiagramFileUtils {
  
  /**
   * Create a default metadata object
   */
  static createDefaultMetadata(): DiagramMetadata {
    return {
      elementColors: {},
      customProperties: {},
      diagramSettings: {
        zoom: 1,
        viewBox: '',
        theme: 'default',
        gridEnabled: false,
        snapToGrid: false,
        lastModified: new Date().toISOString(),
        version: '2.0'
      }
    };
  }

  /**
   * Validate diagram file structure
   */
  static validateDiagramFile(diagram: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!diagram.fileName) {
      errors.push('File name is required');
    }

    if (!diagram.content) {
      errors.push('Content is required');
    }

    if (!diagram.metadata) {
      errors.push('Metadata is required');
    } else {
      if (!diagram.metadata.elementColors) {
        errors.push('Element colors metadata is required');
      }
      if (!diagram.metadata.customProperties) {
        errors.push('Custom properties metadata is required');
      }
      if (!diagram.metadata.diagramSettings) {
        errors.push('Diagram settings metadata is required');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Merge metadata objects
   */
  static mergeMetadata(base: DiagramMetadata, overlay: Partial<DiagramMetadata>): DiagramMetadata {
    return {
      elementColors: { ...base.elementColors, ...overlay.elementColors },
      customProperties: { ...base.customProperties, ...overlay.customProperties },
      diagramSettings: { ...base.diagramSettings, ...overlay.diagramSettings }
    };
  }

  /**
   * Calculate diagram statistics from metadata
   */
  static calculateStatistics(diagram: DiagramFile): DiagramStatistics {
    const metadata = diagram.metadata;
    
    const coloredElements = Object.keys(metadata.elementColors || {}).length;
    
    let elementsWithProperties = 0;
    let totalCustomProperties = 0;
    
    if (metadata.customProperties) {
      elementsWithProperties = Object.keys(metadata.customProperties).length;
      totalCustomProperties = Object.values(metadata.customProperties)
        .reduce((total, props) => total + props.length, 0);
    }

    // Estimate total elements from content (simplified)
    const totalElements = diagram.content ? 
      (diagram.content.match(/<bpmn:/g) || []).length : 0;

    return {
      totalElements,
      coloredElements,
      elementsWithProperties,
      totalCustomProperties,
      lastModified: diagram.updatedAt?.toString() || 'Unknown',
      diagramVersion: metadata.diagramSettings?.version || '1.0'
    };
  }

  /**
   * Generate file name with timestamp
   */
  static generateTimestampedFileName(baseName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nameWithoutExt = baseName.replace(/\.(bpmn|xml)$/, '');
    return `${nameWithoutExt}_${timestamp}.bpmn`;
  }

  /**
   * Check if diagram has specific feature
   */
  static hasFeature(diagram: DiagramFile, feature: 'colors' | 'properties' | 'versions'): boolean {
    switch (feature) {
      case 'colors':
        return Object.keys(diagram.metadata?.elementColors || {}).length > 0;
      case 'properties':
        return Object.keys(diagram.metadata?.customProperties || {}).length > 0;
      case 'versions':
        return (diagram.versionCount || 0) > 0;
      default:
        return false;
    }
  }

  /**
   * Create backup filename
   */
  static createBackupFileName(originalName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nameWithoutExt = originalName.replace(/\.(bpmn|xml)$/, '');
    return `${nameWithoutExt}_backup_${timestamp}.json`;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}