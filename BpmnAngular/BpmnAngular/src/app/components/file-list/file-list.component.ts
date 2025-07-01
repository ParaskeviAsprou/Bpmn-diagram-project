import { Component, ViewChild, ElementRef, OnInit, OnDestroy, inject, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';
import { AppFile } from '../../models/File';
import feather from 'feather-icons';
import { AuthenticationService, User } from '../../services/authentication.service';
import { Subject, takeUntil } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import { MatDialog } from '@angular/material/dialog';
import { DialogBoxComponent } from '../dialog-box/dialog-box.component';;
import { Folder } from '../../models/Folder';
import { FolderService } from '../../services/folder.service';
import { CreateFolderDialogComponent } from '../create-folder-dialog/create-folder-dialog.component';
import { VersionHistoryDialogComponent } from '../version-history-dialog/version-history-dialog.component';
import { FileVersionService } from '../../services/file-version.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConflictDialogComponent } from '../file-conflict-dialog/file-conflict-dialog.component';
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
    MatTooltipModule
    , MatProgressSpinnerModule,
    MatListModule,
    MatGridListModule,
    MatButtonModule,
    MatToolbarModule,
    MatCardModule],
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
  currentFile: AppFile | null = null;

  // Permission flags
  canView: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;
  canCreate: boolean = false;
  isViewerOnly: boolean = false;

  // Export states
  isExporting = false;
  exportingFileId: number | null = null;

  readonly popup = inject(MatDialog);
  private destroy$ = new Subject<void>();
  private modeler!: BpmnModeler | BpmnViewer;

  constructor(
    private fileService: FileService,
    private folderService: FolderService,
    private fileVersionService: FileVersionService,
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

    // Set permissions based on user roles
    this.canView = this.authenticationService.canView();
    this.canEdit = this.authenticationService.canEdit();
    this.canCreate = this.authenticationService.canEdit();
    this.canDelete = this.authenticationService.isAdmin();

    // Check if user is viewer only
    this.isViewerOnly = this.authenticationService.isViewer() &&
      !this.authenticationService.isModeler() &&
      !this.authenticationService.isAdmin();

    console.log('File list permissions:', {
      canView: this.canView,
      canEdit: this.canEdit,
      canCreate: this.canCreate,
      canDelete: this.canDelete,
      isViewerOnly: this.isViewerOnly
    });
  }

  public getFiles(): void {
    if (!this.canView) {
      console.warn('User does not have permission to view files');
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.fileService.getFiles().subscribe({
      next: (response: AppFile[]) => {
        this.appFile = response;
        this.isLoading = false;

        // Refresh feather icons after data loads
        setTimeout(() => {
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }, 100);
      },
      error: (error: any) => {
        console.error('Error fetching files:', error);
        this.isLoading = false;
        this.showMessage('Error loading files: ' + error.message, 'error');
      }
    });
  }

  deleteFile(id: number): void {
    console.log('Attempting to delete file with id:', id);
    if (!this.canDelete) {
      this.showMessage('You do not have permission to delete files.', 'error');
      return;
    }
    const fileToDelete = this.appFile.find(file => file.id === id);
    const fileName = fileToDelete?.fileName || 'this file';


    const dialogRef = this.popup.open(DialogBoxComponent, {
      width: '400px',
      disableClose: false,
      data: {
        title: 'Delete File',
        message: `Are you sure you want to delete the "${fileName}"?`,
        warning: 'This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'warning'
      }
    });

    this.fileService.deleteFile(id).subscribe({
      next: () => {
        console.log('File deleted on backend, updating UI');
        this.appFile = this.appFile.filter(file => file.id !== id);
        this.delete.emit(true);
        this.showMessage('File deleted successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error deleting file:', error);
        this.showMessage('Error deleting file: ' + error.message, 'error');
      }
    });
  }

  openFile(file: AppFile): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to view files.', 'error');
      return;
    }

    if (!file.id) {
      this.showMessage('Invalid file: missing file ID.', 'error');
      return;
    }

    console.log('Opening file:', file.fileName, 'ID:', file.id);

    // Navigate to modeler with file ID - let the modeler handle content loading
    this.router.navigate(['/modeler'], {
      queryParams: {
        fileId: file.id,
        fileName: file.fileName || 'untitled',
        folderId: this.currentFolder?.id || null,
        mode: this.isViewerOnly ? 'view' : 'edit'
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
        console.error('Error downloading file:', error);
        this.showMessage('Error downloading file: ' + error.message, 'error');
      }
    });
  }

  exportToPdf(): void {
    if (this.canView) {
      if (!this.currentFile?.fileName) {
        this.showMessage('Please save the diagram first before exporting to PDF.', 'warning');
        return;
      }

      if (!this.modeler) {
        this.showMessage('BPMN modeler not initialized', 'error');
        return;
      }

      try {
        this.modeler.saveSVG().then((result: any) => {
          const svgString = result.svg;
          this.convertSvgToPdf(svgString, this.currentFile!.fileName!);
        }).catch((error: any) => {
          console.error('Error getting SVG from modeler:', error);
          this.showMessage('Error exporting diagram: ' + error.message, 'error');
        });
      } catch (error: any) {
        console.error('Error in exportToPdf:', error);
        this.showMessage('Error exporting diagram: ' + error.message, 'error');
      }
    }
  }
  private convertSvgToPdf(svgString: string, fileName: string): void {
    if (this.canView) {
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    background: white;
    padding: 20px;
  `;
      tempDiv.innerHTML = svgString;
      document.body.appendChild(tempDiv);

      const svgElement = tempDiv.querySelector('svg');
      if (!svgElement) {
        this.showMessage('Could not extract diagram SVG', 'error');
        document.body.removeChild(tempDiv);
        return;
      }
      svgElement.style.background = 'white';
      svgElement.style.border = '1px solid #ddd';

      html2canvas(tempDiv, {
        useCORS: true,
        allowTaint: true
      }).then(canvas => {
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF('p', 'mm', 'a4');
        const contentDataURL = canvas.toDataURL('image/png', 1.0);


        pdf.setFontSize(16);
        pdf.text(fileName.replace(/\.(bpmn|xml)$/, ''), 10, 15);


        pdf.addImage(contentDataURL, 'PNG', 10, 25, imgWidth, imgHeight);

        const pdfFileName = fileName.replace(/\.(bpmn|xml)$/, '') + '.pdf';
        pdf.save(pdfFileName);

        this.showMessage('Diagram exported to PDF successfully', 'success');


        document.body.removeChild(tempDiv);
      }).catch(error => {
        console.error('Error converting SVG to PDF:', error);
        this.showMessage('Error converting diagram to PDF: ' + error.message, 'error');
        document.body.removeChild(tempDiv);
      });
    }
  }
  navigateToModeler(): void {
    if (!this.canCreate) {
      this.showMessage('You do not have permission to create new files.', 'error');
      return;
    }
    this.router.navigateByUrl('/modeler');
  }

  navigateToDashboard(): void {
    this.router.navigateByUrl('/dashboard');
  }

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
    if (this.authenticationService.isAdmin()) {
      return true;
    }
    if (this.authenticationService.isModeler()) {
      return true;
    }
    if (this.authenticationService.isViewer()) {
      return true;
    }
    return false;
  }

  canDeleteFile(file: AppFile): boolean {
    return this.authenticationService.isAdmin();
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

  /*files tree*/
  loadCurrentFolder(folderId?: number): void {
    if (!this.canView) {
      console.warn('User does not have permission to view files');
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
          console.error('Error loading folder:', error);
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
          console.error('Error loading subfolders:', error);
          this.folders = [];
        }
      });
    } else {
      this.folderService.getRootFolders().subscribe({
        next: (folders) => {
          this.folders = folders;
        },
        error: (error) => {
          console.error('Error loading root folders:', error);
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

          // Refresh feather icons after data loads
          setTimeout(() => {
            if (typeof feather !== 'undefined') {
              feather.replace();
            }
          }, 100);
        },
        error: (error: any) => {
          console.error('Error fetching files:', error);
          this.appFile = [];
          this.isLoading = false;
          const errorMessage = error?.error?.message || error?.message || 'Unknown error';
          this.showMessage('Error loading files: ' + errorMessage, 'error');
        }
      });
    } else {
      this.fileService.getRootFiles().subscribe({
        next: (files: AppFile[]) => {
          this.appFile = files;
          this.isLoading = false;

          setTimeout(() => {
            if (typeof feather !== 'undefined') {
              feather.replace();
            }
          }, 100);
        },
        error: (error: any) => {
          console.error('Error fetching root files:', error);
          this.appFile = [];
          this.isLoading = false;
          const errorMessage = error?.error?.message || error?.message || 'Unknown error';
          this.showMessage('Error loading files: ' + errorMessage, 'error');
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
        console.error('Error loading breadcrumbs:', error);
        this.breadcrumbs = [{ id: null, name: 'Root', path: '/' }];
      }
    });
  }

  navigateToFolder(folderId: number | null): void {
    this.loadCurrentFolder(folderId || undefined);
  }

  navigateUp(): void {
    if (this.currentFolder?.parentFolder) {
      this.navigateToFolder(this.currentFolder.parentFolder.id);
    } else {
      this.navigateToFolder(null);
    }
  }

  // =================== FOLDER MANAGEMENT ===================

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

    const fileToDelete = this.folders.find(folder => folder.id === id);
    const folderName = fileToDelete?.folderName || 'this folder';

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
    this.folderService.deleteFolder(id).subscribe({
      next: () => {
        this.showMessage('Folder deleted successfully', 'success');
        this.folders = this.folders.filter(folder => folder.id !== id);
        this.loadCurrentFolder(this.currentFolder?.id);
      },
      error: (error) => {
        this.showMessage('Error deleting folder: ' + error.message, 'error');
      }
    });
    // }
    // });
  }

  // =================== FILE MANAGEMENT ===================

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

      // Reset input
      input.value = '';
    }
  }

  private handleFileConflict(newFile: File, existingFile: AppFile): void {
    const dialogRef = this.popup.open(ConflictDialogComponent, {
      width: '500px',
      data: {
        fileName: newFile.name,
        existingFile: existingFile,
        newFileSize: newFile.size
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        switch (result.action) {
          case 'overwrite':
            this.overwriteFile(newFile, existingFile);
            break;
          case 'version':
            this.createNewVersion(newFile, existingFile);
            break;
          case 'rename':
            this.uploadNewFile(newFile, result.newName);
            break;
          case 'cancel':
            // Do nothing
            break;
        }
      }
    });
  }
  private uploadNewFile(file: File, customName?: string): void {
    if (!this.currentFolder || typeof this.currentFolder.id !== 'number') {
      this.showMessage('No folder selected for upload.', 'error');
      return;
    }
    if (this.currentFolder) {
      this.loadCurrentFolder(this.currentFolder.id);
    }
    this.fileService.uploadFileToFolder(
      file,
      this.currentFolder.id, // Now guaranteed to be a number
      '', // description
      '', // tags
      customName
    ).subscribe({
      next: (uploadedFile: AppFile) => {
        this.showMessage('File uploaded successfully', 'success');
        this.loadCurrentFolder(this.currentFolder?.id);
      },
      error: (error: any) => {
        this.showMessage('Error uploading file: ' + error.message, 'error');
      }
    });
  }

  private overwriteFile(newFile: File, existingFile: AppFile): void {
    if (typeof existingFile.id !== 'number') return;
    const fileId = existingFile.id; // Capture as number

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      this.fileService.updateFileContent(fileId, content).subscribe({
        next: (updatedFile) => {
          this.showMessage('File overwritten successfully', 'success');
          this.loadCurrentFolder(this.currentFolder?.id);
        },
        error: (error) => {
          this.showMessage('Error overwriting file: ' + error.message, 'error');
        }
      });
    };
    reader.onerror = (error) => {
      this.showMessage('Error reading file: ' + error, 'error');
    };
    reader.readAsText(newFile);
  }

  private createNewVersion(newFile: File, existingFile: AppFile): void {
    if (!existingFile.id) return;

    this.fileVersionService.createNewVersion(existingFile.id, newFile, 'Updated via upload').subscribe({
      next: (version: any) => {
        this.showMessage('New version created successfully', 'success');
        this.loadCurrentFolder(this.currentFolder?.id);
      },
      error: (error: any) => {
        this.showMessage('Error creating new version: ' + error.message, 'error');
      }
    });
  }

  // =================== VERSION MANAGEMENT ===================

  viewVersionHistory(file: AppFile): void {
    if (!file.id) return;

    const dialogRef = this.popup.open(VersionHistoryDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      data: {
        file: file,
        canEdit: this.canEdit
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'restore') {
        this.loadCurrentFolder(this.currentFolder?.id);
      }
    });
  }

}