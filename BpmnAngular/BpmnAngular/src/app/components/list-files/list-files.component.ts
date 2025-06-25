import { Component, ViewChild, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';
import { AppFile } from '../../files';
import feather from 'feather-icons';
import { AuthenticationService, User } from '../../services/authentication.service';
import { Subject, takeUntil } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import { MatDialog } from '@angular/material/dialog';
import { DialogBoxComponent } from '../dialog-box/dialog-box.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-list-files',
  standalone: true,
  imports: [CommonModule,MatIconModule],
  templateUrl: './list-files.component.html',
  styleUrl: './list-files.component.css'
})
export class ListFilesComponent implements OnInit, OnDestroy {
  @ViewChild('listfiles', { static: true }) listfiles!: ElementRef;

  appFile: AppFile[] = [];
  isLoading = true;
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

    // Initialize feather icons
    setTimeout(() => {
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    }, 100);

    if (this.canView) {
      this.getFiles();
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
  if (!this.canDelete) {
    this.showMessage('You do not have permission to delete files.', 'error');
    return;
  }
  const dialogRef = this.popup.open(DialogBoxComponent, {
    width: '400px',
    disableClose: true 
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === true) {
      this.fileService.deleteFile(id).subscribe({
        next: () => {
          this.appFile = this.appFile.filter(file => file.id !== id);
          this.showMessage('File deleted successfully', 'success');
        },
        error: (error: any) => {
          console.error('Error deleting file:', error);
          this.showMessage('Error deleting file: ' + error.message, 'error');
        }
      });
    }
  });
}
  openFile(file: AppFile): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to view files.', 'error');
      return;
    }

    // Navigate to BPMN modeler with file data
    const queryParams: any = {
      fileId: file.id,
      fileName: file.fileName,
      mode: this.isViewerOnly ? 'view' : 'edit'
    };

    this.router.navigate(['/modeler'], {
      queryParams: queryParams
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
    // Admin can edit all files, modelers can edit their own or public files
    if (this.authenticationService.isAdmin()) {
      return true;
    }
    if (this.authenticationService.isModeler()) {
      return true; // For now, allow all modelers to edit files
    }
    if(this.authenticationService.isViewer()) {
      return  true; 
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
}