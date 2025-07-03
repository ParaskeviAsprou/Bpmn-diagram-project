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
import { CustomPropertyDialogComponent, CustomPropertyDialogData } from '../custom-property-dialog/custom-property-dialog.component';
import { ColorDialogComponent, ColorDialogData, ColorDialogResult } from '../color-dialog/color-dialog.component';

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const exportDropdown = target.closest('.export-dropdown');
    if (!exportDropdown && this.showExportDropdown) {
      this.showExportDropdown = false;
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          this.saveDiagram();
          break;
        case 'o':
          event.preventDefault();
          this.openFileDialog();
          break;
        case 'n':
          event.preventDefault();
          this.createNewDiagram();
          break;
      }
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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeModeler();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.modeler) {
      this.modeler.destroy();
    }
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

  // =================== DIAGRAM OPERATIONS ===================

  createNewDiagram(): void {
    if (!this.canCreate) {
      this.showNotification('You do not have permission to create new diagrams.', 'error');
      return;
    }

    if (this.hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to create a new diagram?')) {
        return;
      }
    }

    this.resetToNewDiagram();
  }

  private resetToNewDiagram(): void {
    this.currentFile = null;
    this.elementColors = {};
    this.loadDiagram(this.defaultXml);
    this.selectedElement = null;
    this.isEditMode = false;
    this.hasUnsavedChanges = false;
    this.showNotification('New diagram ready', 'success');
  }

  saveDiagram(): void {
    if (!this.canEdit) {
      this.showNotification('You do not have permission to save diagrams.', 'error');
      return;
    }

    if (!this.modeler || !('saveXML' in this.modeler)) {
      this.showNotification('Cannot save in viewer mode.', 'error');
      return;
    }

    this.isSaving = true;

    this.modeler.saveXML({ format: true })
      .then((result: any) => {
        const xml = result.xml;

        if (this.currentFile) {
          this.updateExistingFile(xml);
        } else {
          this.saveAsNewFile(xml);
        }
      })
      .catch((error: any) => {
        console.error('Error saving diagram:', error);
        this.showNotification('Error saving diagram: ' + error.message, 'error');
        this.isSaving = false;
      });
  }

  private saveAsNewFile(xml: string): void {
    const fileName = prompt('Enter filename:', 'new_diagram.bpmn');
    if (!fileName) {
      this.isSaving = false;
      return;
    }

    const finalFileName = fileName.endsWith('.bpmn') || fileName.endsWith('.xml')
      ? fileName
      : fileName + '.bpmn';

    // Get current custom properties and element colors
    const customProperties = this.getAllCustomProperties();
    const elementColors = this.elementColors;

    // Use the SAVE endpoint, not upload
    this.fileService.saveBpmnDiagramWithOverwrite(
      finalFileName,
      xml,
      customProperties,
      elementColors,
      this.currentFolderContext.folderId || undefined, // Convert null to undefined
      false // Don't overwrite initially
    ).subscribe({
      next: (savedFile: AppFile) => {
        this.currentFile = savedFile;
        this.hasUnsavedChanges = false;
        this.isSaving = false;
        this.showNotification('Diagram saved successfully as ' + finalFileName, 'success');
        
        // Navigate to the saved file
        if (savedFile.id) {
          this.router.navigate(['/bpmn-modeler'], {
            queryParams: { 
              fileId: savedFile.id,
              folderId: this.currentFolderContext.folderId,
              folderName: this.currentFolderContext.folderName
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Error saving file:', error);
        this.isSaving = false;
        
        if (error.message.includes('already exists')) {
          const overwrite = confirm(`File "${finalFileName}" already exists. Do you want to overwrite it?`);
          if (overwrite) {
            this.saveAsNewFileWithOverwrite(finalFileName, xml, customProperties, elementColors);
          }
        } else {
          this.showNotification('Error saving file: ' + error.message, 'error');
        }
      }
    });
  }

  private saveAsNewFileWithOverwrite(fileName: string, xml: string, customProperties: any, elementColors: any): void {
    this.fileService.saveBpmnDiagramWithOverwrite(
      fileName,
      xml,
      customProperties,
      elementColors,
      this.currentFolderContext.folderId || undefined, // Convert null to undefined
      true
    ).subscribe({
      next: (savedFile: AppFile) => {
        this.currentFile = savedFile;
        this.hasUnsavedChanges = false;
        this.isSaving = false;
        this.showNotification('Diagram saved successfully as ' + fileName, 'success');
      },
      error: (error: any) => {
        console.error('Error saving file with overwrite:', error);
        this.isSaving = false;
        this.showNotification('Error saving file: ' + error.message, 'error');
      }
    });
  }

  private updateExistingFile(xml: string): void {
    if (!this.currentFile?.id) {
      this.isSaving = false;
      return;
    }

    // Get current custom properties and element colors
    const customProperties = this.getAllCustomProperties();
    const elementColors = this.elementColors;

    this.fileService.updateFileContent(
      this.currentFile.id,
      xml,
      JSON.stringify(customProperties),
      JSON.stringify(elementColors)
    ).subscribe({
      next: (updatedFile: AppFile) => {
        this.currentFile = updatedFile;
        this.hasUnsavedChanges = false;
        this.isSaving = false;
        this.showNotification('Diagram updated successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error updating file:', error);
        this.isSaving = false;
        this.showNotification('Error updating file: ' + error.message, 'error');
      }
    });
  }

  private loadFolderContext(params: any): void {
    const folderId = params['folderId'];
    const folderName = params['folderName'] || 'Root';

    this.currentFolderContext = {
      folderId: folderId ? parseInt(folderId) : undefined, // Use undefined instead of null
      folderName: folderName,
      path: folderId ? `/${folderName}` : '/'
    };

    console.log('Loaded folder context:', this.currentFolderContext);
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

    // Load XML content
    const xmlContent = file.xml || (file.base64Data ? atob(file.base64Data) : '');

    this.modeler.importXML(xmlContent)
      .then(() => {
        // Apply custom properties and colors if available
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

  // =================== ELEMENT COLORS ===================

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

  // =================== CUSTOM PROPERTIES ===================

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
      width: '900px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: CustomProperty[] | undefined) => {
      if (result) {
        this.onCustomPropertiesSave(result);
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

  // =================== PROPERTIES EDITING ===================

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

  // =================== ZOOM AND NAVIGATION ===================

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

  resetZoom(): void {
    if (this.modeler && 'get' in this.modeler) {
      const canvas = this.modeler.get('canvas');
      canvas.zoom(1.0);
    }
  }

  // =================== EXPORT FUNCTIONALITY ===================

  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportDiagram(format: ExportFormat['format']): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to export diagrams.', 'error');
      return;
    }

    this.showExportDropdown = false;

    if (!this.currentFile?.id) {
      this.showNotification('Please save the diagram first before exporting.', 'warning');
      return;
    }

    switch (format) {
      case 'xml':
        this.exportAsXml();
        break;
      case 'svg':
        this.exportAsSvg();
        break;
      case 'png':
        this.exportAsPng();
        break;
      case 'pdf':
        this.exportAsPdf();
        break;
    }
  }

  private exportAsXml(): void {
    if (!this.currentFile?.id) return;

    this.fileService.exportFile(this.currentFile.id, 'xml').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('xml'));
        this.showNotification('Diagram exported as XML', 'success');
      },
      error: (error: any) => {
        this.showNotification('Error exporting XML: ' + error.message, 'error');
      }
    });
  }

  private exportAsSvg(): void {
    if (!this.currentFile?.id) return;

    this.fileService.exportFile(this.currentFile.id, 'svg').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('svg'));
        this.showNotification('Diagram exported as SVG', 'success');
      },
      error: (error: any) => {
        this.showNotification('Error exporting SVG: ' + error.message, 'error');
      }
    });
  }

  private exportAsPng(): void {
    if (!this.currentFile?.id) return;

    this.fileService.exportFile(this.currentFile.id, 'png').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('png'));
        this.showNotification('Diagram exported as PNG', 'success');
      },
      error: (error: any) => {
        this.showNotification('Error exporting PNG: ' + error.message, 'error');
      }
    });
  }

  private exportAsPdf(): void {
    if (!this.currentFile?.id) return;

    this.fileService.exportFile(this.currentFile.id, 'pdf').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('pdf'));
        this.showNotification('Diagram exported as PDF', 'success');
      },
      error: (error: any) => {
        this.showNotification('Error exporting PDF: ' + error.message, 'error');
      }
    });
  }

  // =================== FILE OPERATIONS ===================

  openFileDialog(): void {
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
        if (!confirm('You have unsaved changes. Are you sure you want to open a new file?')) {
          input.value = '';
          return;
        }
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

  // =================== UTILITY METHODS ===================

  private markAsChanged(): void {
    this.hasUnsavedChanges = true;
  }

  private generateFileName(extension: string): string {
    const baseName = this.currentFile?.fileName?.replace(/\.(bpmn|xml)$/, '') || 'diagram';
    return `${baseName}.${extension}`;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
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

  get currentFolderName(): string {
    return this.currentFolderContext.folderName;
  }

  get isInFolder(): boolean {
    return this.currentFolderContext.folderId !== undefined && this.currentFolderContext.folderId !== null;
  }
}