import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FolderService } from '../../services/folder.service';
import { Folder } from '../../models/Folder';

export interface FolderSelectionDialogData {
  title?: string;
  message?: string;
  currentFolderId?: number;
}

export interface FolderSelectionDialogResult {
  selectedFolder: Folder | null;
  action: 'select' | 'cancel';
}

@Component({
  selector: 'app-folder-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './folder-selection-dialog.component.html',
  styleUrl: './folder-selection-dialog.component.css'
})
export class FolderSelectionDialogComponent implements OnInit {
  folders: Folder[] = [];
  isLoading: boolean = true;
  selectedFolder: Folder | null = null;
  rootFolder: Folder = {
    id: 0,
    folderName: 'Root Folder',
    description: 'Save in the root directory',
    createdTime: new Date().toISOString(),
    isRoot: true
  };

  constructor(
    public dialogRef: MatDialogRef<FolderSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FolderSelectionDialogData,
    private folderService: FolderService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders(): void {
    this.isLoading = true;
    this.folderService.getAllSimpleFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
        this.isLoading = false;
        
        // Set initial selection
        if (this.data.currentFolderId) {
          this.selectedFolder = this.folders.find(f => f.id === this.data.currentFolderId) || null;
        } else {
          this.selectedFolder = this.rootFolder;
        }
      },
      error: (error) => {
        console.error('Error loading folders:', error);
        this.showNotification('Error loading folders: ' + error.message, 'error');
        this.isLoading = false;
      }
    });
  }

  selectFolder(folder: Folder): void {
    this.selectedFolder = folder;
  }

  selectRootFolder(): void {
    this.selectedFolder = this.rootFolder;
  }

  onConfirm(): void {
    this.dialogRef.close({
      selectedFolder: this.selectedFolder,
      action: 'select'
    });
  }

  onCancel(): void {
    this.dialogRef.close({
      selectedFolder: null,
      action: 'cancel'
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getFolderIcon(folder: Folder): string {
    return folder.isRoot ? 'home' : 'folder';
  }

  getFolderDisplayName(folder: Folder): string {
    return folder.isRoot ? 'Root Folder' : folder.folderName;
  }

  trackByFolderId(index: number, folder: Folder): any {
    return folder.id || index;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
