import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FileVersionService, FileVersion } from '../../services/file-version.service';

export interface VersionHistoryDialogData {
  fileId: number;
  fileName: string;
  currentVersion?: number;
}


export interface VersionHistoryDialogResult {
  selectedVersion?: FileVersion;
  action?: 'restore' | 'download' | 'compare';
}

@Component({
  selector: 'app-version-history-dialog',
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
  templateUrl: './version-history-dialog.component.html',
  styleUrl: './version-history-dialog.component.css'
})
export class VersionHistoryDialogComponent implements OnInit {
  versions: FileVersion[] = [];
  isLoading: boolean = true;
  selectedVersion: FileVersion | null = null;

  constructor(
    public dialogRef: MatDialogRef<VersionHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VersionHistoryDialogData,
    private fileVersionService: FileVersionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadVersionHistory();
  }

  loadVersionHistory(): void {
    this.isLoading = true;
    this.fileVersionService.getFileVersions(this.data.fileId).subscribe({
      next: (versions) => {
        this.versions = versions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading version history:', error);
        this.showNotification('Error loading version history: ' + error.message, 'error');
        this.isLoading = false;
      }
    });
  }

  selectVersion(version: FileVersion): void {
    this.selectedVersion = version;
  }

  onDownloadVersion(): void {
    if (!this.selectedVersion) {
      this.showNotification('Please select a version to download', 'warning');
      return;
    }

    this.fileVersionService.downloadVersion(this.data.fileId, this.selectedVersion.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.selectedVersion!.fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showNotification('Version downloaded successfully', 'success');
      },
      error: (error) => {
        this.showNotification('Error downloading version: ' + error.message, 'error');
      }
    });
  }

  onRestoreVersion(): void {
    if (!this.selectedVersion) {
      this.showNotification('Please select a version to restore', 'warning');
      return;
    }

    if (this.selectedVersion.isCurrent) {
      this.showNotification('This is already the current version', 'info');
      return;
    }

    this.fileVersionService.restoreVersion(this.data.fileId, this.selectedVersion.id).subscribe({
      next: () => {
        this.showNotification('Version restored successfully', 'success');
        this.dialogRef.close({
          selectedVersion: this.selectedVersion,
          action: 'restore'
        });
      },
      error: (error) => {
        this.showNotification('Error restoring version: ' + error.message, 'error');
      }
    });
  }

  onCompareVersions(): void {
    if (!this.selectedVersion) {
      this.showNotification('Please select a version to compare', 'warning');
      return;
    }

    // TODO: Implement compare functionality
    this.showNotification('Compare functionality will be implemented', 'info');
  }

  onClose(): void {
    this.dialogRef.close();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getVersionBadgeClass(version: FileVersion): string {
    if (version.isCurrent) {
      return 'version-badge current';
    }
    return 'version-badge';
  }

  getVersionIcon(version: FileVersion): string {
    if (version.isCurrent) {
      return 'star';
    }
    return 'history';
  }

  trackByVersionId(index: number, version: FileVersion): any {
    return version.id || index;
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