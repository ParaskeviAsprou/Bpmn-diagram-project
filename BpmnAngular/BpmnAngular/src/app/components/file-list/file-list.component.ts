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
    MatCardModule,MatMenuModule
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

    if (this.canView) {
      this.loadCurrentFolder();
    } else {
      this.isLoading = false;
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

  // =================== FILE OPERATIONS ===================

  openFile(file: AppFile): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to view files.', 'error');
      return;
    }

    if (!file.id) {
      this.showMessage('Invalid file: missing file ID.', 'error');
      return;
    }

    // Navigate to modeler with file ID
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
      this.showMessage('You do not have permission to delete files.', 'error');
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
            this.showMessage('File deleted successfully', 'success');
          },
          error: (error: any) => {
            this.showMessage('Error deleting file: ' + error.message, 'error');
          }
        });
      }
    });
  }

  downloadFile(file: AppFile): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to download files.', 'error');
      return;
    }

    this.fileService.downloadFile(file.id!).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName || 'downloaded_file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showMessage('File downloaded successfully', 'success');
      },
      error: (error: any) => {
        this.showMessage('Error downloading file: ' + error.message, 'error');
      }
    });
  }

  exportFile(file: AppFile, format: 'pdf' | 'xml' | 'svg' | 'png'): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to export files.', 'error');
      return;
    }

    if (!file.id) {
      this.showMessage('Invalid file for export.', 'error');
      return;
    }

    this.fileService.exportFile(file.id, format).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.fileName?.replace(/\.(bpmn|xml)$/, '') || 'diagram'}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showMessage(`File exported as ${format.toUpperCase()} successfully`, 'success');
      },
      error: (error: any) => {
        this.showMessage(`Error exporting file as ${format.toUpperCase()}: ` + error.message, 'error');
      }
    });
  }

  uploadFile(): void {
    if (!this.canCreate) {
      this.showMessage('You do not have permission to upload files.', 'error');
      return;
    }

    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Check if file already exists
      const existingFile = this.appFile.find(f => f.fileName === file.name);

      if (existingFile) {
        this.handleFileConflict(file, existingFile);
      } else {
        this.uploadNewFile(file);
      }

      input.value = '';
    }
  }

  private handleFileConflict(newFile: File, existingFile: AppFile): void {
    const overwrite = confirm(`File "${newFile.name}" already exists. Do you want to overwrite it?`);
    
    if (overwrite) {
      this.overwriteFile(newFile, existingFile);
    } else {
      const newName = prompt('Enter a new name for the file:', newFile.name);
      if (newName && newName.trim()) {
        this.uploadNewFile(newFile, newName.trim());
      }
    }
  }

  private uploadNewFile(file: File, customName?: string): void {
    this.fileService.uploadFileToFolder(
      file,
      this.currentFolder?.id || null,
      '', // description
      '', // tags
      customName,
      false // overwrite
    ).subscribe({
      next: (uploadedFile: AppFile) => {
        this.showMessage('File uploaded successfully', 'success');
        this.loadCurrentFolder(this.currentFolder?.id);
      },
      error: (error: any) => {
        if (error.message.includes('already exists')) {
          this.handleFileConflict(file, { fileName: file.name } as AppFile);
        } else {
          this.showMessage('Error uploading file: ' + error.message, 'error');
        }
      }
    });
  }

  private overwriteFile(newFile: File, existingFile: AppFile): void {
    this.fileService.uploadFileToFolder(
      newFile,
      this.currentFolder?.id || null,
      '', // description
      '', // tags
      undefined, // customName
      true // overwrite
    ).subscribe({
      next: (uploadedFile: AppFile) => {
        this.showMessage('File overwritten successfully', 'success');
        this.loadCurrentFolder(this.currentFolder?.id);
      },
      error: (error: any) => {
        this.showMessage('Error overwriting file: ' + error.message, 'error');
      }
    });
  }

  // =================== FOLDER OPERATIONS ===================

  loadCurrentFolder(folderId?: number): void {
    if (!this.canView) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    if (folderId) {
      // Load specific folder
      this.folderService.getFolder(folderId).subscribe({
        next: (folder: Folder) => {
          this.currentFolder = folder;
          this.loadFolderContents(folderId);
          this.loadBreadcrumbs(folderId);
        },
        error: (error) => {
          this.showMessage('Error loading folder: ' + error.message, 'error');
          this.isLoading = false;
        }
      });
    } else {
      // Load root folder
      this.currentFolder = null;
      this.loadFolderContents(null);
      this.breadcrumbs = [{ id: null, name: 'Root', path: '/' }];
    }
  }

  private loadFolderContents(folderId: number | null): void {
    // Load subfolders
    if (folderId !== null && folderId !== undefined) {
      this.folderService.getSubFolders(folderId).subscribe({
        next: (folders) => {
          this.folders = folders;
        },
        error: (error) => {
          this.folders = [];
        }
      });
    } else {
      this.folderService.getRootFolders().subscribe({
        next: (folders) => {
          this.folders = folders;
        },
        error: (error) => {
          this.folders = [];
          this.showMessage('Error loading folders: ' + (error?.message || 'Unknown error'), 'warning');
        }
      });
    }

    // Load files in folder
    if (folderId !== null && folderId !== undefined) {
      this.fileService.getFilesInFolder(folderId).subscribe({
        next: (files: AppFile[]) => {
          this.appFile = files;
          this.isLoading = false;
          this.refreshFeatherIcons();
        },
        error: (error: any) => {
          this.appFile = [];
          this.isLoading = false;
          this.showMessage('Error loading files: ' + error.message, 'error');
        }
      });
    } else {
      this.fileService.getRootFiles().subscribe({
        next: (files: AppFile[]) => {
          this.appFile = files;
          this.isLoading = false;
          this.refreshFeatherIcons();
        },
        error: (error: any) => {
          this.appFile = [];
          this.isLoading = false;
          this.showMessage('Error loading files: ' + error.message, 'error');
        }
      });
    }
  }

  private loadBreadcrumbs(folderId: number): void {
    this.folderService.getFolderBreadcrumb(folderId).subscribe({
      next: (breadcrumbs) => {
        this.breadcrumbs = [
          { id: null, name: 'Root', path: '/' },
          ...breadcrumbs
        ];
      },
      error: (error) => {
        this.breadcrumbs = [{ id: null, name: 'Root', path: '/' }];
      }
    });
  }

  navigateToFolder(folderId: number | null): void {
    this.loadCurrentFolder(folderId || undefined);
  }

  navigateUp(): void {
    if (this.currentFolder && this.currentFolder.parentFolder) {
      this.navigateToFolder(this.currentFolder.parentFolder.id);
    } else {
      this.navigateToFolder(null);
    }
  }

  createFolder(): void {
    if (!this.canCreate) {
      this.showMessage('You do not have permission to create folders.', 'error');
      return;
    }

    const dialogRef = this.popup.open(CreateFolderDialogComponent, {
      width: '400px',
      data: {
        parentFolderId: this.currentFolder?.id || null,
        parentFolderName: this.currentFolder?.folderName || 'Root'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.folderService.createFolder(result.name, result.description, this.currentFolder?.id).subscribe({
          next: (folder: Folder) => {
            this.showMessage('Folder created successfully', 'success');
            this.loadCurrentFolder(this.currentFolder?.id);
          },
          error: (error: any) => {
            this.showMessage('Error creating folder: ' + error.message, 'error');
          }
        });
      }
    });
  }

  deleteFolder(id: number, folder: Folder): void {
    if (!this.canDelete) {
      this.showMessage('You do not have permission to delete folders.', 'error');
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
            this.showMessage('Folder deleted successfully', 'success');
            this.folders = this.folders.filter(f => f.id !== id);
            this.loadCurrentFolder(this.currentFolder?.id);
          },
          error: (error) => {
            this.showMessage('Error deleting folder: ' + error.message, 'error');
          }
        });
      }
    });
  }

  // =================== NAVIGATION ===================

  navigateToModeler(): void {
    if (!this.canCreate) {
      this.showMessage('You do not have permission to create new files.', 'error');
      return;
    }

    this.router.navigate(['/modeler'], {
      queryParams: {
        new: true,
        folderId: this.currentFolder?.id || null,
        folderName: this.currentFolder?.folderName || 'Root'
      }
    });
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

  private refreshFeatherIcons(): void {
    setTimeout(() => {
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    }, 100);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        document.body.removeChild(messageDiv);
      }
    }, 3000);
  }
}