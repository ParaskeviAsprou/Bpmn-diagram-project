import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Services
import { FileService } from '../../services/file.service';
import { AuthenticationService, User } from '../../services/authentication.service';
import { CustomProperty, CustomPropertyService } from '../../services/custom-properties.service';

// Components and Dialogs
import { MatDialog } from '@angular/material/dialog';
import { CustomPropertyDialogComponent, CustomPropertyDialogData, CustomPropertyDialogResult } from '../custom-property-dialog/custom-property-dialog.component';
import { SaveConfirmationDialogComponent, SaveConfirmationData, SaveConfirmationResult } from '../save-confirmation-dialog/save-confirmation-dialog.component';
import { ColorDialogComponent, ColorDialogData, ColorDialogResult } from '../color-dialog/color-dialog.component';
import { ExportDialogComponent, ExportDialogData, ExportDialogResult } from '../export-dialog-result/export-dialog-result.component'; // Ensure this is imported

import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';

// Material Components
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

  // =================== CORE PROPERTIES ===================
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

  // Current folder context
  private currentFolderContext = {
    folderId: undefined as number | undefined,
    folderName: 'Root',
    path: '/'
  };

  // Custom Properties
  elementCustomProperties: CustomProperty[] = [];

  // Element colors storage
  private elementColors: { [elementId: string]: { fill?: string; stroke?: string } } = {};

  // Export formats configuration
  exportFormats: ExportFormat[] = [
    { format: 'pdf', label: 'Export as PDF', icon: 'picture_as_pdf', description: 'Portable Document Format' },
    { format: 'svg', label: 'Export as SVG', icon: 'image', description: 'Scalable Vector Graphics' },
    { format: 'png', label: 'Export as PNG', icon: 'image', description: 'Portable Network Graphics' },
    { format: 'xml', label: 'Export as XML', icon: 'code', description: 'BPMN XML Source' }
  ];

  // User and Permissions
  currentUser: User | null = null;
  canEdit: boolean = false;
  canView: boolean = false;
  canCreate: boolean = false;
  canDelete: boolean = false;

  // Editable properties
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

  // =================== LIFECYCLE HOOKS ===================

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

        // Load file if there was one
        if (state.fileId) {
          this.loadFileById(state.fileId);
        }

        // Show notification about unsaved changes
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
      // Αν δεν έχει αρχείο, ανοίγει το save dialog
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

    // Άμεση αποθήκευση στο υπάρχον αρχείο
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


  // =================== INITIALIZATION ===================

  private initializePermissions(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.canView = this.authService.canView();
    this.canEdit = this.authService.canEdit();
    this.canCreate = this.authService.canEdit();
    this.canDelete = this.authService.isAdmin();

    this.isViewerOnly = this.authService.isViewer() &&
      !this.authService.isModeler() &&
      !this.authService.isAdmin();
  }

  private initializeModeler(): void {
    try {
      const ModelerClass = this.isViewerOnly ? BpmnViewer : BpmnModeler;

      this.modeler = new ModelerClass({
        container: this.modelerContainer.nativeElement,
        keyboard: { bindTo: window }
      });

      this.setupEventListeners();

      // Load initial diagram
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

    // Selection management
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
      // Change detection
      this.modeler.on('element.changed', () => {
        this.markAsChanged();
      });

      this.modeler.on('commandStack.changed', () => {
        this.markAsChanged();
      });
    }
  }

  // =================== SAVE FUNCTIONALITY WITH DIALOG ===================

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

        // Προχωράμε στην αποθήκευση
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

  // Keep existing save methods but make them private
  private saveAsNewFile(xml: string, fileName: string, customProperties: any, elementColors: any): void {
    // ΤΡΙΤΟΣ ΕΛΕΓΧΟΣ: Πριν τη HTTP κλήση
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

        // Ασφαλής navigation χωρίς reload
        if (savedFile.id) {
          this.updateUrlWithoutReload(savedFile.id);
        }
      },
      error: (error: any) => {
        console.error('Error saving file:', error);
        this.isSaving = false;

        // ΒΕΛΤΙΩΜΕΝΟ error handling - δεν κάνει logout για κάθε error
        this.handleSaveError(error, 'saving');
      }
    });
  }
  private updateExistingFile(xml: string, customProperties: any, elementColors: any): void {
    if (!this.currentFile?.id) {
      this.isSaving = false;
      return;
    }

    // ΤΡΙΤΟΣ ΕΛΕΓΧΟΣ: Πριν τη HTTP κλήση
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

        // ΒΕΛΤΙΩΜΕΝΟ error handling
        this.handleSaveError(error, 'updating');
      }
    });
  }
  private handleSaveError(error: any, operation: string): void {
    let errorMessage = `Error ${operation} file`;
    let shouldLogout = false;

    console.error(`Save error during ${operation}:`, error);

    if (error.status === 401) {
      // Authentication error - logout required
      errorMessage = 'Your session has expired. Please log in again.';
      shouldLogout = true;
    } else if (error.status === 403) {
      // Authorization error - but don't logout, user might lack specific permissions
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.status === 0) {
      // Network error - don't logout
      errorMessage = 'Network connection error. Please check your internet connection and try again.';
    } else if (error.status === 409) {
      // Conflict error (e.g., file already exists) - don't logout
      errorMessage = error.error?.message || 'File conflict. The file may already exist or be locked by another user.';
    } else if (error.status === 413) {
      // Payload too large - don't logout
      errorMessage = 'The diagram is too large to save. Please try reducing its complexity.';
    } else if (error.status === 422) {
      // Validation error - don't logout
      errorMessage = error.error?.message || 'Invalid diagram data. Please check your diagram and try again.';
    } else if (error.status >= 500) {
      // Server errors - don't logout, might be temporary
      errorMessage = 'Server error. Please try again in a few moments.';
    } else if (error.error?.message) {
      errorMessage += ': ' + error.error.message;
    } else if (error.message) {
      errorMessage += ': ' + error.message;
    }

    this.showNotification(errorMessage, 'error');

    // Κάνουμε logout ΜΟΝΟ για authentication errors
    if (shouldLogout) {
      setTimeout(() => {
        this.redirectToLogin();
      }, 2000); // Δίνουμε χρόνο στο χρήστη να διαβάσει το μήνυμα
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
    // Ενημέρωση URL χωρίς page reload
    const url = this.router.createUrlTree(['/bpmn-modeler'], {
      queryParams: {
        fileId: fileId,
        folderId: this.currentFolderContext.folderId,
        folderName: this.currentFolderContext.folderName
      }
    });

    // Χρήση replaceState αντί για navigate για να αποφύγουμε reload
    window.history.replaceState({}, '', url.toString());
  }

  // =================== EXPORT FUNCTIONALITY WITH DIALOG ===================

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
      fileName: this.currentFile.fileName,
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

  private processExportResult(result: ExportDialogResult): void {
    if (!this.currentFile?.id) return;

    this.isExporting = true;

    this.fileService.exportFile(this.currentFile.id, result.format).subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, result.fileName);
        this.isExporting = false;
        this.showNotification(`Diagram exported as ${result.format.toUpperCase()} successfully`, 'success');
      },
      error: (error: any) => {
        this.isExporting = false;
        this.showNotification(`Error exporting as ${result.format.toUpperCase()}: ` + error.message, 'error');
      }
    });
  }

  // Legacy export methods for backwards compatibility - these now just open the dialog
  exportDiagram(format: ExportFormat['format']): void {
    this.openExportDialog();
  }

  // =================== CUSTOM PROPERTIES WITH NEW DIALOG ===================

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

  // =================== UTILITY METHODS (keep existing ones) ===================

  createNewDiagram(): void {
    if (!this.canCreate) {
      this.showNotification('You do not have permission to create new diagrams.', 'error');
      return;
    }

    if (this.hasUnsavedChanges) {
      // Replaced confirm with showNotification as per instructions
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

  // Keep all existing methods for zoom, colors, properties, etc.
  // [All the existing methods remain the same - zoomIn, zoomOut, setElementColor, etc.]

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

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
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
        // Replaced confirm with showNotification as per instructions
        this.showNotification('You have unsaved changes. Please save or discard them before opening a new file.', 'warning');
        input.value = ''; // Clear the input so the same file can be selected again
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
  private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 λεπτά (αντί για 1 λεπτό)

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, this.AUTO_SAVE_INTERVAL);
  }


  private performAutoSave(): void {
    // Έλεγχος προϋποθέσεων για auto-save
    if (!this.hasUnsavedChanges || !this.currentFile || !this.canEdit) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
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

              // Για auto-save, δεν εμφανίζουμε error notifications
              // Αλλά σταματάμε το auto-save αν έχουμε authentication error
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

  // =================== GETTERS ===================

  get currentDiagramName(): string {
    return this.currentFile?.fileName || 'New Diagram';
  }

  get currentUserRole(): string {
    if (this.authService.isAdmin()) return 'Administrator';
    if (this.authService.isModeler()) return 'Modeler';
    if (this.authService.isViewer()) return 'Viewer';
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

  // Keep all other existing methods...
  // [Include all the remaining methods from the original component]

  // Add missing methods to prevent compilation errors
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

}
