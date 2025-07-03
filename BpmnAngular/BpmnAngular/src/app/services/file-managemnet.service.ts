import { Injectable } from '@angular/core';

export interface FileInfo {
  name: string;
  path: string;
  lastModified: Date;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileManagerService {
  private currentFolder: string = '';
  private folderContexts: Map<string, any> = new Map();

  setCurrentFolder(folderPath: string): void {
    this.currentFolder = folderPath;
  }

  getCurrentFolder(): string {
    return this.currentFolder;
  }

  async checkFileExists(fileName: string): Promise<boolean> {
    try {
      // Implement your file system check here
      // This is a placeholder - adapt to your storage system
      const fullPath = this.getFullPath(fileName);
      return localStorage.getItem(fullPath) !== null;
    } catch {
      return false;
    }
  }

  async promptForOverwrite(fileName: string): Promise<'overwrite' | 'rename' | 'cancel'> {
    return new Promise((resolve) => {
      const result = confirm(
        `File "${fileName}" already exists. Do you want to overwrite it?\n\n` +
        `Click OK to overwrite, Cancel to rename.`
      );
      
      if (result) {
        resolve('overwrite');
      } else {
        const newName = prompt('Enter a new file name:', fileName);
        resolve(newName ? 'rename' : 'cancel');
      }
    });
  }

  generateUniqueFileName(baseName: string): string {
    const extension = baseName.includes('.') ? baseName.split('.').pop() : '';
    const nameWithoutExt = baseName.replace(`.${extension}`, '');
    let counter = 1;
    let uniqueName = baseName;

    while (this.checkFileExists(uniqueName)) {
      uniqueName = `${nameWithoutExt}_${counter}.${extension}`;
      counter++;
    }

    return uniqueName;
  }

  private getFullPath(fileName: string): string {
    return `${this.currentFolder}/${fileName}`;
  }

  // Folder isolation methods
  saveFolderContext(folderPath: string, context: any): void {
    this.folderContexts.set(folderPath, { ...context });
  }

  loadFolderContext(folderPath: string): any {
    return this.folderContexts.get(folderPath) || {};
  }

  clearFolderContext(folderPath: string): void {
    this.folderContexts.delete(folderPath);
  }
}