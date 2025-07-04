import { Component, ViewChild, ElementRef, OnInit, OnDestroy, inject, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';
import { AppFile } from '../../models/File';
import feather from 'feather-icons';
import { AuthenticationService, User } from '../../services/authentication.service';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogBoxComponent } from '../dialog-box/dialog-box.component';
import { Folder } from '../../models/Folder';
import { FolderService } from '../../services/folder.service';
import { CreateFolderDialogComponent } from '../create-folder-dialog/create-folder-dialog.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExportDialogComponent, ExportDialogData, ExportDialogResult } from '../export-dialog-result/export-dialog-result.component';

interface BreadcrumbItem {
  id: number | null;
  name: string;
  path: string;
}

@Component({
  selector: 'app-file-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatGridListModule,
    MatButtonModule,
    MatToolbarModule,
    MatCardModule,
    MatMenuModule,
    MatBadgeModule
  ],
  templateUrl: './file-list.component.html',
  styleUrl: './file-list.component.css'
})
export class FileListComponent implements OnInit, OnDestroy {
  @ViewChild('listfiles', { static: true }) listfiles!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  @Output() delete = new EventEmitter<boolean>();

  appFile: AppFile[] = [];
  folders: Folder[] = [];

  isLoading = true;
  currentFolder: Folder | null = null;
  breadcrumbs: BreadcrumbItem[] = [];
  currentUser: User | null = null;

  // Permission flags
  canView: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;
  canCreate: boolean = false;
  isViewerOnly: boolean = false;

  readonly popup = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  constructor(
    private fileService: FileService,
    private folderService: FolderService,
    public authenticationService: AuthenticationService,
    private router: Router
  ) { }

ngOnInit() {
  this.initializePermissions();
  this.authenticationService.currentUser$
    .pipe(takeUntil(this.destroy$))
    .subscribe((user: User | null) => {
      this.currentUser = user;
      this.initializePermissions();
    });

  setTimeout(() => {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }, 100);

  this.debugUserPermissions();

  if (this.canView) {
    // ΔΙΟΡΘΩΣΗ: Ξεκινάμε πάντα από τον root folder (null)
    this.loadCurrentFolder(null);
  } else {
    this.isLoading = false;
    console.warn('User cannot view files - insufficient permissions');
  }
}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializePermissions(): void {
    this.currentUser = this.authenticationService.getCurrentUser();

    this.canView = this.authenticationService.canView();
    this.canEdit = this.authenticationService.canEdit();
    this.canCreate = this.authenticationService.canEdit();
    this.canDelete = this.authenticationService.isAdmin();

    this.isViewerOnly = this.authenticationService.isViewer() &&
      !this.authenticationService.isModeler() &&
      !this.authenticationService.isAdmin();
  }

  // =================== FOLDER CREATION ===================
openCreateFolderDialog(): void {
  if (!this.canCreate) {
    this.showNotification('You do not have permission to create folders.', 'error');
    return;
  }

  // ΔΙΟΡΘΩΣΗ: Σωστό parent folder ID
  const parentFolderId = this.currentFolder?.id || null;
  const parentFolderName = this.currentFolder?.folderName || 'Root';

  console.log('Opening create folder dialog for parent:', parentFolderId);

  const dialogRef = this.popup.open(CreateFolderDialogComponent, {
    width: '400px',
    data: {
      parentFolderId: parentFolderId,
      parentFolderName: parentFolderName
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    console.log('Create folder dialog closed with result:', result);

    if (result === true) {
      this.showNotification('Folder created successfully', 'success');
      console.log('Reloading folder contents after creation');
      // ΔΙΟΡΘΩΣΗ: reload με το σωστό folder ID
      this.loadCurrentFolder(this.currentFolder?.id || null);
    } else if (result === false) {
      console.log('Folder creation was cancelled or failed');
      this.showNotification('Folder creation cancelled or failed.', 'warning');
    }
  });
}

  // =================== EXPORT FUNCTIONALITY ===================

  openExportDialog(file: AppFile): void {
    if (!this.canView || !file.id) {
      this.showNotification('Cannot export this file.', 'error');
      return;
    }

    const dialogData: ExportDialogData = {
      fileName: file.fileName,
      elementType: 'BPMN Diagram',
      hasCustomProperties: !!(file.customProperties && file.customProperties !== '{}'),
      hasElementColors: !!(file.elementColors && file.elementColors !== '{}')
    };

    const dialogRef = this.popup.open(ExportDialogComponent, {
      width: '900px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ExportDialogResult) => {
      if (result && file.id) {
        this.processExport(file.id, result);
      }
    });
  }

  quickExport(file: AppFile, format: 'pdf' | 'svg' | 'png' | 'xml'): void {
    if (!file.id) {
      this.showNotification('Cannot export this file.', 'error');
      return;
    }

    this.fileService.exportFile(file.id, format).subscribe({
      next: (blob: Blob) => {
        const fileName = `${file.fileName?.replace(/\.(bpmn|xml)$/, '') || 'diagram'}.${format}`;
        this.downloadBlob(blob, fileName);
        this.showNotification(`File exported as ${format.toUpperCase()} successfully`, 'success');
      },
      error: (error: any) => {
        this.showNotification(`Error exporting as ${format.toUpperCase()}: ` + error.message, 'error');
      }
    });
  }

  private processExport(fileId: number, result: ExportDialogResult): void {
    this.fileService.exportFile(fileId, result.format).subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, result.fileName);
        this.showNotification(`File exported as ${result.format.toUpperCase()} successfully`, 'success');
      },
      error: (error: any) => {
        this.showNotification(`Error exporting as ${result.format.toUpperCase()}: ` + error.message, 'error');
      }
    });
  }

  // =================== UI HELPER METHODS ===================

  getUserRoleClass(): string {
    if (this.authenticationService.isAdmin()) return 'admin';
    if (this.authenticationService.isModeler()) return 'modeler';
    if (this.authenticationService.isViewer()) return 'viewer';
    return 'unknown';
  }

  getUserRoleIcon(): string {
    if (this.authenticationService.isAdmin()) return 'admin_panel_settings';
    if (this.authenticationService.isModeler()) return 'edit';
    if (this.authenticationService.isViewer()) return 'visibility';
    return 'person';
  }

  getTotalFileCount(): number {
    return this.appFile.length;
  }

  getItemCount(): string {
    const folderCount = this.folders.length;
    const fileCount = this.appFile.length;
    const total = folderCount + fileCount;

    if (total === 0) return 'Empty';

    const parts = [];
    if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? 's' : ''}`);
    if (fileCount > 0) parts.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`);

    return parts.join(', ');
  }

  getFileTypeLabel(file: AppFile): string {
    if (file.fileName?.endsWith('.bpmn')) return 'BPMN';
    if (file.fileName?.endsWith('.xml')) return 'XML';
    return 'DIAGRAM';
  }

  getEmptyStateTitle(): string {
    if (this.currentFolder) {
      return `"${this.currentFolder.folderName}" is empty`;
    }
    return 'No files found';
  }

  getEmptyStateMessage(): string {
    if (this.currentFolder) {
      return `This folder doesn't contain any files or subfolders yet.`;
    }
    return 'Start by creating your first BPMN diagram or uploading an existing one.';
  }

  refreshAll(): void {
    this.loadCurrentFolder(this.currentFolder?.id);
    this.showNotification('Content refreshed', 'success');
  }

  // =================== FILE OPERATIONS ===================

  openFile(file: AppFile): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to view files.', 'error');
      return;
    }

    if (!file.id) {
      this.showNotification('Invalid file: missing file ID.', 'error');
      return;
    }

    this.router.navigate(['/modeler'], {
      queryParams: {
        fileId: file.id,
        fileName: file.fileName || 'untitled',
        folderId: this.currentFolder?.id || null,
        folderName: this.currentFolder?.folderName || 'Root',
        mode: this.isViewerOnly ? 'view' : 'edit'
      }
    });
  }

deleteFile(id: number): void {
  if (!this.canDelete) {
    this.showNotification('You do not have permission to delete files.', 'error');
    return;
  }

  const fileToDelete = this.appFile.find(file => file.id === id);
  const fileName = fileToDelete?.fileName || 'this file';

  const dialogRef = this.popup.open(DialogBoxComponent, {
    width: '400px',
    data: {
      title: 'Delete File',
      message: `Are you sure you want to delete "${fileName}"?`,
      warning: 'This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning'
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.fileService.deleteFile(id).subscribe({
        next: () => {
          this.appFile = this.appFile.filter(file => file.id !== id);
          this.delete.emit(true);
          this.showNotification('File deleted successfully', 'success');
          // ΔΙΟΡΘΩΣΗ: reload με το σωστό folder ID
          this.loadCurrentFolder(this.currentFolder?.id || null);
        },
        error: (error: any) => {
          this.showNotification('Error deleting file: ' + error.message, 'error');
        }
      });
    }
  });
}

  downloadFile(file: AppFile): void {
    if (!this.canView || !file.id) {
      this.showNotification('Cannot download this file.', 'error');
      return;
    }

    this.fileService.downloadFile(file.id).subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, file.fileName || 'downloaded_file');
        this.showNotification('File downloaded successfully', 'success');
      },
      error: (error: any) => {
        this.showNotification('Error downloading file: ' + error.message, 'error');
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
  private showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    console.log(`Notification [${type}]:`, message);

    const config = {
      duration: type === 'error' ? 5000 : 3000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center' as const,
      verticalPosition: 'bottom' as const
    };

    this.snackBar.open(message, 'Close', config);
  }

  debugUserPermissions(): void {
    console.log('=== USER PERMISSIONS DEBUG ===');
    console.log('Current User:', this.currentUser);
    console.log('Can View:', this.canView);
    console.log('Can Edit:', this.canEdit);
    console.log('Can Create:', this.canCreate);
    console.log('Can Delete:', this.canDelete);
    console.log('Is Viewer Only:', this.isViewerOnly);
    console.log('User Role:', this.currentUserRole);
    console.log('Is Admin:', this.authenticationService.isAdmin());
    console.log('Is Modeler:', this.authenticationService.isModeler());
    console.log('Is Viewer:', this.authenticationService.isViewer());
    console.log('===============================');
  }

  debugCurrentState(): void {
    console.log('=== CURRENT STATE DEBUG ===');
    console.log('Current Folder:', this.currentFolder);
    console.log('Folders Count:', this.folders.length);
    console.log('Files Count:', this.appFile.length);
    console.log('Is Loading:', this.isLoading);
    console.log('Breadcrumbs:', this.breadcrumbs);
    console.log('===========================');
  }
  // =================== FOLDER OPERATIONS ===================

loadCurrentFolder(folderId?: number | null): void {
  if (!this.canView) {
    this.isLoading = false;
    console.log('User cannot view folders - insufficient permissions');
    return;
  }

  // ΣΗΜΑΝΤΙΚΟ: Normalize το folderId - undefined γίνεται null
  const normalizedFolderId = folderId === undefined ? null : folderId;
  
  console.log('Loading current folder:', normalizedFolderId === null ? 'root' : normalizedFolderId);
  this.isLoading = true;

  // 1. Load folders first
  this.folderService.getFoldersInFolder(normalizedFolderId).subscribe({ 
    next: (folders) => {
      console.log('Loaded folders:', folders.length);
      this.folders = folders;

      // Set current folder and breadcrumbs
      if (normalizedFolderId !== null) {
        this.folderService.getFolder(normalizedFolderId).subscribe({
          next: (folderDetails) => {
            this.currentFolder = folderDetails;
            this.loadBreadcrumbs(normalizedFolderId);
          },
          error: (err) => {
            console.error('Error fetching current folder details:', err);
            this.currentFolder = null;
            this.breadcrumbs = [{ id: null, name: 'Root', path: '/' }];
          }
        });
      } else {
        this.currentFolder = null;
        this.breadcrumbs = [{ id: null, name: 'Root', path: '/' }];
      }
    },
    error: (error) => {
      console.error('Error loading folders:', error);
      this.folders = [];
      this.showNotification('Error loading folders: ' + (error?.message || 'Unknown error'), 'warning');
    }
  });

  // 2. Load files - ΔΙΟΡΘΩΣΗ: χρησιμοποιούμε τη σωστή μέθοδο ανάλογα με το folderId
  if (normalizedFolderId === null) {
    // Load root files
    this.fileService.getRootFiles().subscribe({
      next: (files: AppFile[]) => {
        console.log('Loaded root files:', files.length);
        this.appFile = files;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading root files:', error);
        this.appFile = [];
        this.isLoading = false;
        this.showNotification('Error loading files: ' + error.message, 'error');
      }
    });
  } else {
    // Load files in specific folder
    this.fileService.getFilesInFolder(normalizedFolderId).subscribe({
      next: (files: AppFile[]) => {
        console.log('Loaded files in folder:', files.length);
        this.appFile = files;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading files in folder:', error);
        this.appFile = [];
        this.isLoading = false;
        this.showNotification('Error loading files: ' + error.message, 'error');
      }
    });
  }
}
  private loadBreadcrumbs(folderId: number): void {
    console.log('Loading breadcrumbs for folder:', folderId);
    this.folderService.getFolderBreadcrumb(folderId).subscribe({
      next: (breadcrumbs) => {
        console.log('Loaded breadcrumbs:', breadcrumbs);
        this.breadcrumbs = [
          { id: null, name: 'Root', path: '/' },
          ...breadcrumbs
        ];
      },
      error: (error) => {
        console.error('Error loading breadcrumbs:', error);
        this.breadcrumbs = [{ id: null, name: 'Root', path: '/' }];
      }
    });
  }
navigateToFolder(folderId: number | null): void {
  console.log('Navigating to folder:', folderId);
  this.loadCurrentFolder(folderId);
}

navigateUp(): void {
  if (this.currentFolder && this.currentFolder.parentFolder) {
    this.navigateToFolder(this.currentFolder.parentFolder.id);
  } else {
    this.navigateToFolder(null); 
  }
}
deleteFolder(id: number, folder: Folder): void {
  if (!this.canDelete) {
    this.showNotification('You do not have permission to delete folders.', 'error');
    return;
  }

  const dialogRef = this.popup.open(DialogBoxComponent, {
    width: '400px',
    data: {
      title: 'Delete Folder',
      message: `Are you sure you want to delete the folder "${folder.folderName}"?`,
      warning: 'This action cannot be undone. The folder must be empty to be deleted.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning'
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.folderService.deleteFolder(id).subscribe({
        next: () => {
          this.showNotification('Folder deleted successfully', 'success');
          this.folders = this.folders.filter(f => f.id !== id);
          // ΔΙΟΡΘΩΣΗ: reload με το σωστό folder ID
          this.loadCurrentFolder(this.currentFolder?.id || null);
        },
        error: (error) => {
          this.showNotification('Error deleting folder: ' + error.message, 'error');
        }
      });
    }
  });
}
  // =================== FILE UPLOAD ===================

  uploadFile(): void {
    if (!this.canCreate) {
      this.showNotification('You do not have permission to upload files.', 'error');
      return;
    }

    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Πριν την αποστολή, ελέγχουμε αν υπάρχει ήδη αρχείο με το ίδιο όνομα στον τρέχοντα φάκελο
      const existingFile = this.appFile.find(f => f.fileName === file.name);

      if (existingFile) {
        this.handleFileConflict(file, existingFile);
      } else {
        this.uploadNewFile(file);
      }

      input.value = ''; // Clear the input after selection
    }
  }

  private handleFileConflict(newFile: File, existingFile: AppFile): void {
    const dialogRef = this.popup.open(DialogBoxComponent, {
      width: '400px',
      data: {
        title: 'File Exists',
        message: `File "${newFile.name}" already exists. Do you want to overwrite it?`,
        confirmText: 'Overwrite',
        cancelText: 'Rename',
        type: 'warning'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.overwriteFile(newFile, existingFile);
      } else if (result === false) {
        // User chose to rename
        const renameDialogRef = this.popup.open(DialogBoxComponent, {
          width: '400px',
          data: {
            title: 'Rename File',
            message: 'Enter a new name for the file:',
            inputType: 'text',
            inputValue: newFile.name, // Pre-fill with original name
            confirmText: 'Save',
            cancelText: 'Cancel'
          }
        });

        renameDialogRef.afterClosed().subscribe(newNameResult => {
          if (newNameResult && newNameResult.trim()) {
            this.uploadNewFile(newFile, newNameResult.trim());
          } else if (newNameResult === '') {
            this.showNotification('File name cannot be empty.', 'error');
          }
        });
      }
    });
  }
private uploadNewFile(file: File, customName?: string): void {
  // ΔΙΟΡΘΩΣΗ: Σωστό folder ID handling
  const folderId = this.currentFolder?.id || null;
  
  this.fileService.uploadFileToFolder(
    file,
    folderId,
    '', // description
    '', // tags
    customName,
    false // not overwrite
  ).subscribe({
    next: (uploadedFile: AppFile) => {
      this.showNotification('File uploaded successfully', 'success');
      // ΔΙΟΡΘΩΣΗ: reload με το σωστό folder ID
      this.loadCurrentFolder(this.currentFolder?.id || null);
    },
    error: (error: any) => {
      if (error.message.includes('already exists')) {
        this.handleFileConflict(file, { fileName: file.name } as AppFile);
      } else {
        this.showNotification('Error uploading file: ' + error.message, 'error');
      }
    }
  });
}

private overwriteFile(newFile: File, existingFile: AppFile): void {
  // ΔΙΟΡΘΩΣΗ: Σωστό folder ID handling
  const folderId = this.currentFolder?.id || null;
  
  this.fileService.uploadFileToFolder(
    newFile,
    folderId,
    '', // description
    '', // tags
    undefined, // No custom name when overwriting
    true // overwrite
  ).subscribe({
    next: (uploadedFile: AppFile) => {
      this.showNotification('File overwritten successfully', 'success');
      // ΔΙΟΡΘΩΣΗ: reload με το σωστό folder ID
      this.loadCurrentFolder(this.currentFolder?.id || null);
    },
    error: (error: any) => {
      this.showNotification('Error overwriting file: ' + error.message, 'error');
    }
  });
}

  // =================== NAVIGATION ===================

navigateToModeler(): void {
  if (!this.canCreate) {
    this.showNotification('You do not have permission to create new files.', 'error');
    return;
  }

  const queryParams: any = { new: true };
  
  if (this.currentFolder) {
    queryParams.folderId = this.currentFolder.id;
    queryParams.folderName = this.currentFolder.folderName;
  } else {
    queryParams.folderId = null;
    queryParams.folderName = 'Root';
  }

  this.router.navigate(['/modeler'], { queryParams });
}
  navigateToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }

  // =================== UTILITY METHODS ===================

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // =================== PERMISSION CHECKS ===================

  canEditFile(file: AppFile): boolean {
    return this.canEdit;
  }

  canDeleteFile(file: AppFile): boolean {
    return this.canDelete;
  }

  canDownloadFile(file: AppFile): boolean {
    return this.canView;
  }

  canExportFile(file: AppFile): boolean {
    return this.canView && !!(
      file.fileName?.endsWith('.bpmn') ||
      file.fileName?.endsWith('.xml') ||
      file.fileType?.includes('xml')
    );
  }

  // =================== GETTER PROPERTIES ===================

  get currentUserRole(): string {
    if (this.authenticationService.isAdmin()) return 'Administrator';
    if (this.authenticationService.isModeler()) return 'Modeler';
    if (this.authenticationService.isViewer()) return 'Viewer';
    return 'Unknown';
  }

  get currentUserFullName(): string {
    if (this.currentUser && this.currentUser.firstname && this.currentUser.lastname) {
      return `${this.currentUser.firstname} ${this.currentUser.lastname}`;
    } else if (this.currentUser && this.currentUser.firstname) {
      return this.currentUser.firstname;
    } else if (this.currentUser && this.currentUser.username) {
      return this.currentUser.username;
    }
    return 'User';
  }

  get currentFolderName(): string {
    return this.currentFolder?.folderName || 'Root';
  }

  isInFolder(): boolean {
    return this.currentFolder !== null;
  }
}