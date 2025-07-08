import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf'
import { FileService } from '../../services/file.service';
import { AuthenticationService, User } from '../../services/authentication.service';
import { CustomProperty, CustomPropertyService } from '../../services/custom-properties.service';
import { MatDialog } from '@angular/material/dialog';
import { CustomPropertyDialogComponent, CustomPropertyDialogData, CustomPropertyDialogResult } from '../custom-property-dialog/custom-property-dialog.component';
import { SaveConfirmationDialogComponent, SaveConfirmationData, SaveConfirmationResult } from '../save-confirmation-dialog/save-confirmation-dialog.component';
import { ColorDialogComponent, ColorDialogData, ColorDialogResult } from '../color-dialog/color-dialog.component';
import { ExportDialogComponent, ExportDialogData, ExportDialogResult } from '../export-dialog-result/export-dialog-result.component';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AppFile } from '../../models/File';


export interface ExportFormat {
  format: 'pdf' | 'svg' | 'png' | 'xml';
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-bpmn-modeler',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './bpmn-modeler.component.html',
  styleUrl: './bpmn-modeler.component.css'
})
export class BpmnModelerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('modelerContainer', { static: true }) modelerContainer!: ElementRef;
  private modeler!: BpmnModeler | BpmnViewer;
  private destroy$ = new Subject<void>();

  // State Management
  currentFile: AppFile | null = null;
  selectedElement: any = null;
  isEditMode: boolean = false;
  isViewerOnly: boolean = false;
  hasUnsavedChanges: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  isExporting: boolean = false;
  changeCount: number = 0;
  lastSaveTime: Date | null = null;
  showExportDropdown: boolean = false;


  private currentFolderContext = {
    folderId: undefined as number | undefined,
    folderName: 'Root',
    path: '/'
  };


  elementCustomProperties: CustomProperty[] = [];


  private elementColors: { [elementId: string]: { fill?: string; stroke?: string } } = {};


  exportFormats: ExportFormat[] = [
    { format: 'pdf', label: 'Export as PDF', icon: 'picture_as_pdf', description: 'Portable Document Format' },
    { format: 'svg', label: 'Export as SVG', icon: 'image', description: 'Scalable Vector Graphics' },
    { format: 'png', label: 'Export as PNG', icon: 'image', description: 'Portable Network Graphics' },
    { format: 'xml', label: 'Export as XML', icon: 'code', description: 'BPMN XML Source' }
  ];


  currentUser: User | null = null;
  canEdit: boolean = false;
  canView: boolean = false;
  canCreate: boolean = false;
  canDelete: boolean = false;

 editableProperties: any = {
    name: '',
    id: '',
    documentation: ''
  };

  readonly popup = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);

  private defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  constructor(
    public authService: AuthenticationService,
    private fileService: FileService,
    private route: ActivatedRoute,
    private router: Router,
    private customPropertyService: CustomPropertyService
  ) { }

  

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          // Ctrl+S = quick save, Ctrl+Shift+S = save as
          if (event.shiftKey) {
            this.openSaveDialog();
          } else {
            this.quickSave();
          }
          break;
        case 'o':
          event.preventDefault();
          this.openFileDialog();
          break;
        case 'n':
          event.preventDefault();
          this.createNewDiagram();
          break;
        case 'e':
          event.preventDefault();
          this.openExportDialog();
          break;
      }
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  ngOnInit(): void {
    this.initializePermissions();
    this.customPropertyService.initialize();

    // Subscribe to authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.currentUser = user;
        this.initializePermissions();

        if (user) {
          this.startAutoSave();
          this.restoreStateAfterLogin();
        } else {
          if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
          }
        }
      });

    // Handle route parameters
    this.route.queryParams.subscribe(params => {
      this.loadFolderContext(params);

      if (params['fileId']) {
        this.loadFileById(parseInt(params['fileId']));
      } else if (params['new']) {
        this.createNewDiagram();
      }
    });
  }

  private restoreStateAfterLogin(): void {
    const savedState = sessionStorage.getItem('bpmn_return_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);

        // Restore folder context
        this.currentFolderContext = {
          folderId: state.folderId,
          folderName: state.folderName || 'Root',
          path: state.folderId ? `/${state.folderName}` : '/'
        };

        if (state.fileId) {
          this.loadFileById(state.fileId);
        }


        if (state.hasUnsavedChanges) {
          this.showNotification('Welcome back! You had unsaved changes. Please remember to save your work.', 'warning');
        }

        sessionStorage.removeItem('bpmn_return_state');
      } catch (error) {
        console.error('Error restoring state:', error);
        sessionStorage.removeItem('bpmn_return_state');
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    if (this.modeler) {
      this.modeler.destroy();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeModeler();
    }, 100);
  }

  quickSave(): void {
    if (!this.canEdit) {
      this.showNotification('You do not have permission to save diagrams.', 'error');
      return;
    }

    if (!this.currentFile) {
      this.openSaveDialog();
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.showNotification('Your session has expired. Please log in again.', 'error');
      this.redirectToLogin();
      return;
    }

    if (!this.hasUnsavedChanges) {
      this.showNotification('No changes to save.', 'success');
      return;
    }
    this.modeler.saveXML({ format: true })
      .then((xmlResult: any) => {
        const xml = xmlResult.xml;
        const customProperties = this.getAllCustomProperties();
        const elementColors = this.elementColors;

        this.updateExistingFile(xml, customProperties, elementColors);
      })
      .catch((error: any) => {
        console.error('Error in quick save:', error);
        this.showNotification('Error saving diagram: ' + error.message, 'error');
      });
  }

  private initializePermissions(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.canView = this.authService.hasRole('ROLE_VIEWER') ||
      this.authService.hasRole('ROLE_MODELER') ||
      this.authService.hasRole('ROLE_ADMIN');

    this.canEdit = this.authService.hasRole('ROLE_MODELER') ||
      this.authService.hasRole('ROLE_ADMIN');

    this.canCreate = this.authService.hasRole('ROLE_MODELER') ||
      this.authService.hasRole('ROLE_ADMIN');

    this.canDelete = this.authService.hasRole('ROLE_ADMIN');

    this.isViewerOnly = this.authService.hasRole('ROLE_VIEWER') &&
      !this.authService.hasRole('ROLE_MODELER') &&
      !this.authService.hasRole('ROLE_ADMIN');

    console.log('Modeler permissions initialized:', {
      canView: this.canView,
      canEdit: this.canEdit,
      canCreate: this.canCreate,
      canDelete: this.canDelete,
      isViewerOnly: this.isViewerOnly
    });
  }

  private initializeModeler(): void {
    try {
      const ModelerClass = this.isViewerOnly ? BpmnViewer : BpmnModeler;

      this.modeler = new ModelerClass({
        container: this.modelerContainer.nativeElement,
        keyboard: { bindTo: window }
      });

      this.setupEventListeners();


      if (this.currentFile) {
        this.loadDiagramFromFile(this.currentFile);
      } else {
        this.loadDiagram(this.defaultXml);
      }

    } catch (error) {
      console.error('Error initializing BPMN modeler:', error);
      this.showNotification('Failed to initialize diagram editor', 'error');
    }
  }

  private setupEventListeners(): void {
    if (!this.modeler) return;


    this.modeler.on('selection.changed', (e: any) => {
      const element = e.newSelection[0];
      this.selectedElement = element || null;
      this.isEditMode = false;

      if (this.selectedElement) {
        this.loadElementProperties();
        this.loadCustomProperties();
      }
    });

    if (!this.isViewerOnly) {
     this.modeler.on('element.changed', () => {
        this.markAsChanged();
      });

      this.modeler.on('commandStack.changed', () => {
        this.markAsChanged();
      });
    }
  }

  openSaveDialog(): void {
    if (!this.canEdit) {
      this.showNotification('You do not have permission to save diagrams.', 'error');
      return;
    }

    if (!this.modeler || !('saveXML' in this.modeler)) {
      this.showNotification('Cannot save in viewer mode.', 'error');
      return;
    }

    // ΒΑΣΙΚΟΣ ΕΛΕΓΧΟΣ: Χρησιμοποιούμε την isAuthenticated() του service
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Your session has expired. Please log in again.', 'error');
      this.redirectToLogin();
      return;
    }

    const dialogData: SaveConfirmationData = {
      fileName: this.currentFile?.fileName || 'new_diagram.bpmn',
      isNewFile: !this.currentFile,
      hasChanges: this.hasUnsavedChanges,
      changeCount: this.changeCount,
      lastSaveTime: this.lastSaveTime ?? undefined,
      fileExists: false,
      folderName: this.currentFolderContext.folderName
    };

    const dialogRef = this.popup.open(SaveConfirmationDialogComponent, {
      width: '700px',
      data: dialogData,
      disableClose: this.hasUnsavedChanges
    });

    dialogRef.afterClosed().subscribe((result: SaveConfirmationResult) => {
      if (result && result.action !== 'cancel') {
        this.processSaveResult(result);
      }
    });
  }

  private processSaveResult(result: SaveConfirmationResult): void {
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Your session has expired. Please log in again.', 'error');
      this.redirectToLogin();
      return;
    }

    // Έλεγχος αν το token είναι έγκυρο για save operation
    this.authService.ensureValidToken().subscribe({
      next: (isValid) => {
        if (!isValid) {
          this.showNotification('Your session is not valid for this operation.', 'error');
          this.redirectToLogin();
          return;
        }

      
        this.performSave(result);
      },
      error: (error) => {
        console.error('Token validation failed:', error);
        this.showNotification('Your session has expired. Please log in again.', 'error');
        this.redirectToLogin();
      }
    });
  }

  private performSave(result: SaveConfirmationResult): void {
    if (!this.isUserAuthenticated()) {
      this.showNotification('Your session has expired. Please log in again.', 'error');
      this.redirectToLogin();
      return;
    }

    this.modeler.saveXML({ format: true })
      .then((xmlResult: any) => {
        const xml = xmlResult.xml;
        const customProperties = this.getAllCustomProperties();
        const elementColors = this.elementColors;

        if (result.action === 'saveAs' && result.fileName) {
          this.saveAsNewFile(xml, result.fileName, customProperties, elementColors);
        } else {
          if (this.currentFile) {
            this.updateExistingFile(xml, customProperties, elementColors);
          } else {
            this.saveAsNewFile(xml, result.fileName || 'new_diagram.bpmn', customProperties, elementColors);
          }
        }
      })
      .catch((error: any) => {
        console.error('Error saving diagram:', error);
        this.showNotification('Error saving diagram: ' + error.message, 'error');
      });
  }

  private saveAsNewFile(xml: string, fileName: string, customProperties: any, elementColors: any): void {
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Your session has expired. Please log in again.', 'error');
      this.redirectToLogin();
      return;
    }

    this.isSaving = true;

    this.fileService.saveBpmnDiagramWithOverwrite(
      fileName,
      xml,
      customProperties,
      elementColors,
      this.currentFolderContext.folderId || undefined,
      false
    ).subscribe({
      next: (savedFile: AppFile) => {
        this.currentFile = savedFile;
        this.hasUnsavedChanges = false;
        this.changeCount = 0;
        this.lastSaveTime = new Date();
        this.isSaving = false;
        this.showNotification('Diagram saved successfully as ' + fileName, 'success');


        if (savedFile.id) {
          this.updateUrlWithoutReload(savedFile.id);
        }
      },
      error: (error: any) => {
        console.error('Error saving file:', error);
        this.isSaving = false;
        this.handleSaveError(error, 'saving');
      }
    });
  }

  private updateExistingFile(xml: string, customProperties: any, elementColors: any): void {
    if (!this.currentFile?.id) {
      this.isSaving = false;
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.showNotification('Your session has expired. Please log in again.', 'error');
      this.redirectToLogin();
      return;
    }

    this.isSaving = true;

    this.fileService.updateFileContent(
      this.currentFile.id,
      xml,
      JSON.stringify(customProperties),
      JSON.stringify(elementColors)
    ).subscribe({
      next: (updatedFile: AppFile) => {
        this.currentFile = updatedFile;
        this.hasUnsavedChanges = false;
        this.changeCount = 0;
        this.lastSaveTime = new Date();
        this.isSaving = false;
        this.showNotification('Diagram updated successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error updating file:', error);
        this.isSaving = false;
        this.handleSaveError(error, 'updating');
      }
    });
  }

  private handleSaveError(error: any, operation: string): void {
    let errorMessage = `Error ${operation} file`;
    let shouldLogout = false;

    console.error(`Save error during ${operation}:`, error);
    if (error.status === 401) {
      errorMessage = 'Your session has expired. Please log in again.';
      shouldLogout = true;
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 0) {
      errorMessage = 'Network connection error. Please check your internet connection and try again.';
    } else if (error.status === 409) {
      errorMessage = error.error?.message || 'File conflict occurred.';
    } else if (error.status === 413) {
      errorMessage = 'The diagram is too large to save. Please try reducing its complexity.';
    } else if (error.status === 422) {
      errorMessage = error.error?.message || 'Invalid diagram data.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again in a few moments.';
    } else if (error.error?.message) {
      errorMessage += ': ' + error.error.message;
    } else if (error.message) {
      errorMessage += ': ' + error.message;
    }

    this.showNotification(errorMessage, 'error');
    if (shouldLogout) {
      setTimeout(() => {
        this.redirectToLogin();
      }, 2000);
    }
  }

  private redirectToLogin(): void {
    // Αποθήκευση του current state πριν το redirect
    const currentState = {
      fileId: this.currentFile?.id,
      folderId: this.currentFolderContext.folderId,
      folderName: this.currentFolderContext.folderName,
      hasUnsavedChanges: this.hasUnsavedChanges,
      url: this.router.url
    };

    sessionStorage.setItem('bpmn_return_state', JSON.stringify(currentState));

    // Logout και redirect
    this.authService.logout();
  }

  private updateUrlWithoutReload(fileId: number): void {
    try {
      const queryParams: any = {
        fileId: fileId
      };

      if (this.currentFolderContext.folderId) {
        queryParams.folderId = this.currentFolderContext.folderId;
        queryParams.folderName = this.currentFolderContext.folderName;
      }

      const url = this.router.createUrlTree(['/modeler'], { queryParams });

      window.history.replaceState({}, '', url.toString());

      console.log('URL updated without reload:', url.toString());
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  }

  openExportDialog(): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to export diagrams.', 'error');
      return;
    }

    if (!this.currentFile?.id) {
      this.showNotification('Please save the diagram first before exporting.', 'warning');
      return;
    }

    const dialogData: ExportDialogData = {
      fileName: this.currentFile.fileName || 'diagram',
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

  exportDiagram(format: 'pdf' | 'svg' | 'png' | 'xml'): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to export diagrams.', 'error');
      return;
    }

    this.showExportDropdown = false;

    this.openExportDialog();
  }

  private processExportResult(result: ExportDialogResult): void {
    if (!this.currentFile?.id) return;

    this.isExporting = true;
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

 private processSVGForPDF(svgString: string): string {
  let processedSVG = svgString
    .replace(/data-element-id="[^"]*"/g, '')
    //.replace(/class="[^"]*djs-outline[^"]*"/g, '')
    //.replace(/<g[^>]*class="djs-outline"[^>]*>.*?<\/g>/gs, '') 
    .replace(/stroke="none"/g, '')
    .replace(/stroke-width="0"/g, '');

  processedSVG = processedSVG.replace('<svg',
    '<svg style="font-family: Arial, sans-serif; background: white;"');

  return processedSVG;
}


  private enhanceSVGForPDF(svgElement: SVGSVGElement): void {
    svgElement.style.background = 'white';

    const textElements = svgElement.querySelectorAll('text, tspan');
    textElements.forEach(element => {
      const textEl = element as SVGTextElement;
      textEl.style.fontFamily = 'Arial, Helvetica, sans-serif';
      textEl.style.fontSize = textEl.style.fontSize || '12px';
      if (!textEl.style.fill || textEl.style.fill === 'currentColor') {
        textEl.style.fill = '#333333';
      }
    });

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
    let pdfWidth = 210, pdfHeight = 297;

    switch (options.paperSize) {
      case 'a3': pdfWidth = 297; pdfHeight = 420; break;
      case 'letter': pdfWidth = 216; pdfHeight = 279; break;
      case 'tabloid': pdfWidth = 279; pdfHeight = 432; break;
      case 'auto':
        const aspectRatio = canvas.width / canvas.height;
        if (aspectRatio > 1) {
          pdfWidth = 297; pdfHeight = 210;
        }
        break;
    }

    const pdf = new jsPDF(pdfWidth > pdfHeight ? 'l' : 'p', 'mm', [pdfWidth, pdfHeight]);

    if (options.includeMetadata) {
      this.addPDFHeader(pdf, options.fileName);
    }

  
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

  openCustomPropertiesDialog(): void {
    if (!this.customPropertyService.canManageProperties()) {
      this.showNotification('You do not have permission to manage custom properties.', 'error');
      return;
    }

    if (!this.selectedElement) {
      this.showNotification('Please select an element first.', 'warning');
      return;
    }

    const dialogData: CustomPropertyDialogData = {
      elementId: this.selectedElement.id,
      elementType: this.selectedElement.type,
      elementName: this.selectedElement.businessObject?.name || this.selectedElement.id,
      existingProperties: this.elementCustomProperties
    };

    const dialogRef = this.popup.open(CustomPropertyDialogComponent, {
      width: '1000px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: CustomPropertyDialogResult) => {
      if (result) {
        this.onCustomPropertiesSave(result.properties);
      }
    });
  }

  private onCustomPropertiesSave(properties: CustomProperty[]): void {
    if (!this.selectedElement) return;

    try {
      this.customPropertyService.setElementProperties(this.selectedElement.id, properties);
      this.elementCustomProperties = properties;
      this.markAsChanged();
      this.showNotification(`Custom properties updated for ${this.selectedElement.type}`, 'success');
    } catch (error: any) {
      console.error('Error saving custom properties:', error);
      this.showNotification('Error saving custom properties: ' + error.message, 'error');
    }
  }

  // =================== CHANGE TRACKING ===================

  private markAsChanged(): void {
    this.hasUnsavedChanges = true;
    this.changeCount++;
  }

  // =================== UTILITY METHODS ===================

  createNewDiagram(): void {
    if (!this.canCreate) {
      this.showNotification('You do not have permission to create new diagrams.', 'error');
      return;
    }

    if (this.hasUnsavedChanges) {
      this.showNotification('You have unsaved changes. Please save or discard them before creating a new diagram.', 'warning');
      return;
    }

    this.resetToNewDiagram();
  }

  private resetToNewDiagram(): void {
    this.currentFile = null;
    this.elementColors = {};
    this.changeCount = 0;
    this.lastSaveTime = null;
    this.loadDiagram(this.defaultXml);
    this.selectedElement = null;
    this.isEditMode = false;
    this.hasUnsavedChanges = false;
    this.showNotification('New diagram ready', 'success');
  }

  private loadFolderContext(params: any): void {
    const folderId = params['folderId'];
    const folderName = params['folderName'] || 'Root';

    this.currentFolderContext = {
      folderId: folderId ? parseInt(folderId) : undefined,
      folderName: folderName,
      path: folderId ? `/${folderName}` : '/'
    };

    console.log('Loaded folder context:', this.currentFolderContext);
  }

  exportAsArchive(): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to export diagrams.', 'error');
      return;
    }

    if (!this.currentFile?.id) {
      this.showNotification('Please save the diagram first before exporting.', 'warning');
      return;
    }

    this.isExporting = true;

    this.fileService.exportFileAsArchive(this.currentFile.id).subscribe({
      next: (blob: Blob) => {
        const fileName = `${this.currentFile?.fileName?.replace(/\.(bpmn|xml)$/, '') || 'diagram'}_archive.zip`;
        this.downloadBlob(blob, fileName);
        this.isExporting = false;
        this.showNotification('Diagram exported as archive successfully', 'success');
      },
      error: (error: any) => {
        this.isExporting = false;
        this.showNotification('Error exporting as archive: ' + error.message, 'error');
      }
    });
  }

  private isUserAuthenticated(): boolean {
    const isAuth = this.authService.isAuthenticated();
    const hasToken = !!this.authService.getToken();
    const hasUser = !!this.authService.getCurrentUser();

    console.log('Authentication check:', {
      isAuthenticated: isAuth,
      hasToken: hasToken,
      hasUser: hasUser
    });

    return isAuth && hasToken && hasUser;
  }

  private loadFileById(fileId: number): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to view files.', 'error');
      return;
    }

    this.isLoading = true;

    this.fileService.getFileById(fileId).subscribe({
      next: (file: AppFile) => {
        this.currentFile = file;
        this.loadDiagramFromFile(file);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading file:', error);
        this.isLoading = false;
        this.showNotification('Error loading file: ' + error.message, 'error');
      }
    });
  }

  private loadDiagramFromFile(file: AppFile): void {
    if (!this.modeler) {
      console.error('Modeler not initialized');
      return;
    }

    const xmlContent = file.xml || (file.base64Data ? atob(file.base64Data) : '');

    this.modeler.importXML(xmlContent)
      .then(() => {
        if (file.customProperties) {
          try {
            const customProps = JSON.parse(file.customProperties);
            Object.keys(customProps).forEach(elementId => {
              this.customPropertyService.setElementProperties(elementId, customProps[elementId]);
            });
          } catch (e) {
            console.warn('Could not parse custom properties:', e);
          }
        }

        if (file.elementColors) {
          try {
            this.elementColors = JSON.parse(file.elementColors);
            this.applyStoredColors();
          } catch (e) {
            console.warn('Could not parse element colors:', e);
          }
        }

        this.hasUnsavedChanges = false;
        this.changeCount = 0;
        this.lastSaveTime = file.updatedTime ? new Date(file.updatedTime) : null;
        this.showNotification(`Diagram "${file.fileName}" loaded successfully`, 'success');
      })
      .catch((error: any) => {
        console.error('Error loading diagram:', error);
        this.showNotification('Error loading diagram: ' + error.message, 'error');
        this.loadDiagram(this.defaultXml);
      });
  }

  private loadDiagram(xml: string): void {
    if (!this.modeler) {
      console.error('Modeler not initialized');
      return;
    }

    if (!xml || xml.trim().length === 0) {
      xml = this.defaultXml;
    }

    this.modeler.importXML(xml)
      .then(() => {
        this.zoomToFit();
        this.hasUnsavedChanges = false;
        this.changeCount = 0;
        this.applyStoredColors();
      })
      .catch((error: any) => {
        console.error('Error loading diagram:', error);
        if (xml !== this.defaultXml) {
          this.loadDiagram(this.defaultXml);
        } else {
          this.showNotification('Error loading diagram: ' + error.message, 'error');
        }
      });
  }

  zoomIn(): void {
    if (this.modeler && 'get' in this.modeler) {
      const canvas = this.modeler.get('canvas');
      const zoom = canvas.zoom();
      canvas.zoom(Math.min(zoom + 0.1, 4.0));
    }
  }

  zoomOut(): void {
    if (this.modeler && 'get' in this.modeler) {
      const canvas = this.modeler.get('canvas');
      const zoom = canvas.zoom();
      canvas.zoom(Math.max(zoom - 0.1, 0.1));
    }
  }

  zoomToFit(): void {
    if (this.modeler && 'get' in this.modeler) {
      const canvas = this.modeler.get('canvas');
      canvas.zoom('fit-viewport');
    }
  }

  setElementColor(): void {
    if (!this.canEdit || !this.selectedElement) {
      this.showNotification('No element selected or insufficient permissions.', 'error');
      return;
    }

    const currentColors = this.elementColors[this.selectedElement.id] || {};

    const dialogData: ColorDialogData = {
      elementId: this.selectedElement.id,
      elementType: this.selectedElement.type,
      elementName: this.selectedElement.businessObject?.name || this.selectedElement.id,
      currentColors: {
        fill: currentColors.fill,
        stroke: currentColors.stroke
      }
    };

    const dialogRef = this.popup.open(ColorDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: ColorDialogResult | null) => {
      if (result) {
        this.updateElementColor(result.fill, result.stroke);
        this.showNotification(`Applied ${result.colorName} color to element`, 'success');
      }
    });
  }

  private updateElementColor(fill: string | null, stroke: string | null): void {
    if (!this.modeler || !('get' in this.modeler) || !this.selectedElement) {
      return;
    }

    try {
      const modeling = this.modeler.get('modeling');
      const colors: any = {};

      if (fill !== null) colors.fill = fill;
      if (stroke !== null) colors.stroke = stroke;

      if (fill === null && stroke === null) {
        modeling.setColor(this.selectedElement, { fill: undefined, stroke: undefined });
        delete this.elementColors[this.selectedElement.id];
      } else {
        modeling.setColor(this.selectedElement, colors);
        this.elementColors[this.selectedElement.id] = colors;
      }

      this.markAsChanged();
    } catch (error: any) {
      console.error('Error updating element color:', error);
      this.showNotification('Error updating color: ' + error.message, 'error');
    }
  }

  private applyStoredColors(): void {
    if (!this.modeler || !('get' in this.modeler)) return;

    try {
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');

      Object.keys(this.elementColors).forEach(elementId => {
        const element = elementRegistry.get(elementId);
        if (element) {
          const colors = this.elementColors[elementId];
          modeling.setColor(element, colors);
        }
      });
    } catch (error) {
      console.error('Error applying stored colors:', error);
    }
  }

  private loadCustomProperties(): void {
    if (!this.selectedElement) {
      this.elementCustomProperties = [];
      return;
    }

    this.elementCustomProperties = this.customPropertyService.getElementProperties(this.selectedElement.id);
  }

  getCustomPropertiesCount(): number {
    return this.elementCustomProperties.length;
  }

  hasCustomProperties(): boolean {
    return this.elementCustomProperties.length > 0;
  }

  toggleEditMode(): void {
    if (!this.canEdit) {
      this.showNotification('You do not have permission to edit element properties.', 'error');
      return;
    }

    if (this.isEditMode) {
      this.saveProperties();
    } else {
      this.isEditMode = true;
    }
  }

  saveProperties(): void {
    if (!this.canEdit || !this.selectedElement || !this.selectedElement.businessObject) {
      return;
    }

    if (!this.modeler || !('get' in this.modeler)) {
      this.showNotification('Cannot edit properties in viewer mode.', 'error');
      return;
    }

    try {
      const modeling = this.modeler.get('modeling');
      const bo = this.selectedElement.businessObject;

      if (this.editableProperties.name !== bo.name) {
        modeling.updateProperties(this.selectedElement, {
          name: this.editableProperties.name || undefined
        });
      }

      if (this.editableProperties.documentation !== (bo.documentation?.[0]?.text || '')) {
        const documentation = this.editableProperties.documentation ?
          [{ text: this.editableProperties.documentation }] : undefined;

        modeling.updateProperties(this.selectedElement, {
          documentation: documentation
        });
      }

      this.markAsChanged();
      this.isEditMode = false;
      this.showNotification('Properties saved successfully', 'success');

    } catch (error: any) {
      console.error('Error saving properties:', error);
      this.showNotification('Error saving properties: ' + error.message, 'error');
    }
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.loadElementProperties();
  }

  private loadElementProperties(): void {
    if (!this.selectedElement || !this.selectedElement.businessObject) {
      return;
    }

    const bo = this.selectedElement.businessObject;

    this.editableProperties = {
      name: bo.name || '',
      id: bo.id || '',
      documentation: bo.documentation?.[0]?.text || ''
    };
  }

  saveDiagram(): void {
    this.openSaveDialog();
  }

  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }

  goBackToFileList(): void {
    const queryParams: any = {};

    if (this.currentFolderContext.folderId) {
      queryParams.folderId = this.currentFolderContext.folderId;
      queryParams.folderName = this.currentFolderContext.folderName;
    }

    this.router.navigate(['/files'], { queryParams });
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Auto-save every 3 minutes
    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, 3 * 60 * 1000);
  }

  private performAutoSave(): void {
    if (!this.hasUnsavedChanges || !this.currentFile || !this.canEdit) {
      return;
    }

    if (!this.isUserAuthenticated()) {
      console.log('Auto-save cancelled: User not authenticated');
      clearInterval(this.autoSaveTimer);
      return;
    }

    if (!this.modeler || !('saveXML' in this.modeler)) {
      return;
    }

    console.log('Performing auto-save...');

    this.modeler.saveXML({ format: true })
      .then((xmlResult: any) => {
        const xml = xmlResult.xml;
        const customProperties = this.getAllCustomProperties();
        const elementColors = this.elementColors;

        if (this.currentFile?.id) {
          this.fileService.updateFileContent(
            this.currentFile.id,
            xml,
            JSON.stringify(customProperties),
            JSON.stringify(elementColors)
          ).subscribe({
            next: (updatedFile: AppFile) => {
              this.currentFile = updatedFile;
              this.hasUnsavedChanges = false;
              this.changeCount = 0;
              this.lastSaveTime = new Date();
              console.log('Auto-save completed successfully');
            },
            error: (error: any) => {
              console.warn('Auto-save failed:', error);
              if (error.status === 401 || error.status === 403) {
                clearInterval(this.autoSaveTimer);
                console.log('Auto-save disabled due to authentication error');
              }
            }
          });
        }
      })
      .catch((error: any) => {
        console.warn('Auto-save XML generation failed:', error);
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

  private showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const config = {
      duration: type === 'error' ? 5000 : 3000,
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, 'Close', config);
  }

  private openFileDialog(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.xml';
    input.onchange = (e: any) => this.onFileChange(e);
    input.click();
  }

  onFileChange(event: Event): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to open diagrams.', 'error');
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (this.hasUnsavedChanges) {
        this.showNotification('You have unsaved changes. Please save or discard them before opening a new file.', 'warning');
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        this.loadDiagram(content);
        this.hasUnsavedChanges = true;
      };
      reader.readAsText(file);

      input.value = '';
    }
  }

  private autoSaveTimer?: any;

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }


  get currentDiagramName(): string {
    return this.currentFile?.fileName || 'New Diagram';
  }

  get currentUserRole(): string {
    if (this.authService.hasRole('ROLE_ADMIN')) return 'Administrator';
    if (this.authService.hasRole('ROLE_MODELER')) return 'Modeler';
    if (this.authService.hasRole('ROLE_VIEWER')) return 'Viewer';
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

  get canManageCustomProperties(): boolean {
    return this.customPropertyService.canManageProperties() && this.selectedElement;
  }

  get canEditProperties(): boolean {
    return this.canEdit && this.selectedElement && !this.isViewerOnly;
  }
  
}