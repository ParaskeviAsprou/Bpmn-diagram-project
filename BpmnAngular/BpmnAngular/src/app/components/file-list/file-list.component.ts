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
import { CustomProperty, CustomPropertyService } from '../../services/custom-properties.service';

import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FormsModule } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
    MatBadgeModule,FormsModule,MatLabel,MatFormField,MatInputModule,MatIconModule
  ],
  templateUrl: './file-list.component.html',
  styleUrl: './file-list.component.css'
})
export class FileListComponent implements OnInit, OnDestroy {
  @ViewChild('listfiles', { static: true }) listfiles!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;
  @Output() delete = new EventEmitter<boolean>();

  private modeler!: BpmnModeler | BpmnViewer;
  private elementColors: { [elementId: string]: { fill?: string; stroke?: string } } = {};

  appFile: AppFile[] = [];
  folders: any[] = [];

  isLoading = true;
  currentUser: User | null = null;
  currentFile: AppFile | null = null;
  isExporting: boolean = false;


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
    public authenticationService: AuthenticationService,
    private customPropertyService: CustomPropertyService,
    private authService: AuthenticationService,
    private router: Router
  ) { }

  ngOnInit() {
    console.log('File List starting...');

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

    if (!this.authenticationService.isAuthenticated()) {
      console.error('User not authenticated');
      this.router.navigate(['/login']);
      return;
    }

    console.log('User authenticated, loading files...');
    this.loadFilesOnly();
    this.originalAppFile = [...this.appFile];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializePermissions(): void {
    this.currentUser = this.authenticationService.getCurrentUser();
    this.canView = this.authenticationService.hasRole('ROLE_VIEWER') ||
      this.authenticationService.hasRole('ROLE_MODELER') ||
      this.authenticationService.hasRole('ROLE_ADMIN');

    this.canEdit = this.authenticationService.hasRole('ROLE_MODELER') ||
      this.authenticationService.hasRole('ROLE_ADMIN');

    this.canCreate = this.authenticationService.hasRole('ROLE_MODELER') ||
      this.authenticationService.hasRole('ROLE_ADMIN');

    this.canDelete = this.authenticationService.hasRole('ROLE_ADMIN');

    this.isViewerOnly = this.authenticationService.hasRole('ROLE_VIEWER') &&
      !this.authenticationService.hasRole('ROLE_MODELER') &&
      !this.authenticationService.hasRole('ROLE_ADMIN');

    console.log('Permissions set', {
      canView: this.canView,
      canEdit: this.canEdit,
      canCreate: this.canCreate,
      canDelete: this.canDelete
    });
  }

  // =================== SIMPLIFIED LOADING ===================

  private loadFilesOnly(): void {
    console.log('Loading files only...');
    this.isLoading = true;

    this.fileService.getRootFiles().subscribe({
      next: (files: AppFile[]) => {
        console.log('Loaded files successfully:', files.length);
        this.appFile = files;
        this.originalAppFile = [...files];
        this.isLoading = false;
        this.showNotification(`Loaded ${files.length} files successfully`, 'success');
      },
      error: (error: any) => {
        console.error('Error loading files:', error);
        this.appFile = [];
        this.isLoading = false;

        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.showNotification('Error loading files: ' + (error.message || 'Unknown error'), 'error');
        }
      }
    });
  }

  // =================== FILE OPERATIONS ===================

  openFile(file: AppFile): void {
    if (!this.canView || !file.id) {
      this.showNotification('Cannot open this file.', 'error');
      return;
    }

    console.log('Opening file:', file.fileName);
    this.router.navigate(['/modeler'], {
      queryParams: {
        fileId: file.id,
        fileName: file.fileName || 'untitled',
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
            this.showNotification('File deleted successfully', 'success');
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

  // =================== ENHANCED EXPORT FUNCTIONALITY - ALL THROUGH DIALOG ===================


  openExportDialog(): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to export diagrams.', 'error');
      return;
    }

    // if (!this.currentFile?.id) {
    //   this.showNotification('Please save the diagram first before exporting.', 'warning');
    //   return;
    // }

    const dialogData: ExportDialogData = {
      fileName: this.currentFile?.fileName || 'diagram',
      elementType: 'BPMN Diagram',
      hasCustomProperties: Object.keys(this.getAllCustomProperties()).length > 0,
      hasElementColors: Object.keys(this.elementColors).length > 0
    };

    const dialogRef = this.popup.open(ExportDialogComponent, {
      width: '900px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ExportDialogResult) => {
      if (result) {
        this.processExportResult(result);
      }
    });
  }

  private getAllCustomProperties(): { [elementId: string]: CustomProperty[] } {
    const map = this.customPropertyService.getAllProperties();
    if (map instanceof Map) {
      const obj: { [elementId: string]: CustomProperty[] } = {};
      map.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }
    return map;
  }

  /**
   * Updated quickExport method - Now opens dialog instead of direct export
   */
  quickExport(file: AppFile, format: 'pdf' | 'svg' | 'png' | 'xml'): void {
    if (!this.canExportFile(file)) {
      this.showNotification('Cannot export this file.', 'error');
      return;
    }


    this.openExportDialog();
  }

  /**
   * Process the export result from the dialog
   */
  private processExportResult(result: ExportDialogResult): void {
    if (!this.currentFile?.id) return;

    this.isExporting = true;

    // Handle different export types based on format
    switch (result.format) {
      case 'pdf':
        this.exportToPdfWithOptions(result);
        break;
      case 'svg':
        this.exportToSvgWithOptions(result);
        break;
      case 'png':
        this.exportToPngWithOptions(result);
        break;
      case 'xml':
        this.exportToXmlWithOptions(result);
        break;
      default:
        this.isExporting = false;
        this.showNotification('Unsupported export format', 'error');
    }
  }

  private exportToPdfWithOptions(options: ExportDialogResult): void {
    if (!this.modeler) {
      this.isExporting = false;
      return;
    }

    this.modeler.saveSVG({ format: true }).then((result: any) => {
      const svgString = result.svg;
      this.convertSvgToPdfWithOptions(svgString, options);
    }).catch((error: any) => {
      console.error('Error getting SVG:', error);
      this.showNotification('Error exporting: ' + error.message, 'error');
      this.isExporting = false;
    });
  }

  private convertSvgToPdfWithOptions(svgString: string, options: ExportDialogResult): void {
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      background: white;
      padding: 20px;
      width: auto;
      height: auto;
      z-index: -1000;
    `;

    const processedSVG = this.processSVGForPDF(svgString);
    tempContainer.innerHTML = processedSVG;
    document.body.appendChild(tempContainer);

    const svgElement = tempContainer.querySelector('svg');
    if (!svgElement) {
      this.showNotification('Could not extract diagram SVG', 'error');
      document.body.removeChild(tempContainer);
      this.isExporting = false;
      return;
    }

    this.enhanceSVGForPDF(svgElement);

    // Quality-based scaling
    let scale = 2;
    switch (options.quality) {
      case 'high': scale = 3; break;
      case 'medium': scale = 2; break;
      case 'low': scale = 1; break;
    }

    html2canvas(tempContainer, {
      useCORS: true,
      allowTaint: true,
      logging: false,

    }).then(canvas => {
      try {
        this.generatePDFWithOptions(canvas, options);
        this.showNotification(`Diagram exported to PDF successfully`, 'success');
      } catch (error: any) {
        this.showNotification('Error creating PDF: ' + error.message, 'error');
      }

      document.body.removeChild(tempContainer);
      this.isExporting = false;
    }).catch(error => {
      this.showNotification('Error converting to PDF: ' + error.message, 'error');
      document.body.removeChild(tempContainer);
      this.isExporting = false;
    });
  }

  private exportToSvgWithOptions(options: ExportDialogResult): void {
    if (!this.modeler) {
      this.isExporting = false;
      return;
    }

    this.modeler.saveSVG({ format: true }).then((result: any) => {
      const svgBlob = new Blob([result.svg], { type: 'image/svg+xml' });
      this.downloadBlob(svgBlob, options.fileName);
      this.showNotification('Diagram exported to SVG successfully', 'success');
      this.isExporting = false;
    }).catch((error: any) => {
      this.showNotification('Error exporting to SVG: ' + error.message, 'error');
      this.isExporting = false;
    });
  }

  private exportToPngWithOptions(options: ExportDialogResult): void {
    if (!this.modeler) {
      this.isExporting = false;
      return;
    }

    this.modeler.saveSVG({ format: true }).then((result: any) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.svg;
      tempDiv.style.position = 'absolute';
      tempDiv.style.top = '-10000px';
      tempDiv.style.backgroundColor = '#ffffff';
      document.body.appendChild(tempDiv);

      let scale = 2;
      switch (options.quality) {
        case 'high': scale = 4; break;
        case 'medium': scale = 2; break;
        case 'low': scale = 1; break;
      }

      html2canvas(tempDiv, {

        useCORS: true
      }).then(canvas => {
        canvas.toBlob((blob) => {
          if (blob) {
            this.downloadBlob(blob, options.fileName);
            this.showNotification('Diagram exported to PNG successfully', 'success');
          }
        }, 'image/png', 1.0);

        document.body.removeChild(tempDiv);
        this.isExporting = false;
      }).catch(error => {
        this.showNotification('Error exporting PNG: ' + error.message, 'error');
        document.body.removeChild(tempDiv);
        this.isExporting = false;
      });
    });
  }

  private exportToXmlWithOptions(options: ExportDialogResult): void {
    if (!this.modeler) {
      this.isExporting = false;
      return;
    }

    this.modeler.saveXML({ format: true }).then((result: any) => {
      const xmlBlob = new Blob([result.xml], { type: 'application/xml' });
      this.downloadBlob(xmlBlob, options.fileName);
      this.showNotification('Diagram exported to XML successfully', 'success');
      this.isExporting = false;
    }).catch((error: any) => {
      this.showNotification('Error exporting to XML: ' + error.message, 'error');
      this.isExporting = false;
    });
  }

  // =================== PDF PROCESSING HELPERS ===================

  private processSVGForPDF(svgString: string): string {
    // Clean up SVG for better PDF rendering
    let processedSVG = svgString
      .replace(/data-element-id="[^"]*"/g, '')
      .replace(/class="[^"]*djs-outline[^"]*"/g, '')
      .replace(/<g[^>]*class="djs-outline"[^>]*>.*?<\/g>/g, '');

    // Add basic styling
    processedSVG = processedSVG.replace('<svg',
      '<svg style="font-family: Arial, sans-serif; background: white;"');

    return processedSVG;
  }

  private enhanceSVGForPDF(svgElement: SVGSVGElement): void {
    // Ensure white background
    svgElement.style.background = 'white';
    svgElement.style.border = '1px solid #e0e0e0';
    svgElement.style.borderRadius = '8px';
    svgElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

    // Improve fonts
    const textElements = svgElement.querySelectorAll('text, tspan');
    textElements.forEach(element => {
      const textEl = element as SVGTextElement;
      textEl.style.fontFamily = 'Arial, Helvetica, sans-serif';
      textEl.style.fontSize = textEl.style.fontSize || '12px';

      if (!textEl.style.fill || textEl.style.fill === 'currentColor') {
        textEl.style.fill = '#333333';
      }
    });

    // Improve shapes
    const shapeElements = svgElement.querySelectorAll('rect, circle, ellipse, path, polygon');
    shapeElements.forEach(element => {
      const shapeEl = element as SVGElement;

      if (!shapeEl.style.stroke || shapeEl.style.stroke === 'none') {
        shapeEl.style.stroke = '#000000';
        shapeEl.style.strokeWidth = '1px';
      }
    });
  }

  private generatePDFWithOptions(canvas: HTMLCanvasElement, options: ExportDialogResult): void {
    // Determine paper dimensions
    let pdfWidth = 210, pdfHeight = 297; // A4 default

    switch (options.paperSize) {
      case 'a3': pdfWidth = 297; pdfHeight = 420; break;
      case 'letter': pdfWidth = 216; pdfHeight = 279; break;
      case 'tabloid': pdfWidth = 279; pdfHeight = 432; break;
      case 'auto':
        const aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) {
          pdfWidth = 297; pdfHeight = 210; // Landscape A4
        }
        break;
    }

    const pdf = new jsPDF(pdfWidth > pdfHeight ? 'l' : 'p', 'mm', [pdfWidth, pdfHeight]);

    // Header
    if (options.includeMetadata) {
      this.addPDFHeader(pdf, options.fileName);
    }

    // Calculate dimensions
    const margin = 15;
    const headerSpace = options.includeMetadata ? 45 : 15;
    const availableWidth = pdfWidth - (2 * margin);
    const availableHeight = pdfHeight - headerSpace - 20;

    const scaleX = availableWidth / (canvas.width * 0.264583);
    const scaleY = availableHeight / (canvas.height * 0.264583);
    const scale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = (canvas.width * 0.264583) * scale;
    const scaledHeight = (canvas.height * 0.264583) * scale;

    const x = margin + (availableWidth - scaledWidth) / 2;
    const y = headerSpace;

    const contentDataURL = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(contentDataURL, 'PNG', x, y, scaledWidth, scaledHeight, undefined, 'FAST');

    if (options.includeMetadata) {
      this.addPDFFooter(pdf, pdfWidth, pdfHeight);
    }

    pdf.save(options.fileName);
  }

  private addPDFHeader(pdf: jsPDF, fileName: string): void {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    const title = fileName.replace(/\.(bpmn|xml|pdf)$/, '');
    pdf.text(title, 15, 20);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('BPMN Process Diagram', 15, 28);

    pdf.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    pdf.text(`Generated: ${timestamp}`, 15, 35);

    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, 38, pdf.internal.pageSize.getWidth() - 15, 38);

    pdf.setTextColor(0, 0, 0);
  }

  private addPDFFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);

    const footerText = 'Generated by BPMN Modeler';
    const textWidth = pdf.getTextWidth(footerText);
    pdf.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);

    pdf.text('Page 1', pageWidth - 25, pageHeight - 10);
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
    const dialogRef = this.popup.open(DialogBoxComponent, {
      width: '400px',
      data: {
        title: 'File Exists',
        message: `File "${newFile.name}" already exists. Do you want to overwrite it?`,
        confirmText: 'Overwrite',
        cancelText: 'Cancel',
        type: 'warning'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.overwriteFile(newFile, existingFile);
      }
    });
  }

  private uploadNewFile(file: File, customName?: string): void {
    this.fileService.uploadFileToFolder(
      file,
      null,
      '',
      '',
      customName,
      false
    ).subscribe({
      next: (uploadedFile: AppFile) => {
        this.showNotification('File uploaded successfully', 'success');
        this.loadFilesOnly();
      },
      error: (error: any) => {
        this.showNotification('Error uploading file: ' + error.message, 'error');
      }
    });
  }

  private overwriteFile(newFile: File, existingFile: AppFile): void {
    this.fileService.uploadFileToFolder(
      newFile,
      null,
      '',
      '',
      undefined,
      true
    ).subscribe({
      next: (uploadedFile: AppFile) => {
        this.showNotification('File overwritten successfully', 'success');
        this.loadFilesOnly();
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

    console.log('Navigating to modeler...');
    this.router.navigate(['/modeler'], { queryParams: { new: true } });
  }

  navigateToDashboard(): void {
    console.log('Navigating to dashboard...');
    this.router.navigateByUrl('/dashboard');
  }

  // =================== UI HELPER METHODS ===================

  getItemCount(): string {
    const fileCount = this.appFile.length;
    return fileCount === 0 ? 'Empty' : `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
  }

  getFileTypeLabel(file: AppFile): string {
    if (file.fileName?.endsWith('.bpmn')) return 'BPMN';
    if (file.fileName?.endsWith('.xml')) return 'XML';
    return 'DIAGRAM';
  }

  getEmptyStateTitle(): string {
    return 'No files found';
  }

  getEmptyStateMessage(): string {
    return 'Start by creating your first BPMN diagram or uploading an existing one.';
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

  // =================== UTILITY METHODS ===================

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    console.log(`Notification [${type}]:`, message);

    const config = {
      duration: type === 'error' ? 5000 : 3000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center' as const,
      verticalPosition: 'bottom' as const
    };

    this.snackBar.open(message, 'Close', config);
  }


  get currentUserRole(): string {
    if (this.authenticationService.hasRole('ROLE_ADMIN')) return 'Administrator';
    if (this.authenticationService.hasRole('ROLE_MODELER')) return 'Modeler';
    if (this.authenticationService.hasRole('ROLE_VIEWER')) return 'Viewer';
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
    return 'All Files';
  }

  isInFolder(): boolean {
    return false;
  }

  hasFolderSupport(): boolean {
    return false;
  }

  shouldShowFolders(): boolean {
    return false;
  }

  shouldShowCreateFolderButton(): boolean {
    return false;
  }

  openCreateFolderDialog(): void {
    this.showNotification('Folder functionality is temporarily disabled.', 'info');
  }

  navigateToFolder(folderId: number): void {
    this.showNotification('Folder navigation is temporarily disabled.', 'info');
  }

  navigateToRoot(): void {
    if (!this.authService.isAuthenticated()) {
      console.error('Dashboard: User not authenticated for modeler access');
      this.router.navigate(['/dashoard']);
    }
  }

  deleteFolder(id: number, folder: any): void {
    this.showNotification('Folder operations are temporarily disabled.', 'info');
  }
  searchTerm: string = '';
  originalAppFile: any[] = [];
  filterFiles(): void {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      this.appFile = [...this.originalAppFile];
      return;
    }

    this.appFile = this.originalAppFile.filter(file =>
      file.fileName?.toLowerCase().includes(term)
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterFiles();
  }
}