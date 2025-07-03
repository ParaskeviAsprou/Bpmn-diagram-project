export interface AppFile {
  id?: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileData?: string;
  xml?: string;
  description?: string;
  folderId?: number;
  tags?: string;
  createdBy?: string;
  updatedBy?: string;
  uploadTime?: Date | string;
  updatedTime?: Date | string;
  currentVersion?: number;
  customProperties?: string;
  elementColors?: string;
  
  // Transient fields
  base64Data?: string;
  
  // Navigation property
  folder?: Folder;
}

export interface Folder {
  id?: number;
  folderName: string;
  description?: string;
  createdTime?: Date | string;
  updatedTime?: Date | string;
  createdBy?: string;
  folderPath?: string;
  isRoot?: boolean;
  parentFolder?: Folder;
  subFolders?: Folder[];
  files?: AppFile[];
  fileCount?: number;
  subFolderCount?: number;
  totalSize?: number;
}

export interface FileVersion {
  id?: number;
  originalFileId: number;
  versionNumber: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileData?: string;
  xml?: string;
  versionNotes?: string;
  isCurrent?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdTime?: Date | string;
  customProperties?: string;
  elementColors?: string;
}

export interface BpmnDiagramData {
  xml: string;
  customProperties?: { [elementId: string]: any };
  elementColors?: { [elementId: string]: { fill?: string; stroke?: string } };
}

export interface SaveDiagramOptions {
  fileName: string;
  folderId?: number;
  overwrite?: boolean;
  description?: string;
  tags?: string;
}

export interface DiagramExportOptions {
  format: 'xml' | 'svg' | 'png' | 'pdf';
  fileName?: string;
  includeMetadata?: boolean;
}

// Utility functions for working with files
export class FileUtils {
  
  static isBpmnFile(file: AppFile): boolean {
    if (!file.fileName) return false;
    const lowerName = file.fileName.toLowerCase();
    return lowerName.endsWith('.bpmn') || 
           lowerName.endsWith('.xml') || 
           (typeof file.fileType === 'string' && file.fileType.includes('xml'));
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileExtension(fileName: string): string {
    if (!fileName) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';
  }

  static getFileNameWithoutExtension(fileName: string): string {
    if (!fileName) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }

  static generateUniqueFileName(baseName: string, extension: string, existingFiles: AppFile[]): string {
    const nameWithoutExt = this.getFileNameWithoutExtension(baseName);
    const ext = extension.startsWith('.') ? extension : '.' + extension;
    
    let counter = 1;
    let uniqueName = nameWithoutExt + ext;
    
    while (existingFiles.some(f => f.fileName === uniqueName)) {
      uniqueName = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }
    
    return uniqueName;
  }

  static extractBpmnData(file: AppFile): BpmnDiagramData {
    const xml = file.xml || (file.base64Data ? atob(file.base64Data) : file.fileData || '');
    
    let customProperties = {};
    let elementColors = {};
    
    try {
      if (file.customProperties) {
        customProperties = JSON.parse(file.customProperties);
      }
    } catch (e) {
      console.warn('Failed to parse custom properties:', e);
    }
    
    try {
      if (file.elementColors) {
        elementColors = JSON.parse(file.elementColors);
      }
    } catch (e) {
      console.warn('Failed to parse element colors:', e);
    }
    
    return {
      xml,
      customProperties,
      elementColors
    };
  }

  static createBpmnFileFromData(
    fileName: string, 
    data: BpmnDiagramData, 
    options?: Partial<AppFile>
  ): AppFile {
    return {
      fileName,
      fileType: 'bpmn',
      xml: data.xml,
      fileData: data.xml,
      fileSize: data.xml ? data.xml.length : 0,
      customProperties: JSON.stringify(data.customProperties || {}),
      elementColors: JSON.stringify(data.elementColors || {}),
      currentVersion: 1,
      uploadTime: new Date(),
      updatedTime: new Date(),
      ...options
    };
  }

  static isValidBpmnXml(xml: string): boolean {
    if (!xml || xml.trim().length === 0) return false;
    
    try {
      // Basic validation - check for required BPMN elements
      return xml.includes('bpmn:definitions') && 
             (xml.includes('bpmn:process') || xml.includes('bpmn:collaboration'));
    } catch (e) {
      return false;
    }
  }

  static sanitizeFileName(fileName: string): string {
    if (!fileName) return 'untitled';
    
    // Remove or replace invalid characters
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid characters with underscore
      .replace(/\s+/g, '_')          // Replace spaces with underscore
      .replace(/_+/g, '_')           // Replace multiple underscores with single
      .replace(/^_|_$/g, '')         // Remove leading/trailing underscores
      .substring(0, 255);            // Limit length
  }

  static getFolderPath(folder: Folder): string {
    if (!folder) return '/';
    
    const path: string[] = [];
    let current: Folder | undefined = folder;
    
    while (current) {
      path.unshift(current.folderName);
      current = current.parentFolder;
    }
    
    return '/' + path.join('/');
  }

  static sortFilesByName(files: AppFile[], ascending: boolean = true): AppFile[] {
    return [...files].sort((a, b) => {
      const nameA = (a.fileName || '').toLowerCase();
      const nameB = (b.fileName || '').toLowerCase();
      return ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }

  static sortFilesByDate(files: AppFile[], ascending: boolean = false): AppFile[] {
    return [...files].sort((a, b) => {
      const dateA = new Date(a.updatedTime || a.uploadTime || 0);
      const dateB = new Date(b.updatedTime || b.uploadTime || 0);
      return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  }

  static sortFilesBySize(files: AppFile[], ascending: boolean = false): AppFile[] {
    return [...files].sort((a, b) => {
      const sizeA = a.fileSize || 0;
      const sizeB = b.fileSize || 0;
      return ascending ? sizeA - sizeB : sizeB - sizeA;
    });
  }

  static filterBpmnFiles(files: AppFile[]): AppFile[] {
    return files.filter(file => this.isBpmnFile(file));
  }

  static searchFiles(files: AppFile[], searchTerm: string): AppFile[] {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return files;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return files.filter(file => 
      (file.fileName && file.fileName.toLowerCase().includes(term)) ||
      (file.description && file.description.toLowerCase().includes(term)) ||
      (file.tags && file.tags.toLowerCase().includes(term)) ||
      (file.createdBy && file.createdBy.toLowerCase().includes(term))
    );
  }
}