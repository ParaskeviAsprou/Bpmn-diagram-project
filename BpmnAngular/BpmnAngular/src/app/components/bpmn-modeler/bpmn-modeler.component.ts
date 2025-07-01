// bpmn-modeler.component.ts
import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, timer, Subscription } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// Services
import { FileService } from '../../services/file.service';
import { AuthenticationService, User } from '../../services/authentication.service';
import { CustomProperty, CustomPropertyService } from '../../services/custom-properties.service';

// Components and Dialogs
import { MatDialog } from '@angular/material/dialog';
import { UnSaveDialogComponent } from '../un-save-dialog/un-save-dialog.component';
import { CustomPropertyDialogComponent, CustomPropertyDialogData } from '../custom-property-dialog/custom-property-dialog.component';

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

// Models and Interfaces

import { ColorDialogComponent, ColorDialogData, ColorDialogResult } from '../color-dialog/color-dialog.component';
import { DiagramService } from '../../services/diagram-service.service';
import { AppFile, DiagramFile, DiagramMetadata } from '../../models/File';

export interface ExportFormat {
  format: 'pdf' | 'svg' | 'png' | 'xml' | 'json';
  label: string;
  icon: string;
  description: string;
}

export interface ModelerTheme {
  name: string;
  label: string;
  colors: {
    background: string;
    canvas: string;
    grid: string;
    selection: string;
  };
}

export interface ModelerSettings {
  theme: string;
  gridEnabled: boolean;
  snapToGrid: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  showMinimap: boolean;
  keyboardShortcuts: boolean;
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
  private autoSaveSubscription?: Subscription;
  private changeDetectionSubscription?: Subscription;

  // State Management
  currentDiagram: DiagramFile | null = null;
  selectedElement: any = null;
  isEditMode: boolean = false;
  isViewerOnly: boolean = false;
  hasUnsavedChanges: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  showExportDropdown: boolean = false;

  // Settings and Configuration
  settings: ModelerSettings = {
    theme: 'default',
    gridEnabled: true,
    snapToGrid: false,
    autoSave: true,
    autoSaveInterval: 30000,
    showMinimap: false,
    keyboardShortcuts: true
  };

  themes: ModelerTheme[] = [
    {
      name: 'default',
      label: 'Default',
      colors: { background: '#ffffff', canvas: '#ffffff', grid: '#e0e0e0', selection: '#1976d2' }
    },
    {
      name: 'dark',
      label: 'Dark',
      colors: { background: '#1e1e1e', canvas: '#2d2d2d', grid: '#404040', selection: '#64b5f6' }
    },
    {
      name: 'blue',
      label: 'Blue Theme',
      colors: { background: '#f3f8ff', canvas: '#ffffff', grid: '#e3f2fd', selection: '#1976d2' }
    }
  ];

  // Custom Properties
  elementCustomProperties: CustomProperty[] = [];

  // Element colors storage
  private elementColors: { [elementId: string]: { fill?: string; stroke?: string } } = {};

  // Export formats configuration
  exportFormats: ExportFormat[] = [
    { format: 'pdf', label: 'Export as PDF', icon: 'picture_as_pdf', description: 'Portable Document Format' },
    { format: 'svg', label: 'Export as SVG', icon: 'image', description: 'Scalable Vector Graphics' },
    { format: 'png', label: 'Export as PNG', icon: 'image', description: 'Portable Network Graphics' },
    { format: 'xml', label: 'Export as XML', icon: 'code', description: 'BPMN XML Source' },
    { format: 'json', label: 'Export as JSON', icon: 'data_object', description: 'Complete diagram with metadata' }
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
    documentation: '',
    assignee: '',
    candidateUsers: '',
    candidateGroups: '',
    formKey: '',
    priority: '',
    dueDate: '',
    followUpDate: ''
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
    private customPropertyService: CustomPropertyService,
    private diagramService: DiagramService
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
    if (!this.settings.keyboardShortcuts) return;

    // Handle keyboard shortcuts
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
        case 'z':
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          event.preventDefault();
          break;
        case 'y':
          event.preventDefault();
          this.redo();
          break;
      }
    }
  }

  ngOnInit(): void {
    this.initializePermissions();
    this.loadSettings();
    this.customPropertyService.initialize();

    // Subscribe to authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.currentUser = user;
        this.initializePermissions();
      });

    // Subscribe to diagram changes
    this.diagramService.currentDiagram$
      .pipe(takeUntil(this.destroy$))
      .subscribe(diagram => {
        this.currentDiagram = diagram;
      });

    // Handle route parameters
    this.route.queryParams.subscribe(params => {
      if (params['fileId']) {
        this.loadFileById(parseInt(params['fileId']));
      } else if (params['new']) {
        this.createNewDiagram();
      }
    });

    this.setupChangeDetection();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeModeler();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupSubscriptions();
    this.saveSettings();

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

    console.log('BPMN Modeler permissions:', {
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
        keyboard: this.settings.keyboardShortcuts ? { bindTo: window } : undefined,
        additionalModules: this.getAdditionalModules()
      });

      this.applyTheme();
      this.setupEventListeners();

      // Load initial diagram
      if (this.currentDiagram) {
        this.loadDiagramFromFile(this.currentDiagram);
      } else {
        this.loadDiagram(this.defaultXml);
      }

      console.log(`Initialized BPMN ${this.isViewerOnly ? 'Viewer' : 'Modeler'}`);
    } catch (error) {
      console.error('Error initializing BPMN modeler:', error);
      this.showNotification('Failed to initialize diagram editor', 'error');
    }
  }

  private getAdditionalModules(): any[] {
    const modules: any[] = [];

    // Add grid module if enabled
    if (this.settings.gridEnabled) {
      // modules.push(GridModule);
    }

    // Add minimap if enabled
    if (this.settings.showMinimap) {
      // modules.push(MinimapModule);
    }

    return modules;
  }

  private setupEventListeners(): void {
    if (!this.modeler) return;

    // Selection changed
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
      // Element changed
      this.modeler.on('element.changed', (e: any) => {
        this.markAsChanged();
      });

      // Command stack changed
      this.modeler.on('commandStack.changed', (e: any) => {
        this.markAsChanged();
      });

      // Shape added
      this.modeler.on('shape.added', (e: any) => {
        this.applyDefaultPropertiesForNewElement(e.element);
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
      const dialogRef = this.popup.open(UnSaveDialogComponent, {
        width: '400px',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) {
          this.resetToNewDiagram();
        }
      });
    } else {
      this.resetToNewDiagram();
    }
  }

  private resetToNewDiagram(): void {
    this.currentDiagram = null;
    this.elementColors = {};
    this.loadDiagram(this.defaultXml);
    this.selectedElement = null;
    this.isEditMode = false;
    this.hasUnsavedChanges = false;
    this.diagramService.setCurrentDiagram(null);
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
        const fileName = this.currentDiagram?.fileName || this.promptForFileName();

        if (!fileName) {
          this.isSaving = false;
          return;
        }

        const diagramSettings = this.getCurrentDiagramSettings();

        this.diagramService.saveDiagramWithMetadata(
          xml,
          this.elementColors,
          this.getAllCustomProperties(),
          fileName,
          diagramSettings,
          this.currentDiagram?.id,
          this.currentDiagram?.description,
          this.currentDiagram?.tags
        ).subscribe({
          next: (savedDiagram: DiagramFile) => {
            this.currentDiagram = savedDiagram;
            this.hasUnsavedChanges = false;
            this.isSaving = false;

            // Show version information if available
            const versionInfo = (savedDiagram.versionCount ?? 0) > 0
              ? ` (Version ${savedDiagram.versionCount})`
              : '';


            this.showNotification(
              `Diagram saved successfully as ${savedDiagram.fileName}${versionInfo}`,
              'success'
            );


          },
          error: (error: any) => {
            console.error('Error saving diagram:', error);
            this.isSaving = false;
            this.showNotification('Error saving diagram: ' + error.message, 'error');
          }
        });
      })
      .catch((error: any) => {
        console.error('Error generating XML:', error);
        this.isSaving = false;
        this.showNotification('Error generating diagram data: ' + error.message, 'error');
      });
  }
  private loadFileById(fileId: number): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to view files.', 'error');
      return;
    }

    this.isLoading = true;

    // Try to load as complete diagram first
    this.diagramService.loadDiagram(fileId, { validateMetadata: true })
      .subscribe({
        next: (diagram: DiagramFile) => {
          this.loadDiagramFromFile(diagram);
          this.isLoading = false;
        },
        error: (error: any) => {
          console.warn('Failed to load complete diagram, trying legacy format:', error);
          this.loadLegacyFile(fileId);
        }
      });
  }

  private loadDiagramFromFile(diagram: DiagramFile): void {
    if (!this.modeler) {
      console.error('Modeler not initialized');
      return;
    }

    console.log('Loading complete diagram with metadata...');

    this.modeler.importXML(diagram.content)
      .then(() => {
        console.log('Diagram loaded successfully');

        // Apply metadata
        this.applyDiagramMetadata(diagram.metadata);

        this.hasUnsavedChanges = false;
        this.showNotification(
          `Diagram "${diagram.fileName}" loaded with all customizations`,
          'success'
        );
      })
      .catch((error: any) => {
        console.error('Error loading diagram:', error);
        this.showNotification('Error loading diagram: ' + error.message, 'error');

        // Fallback to default diagram
        this.loadDiagram(this.defaultXml);
      });
  }

  private loadLegacyFile(fileId: number): void {
    // Fallback to legacy file loading
    this.fileService.getFileById(fileId).subscribe({
      next: (file: AppFile) => {
        this.fileService.getFileContent(fileId).subscribe({
          next: (content: string) => {
            this.loadDiagram(content);
            this.isLoading = false;
            this.showNotification('Legacy file loaded', 'warning');
          },
          error: (error) => {
            console.error('Error loading legacy file content:', error);
            this.isLoading = false;
            this.showNotification('Error loading file: ' + error.message, 'error');
          }
        });
      },
      error: (error) => {
        console.error('Error loading legacy file:', error);
        this.isLoading = false;
        this.showNotification('Error loading file: ' + error.message, 'error');
      }
    });
  }

  private loadDiagram(xml: string): void {
    if (!this.modeler) {
      console.error('Modeler not initialized');
      return;
    }

    // Validate XML content
    if (!xml || xml.trim().length === 0) {
      console.warn('Empty XML content, loading default diagram');
      xml = this.defaultXml;
    }

    this.modeler.importXML(xml)
      .then(() => {
        console.log('Diagram loaded successfully');
        this.zoomToFit();
        this.hasUnsavedChanges = false;
        this.applyStoredColors();
      })
      .catch((error: any) => {
        console.error('Error loading diagram:', error);

        if (xml !== this.defaultXml) {
          console.log('Attempting to load default XML as fallback');
          this.loadDiagram(this.defaultXml);
        } else {
          this.showNotification('Error loading diagram: ' + error.message, 'error');
        }
      });
  }

  // =================== METADATA MANAGEMENT ===================

  private applyDiagramMetadata(metadata: DiagramMetadata): void {
    try {
      // Apply element colors
      this.elementColors = metadata.elementColors || {};
      this.applyStoredColors();

      // Apply custom properties
      if (metadata.customProperties) {
        Object.keys(metadata.customProperties).forEach(elementId => {
          const properties = metadata.customProperties[elementId];
          this.customPropertyService.setElementProperties(elementId, properties.map(p => ({
            ...p,
            required: p.required ?? false 
          })));
        });
      }

      // Apply diagram settings
      if (metadata.diagramSettings) {
        this.applyDiagramSettings(metadata.diagramSettings);
      }

    } catch (error) {
      console.error('Error applying diagram metadata:', error);
      this.showNotification('Some customizations could not be applied', 'warning');
    }
  }

  private applyDiagramSettings(settings: any): void {
    if (!this.modeler || !('get' in this.modeler)) return;

    try {
      const canvas = this.modeler.get('canvas');

      // Apply zoom if available
      if (settings.zoom && settings.zoom !== 1) {
        setTimeout(() => canvas.zoom(settings.zoom), 100);
      }

      // Apply view box if available
      if (settings.viewBox) {
        const [x, y, width, height] = settings.viewBox.split(' ').map(Number);
        if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
          setTimeout(() => canvas.viewbox({ x, y, width, height }), 100);
        }
      }

      // Apply theme if different from current
      if (settings.theme && settings.theme !== this.settings.theme) {
        this.settings.theme = settings.theme;
        this.applyTheme();
      }

      // Apply grid settings
      if (typeof settings.gridEnabled === 'boolean') {
        this.settings.gridEnabled = settings.gridEnabled;
      }

      if (typeof settings.snapToGrid === 'boolean') {
        this.settings.snapToGrid = settings.snapToGrid;
      }

    } catch (error) {
      console.error('Error applying diagram settings:', error);
    }
  }

  private getCurrentDiagramSettings(): any {
    let settings: any = {
      theme: this.settings.theme,
      gridEnabled: this.settings.gridEnabled,
      snapToGrid: this.settings.snapToGrid,
      lastModified: new Date().toISOString(),
      version: '2.0'
    };

    if (this.modeler && 'get' in this.modeler) {
      try {
        const canvas = this.modeler.get('canvas');
        const zoom = canvas.zoom();
        const viewbox = canvas.viewbox();

        settings = {
          ...settings,
          zoom,
          viewBox: `${viewbox.x} ${viewbox.y} ${viewbox.width} ${viewbox.height}`
        };
      } catch (error) {
        console.warn('Could not extract modeler settings:', error);
      }
    }

    return settings;
  }

  private getAllCustomProperties(): { [elementId: string]: CustomProperty[] } {
    return this.customPropertyService.getAllProperties();
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
      maxWidth: '90vw',
      maxHeight: '80vh',
      data: dialogData,
      disableClose: false
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
        // Reset to default colors
        modeling.setColor(this.selectedElement, { fill: undefined, stroke: undefined });
        delete this.elementColors[this.selectedElement.id];
      } else {
        // Apply new colors
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
      maxWidth: '95vw',
      maxHeight: '90vh',
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
      documentation: bo.documentation?.[0]?.text || '',
      assignee: bo.assignee || '',
      candidateUsers: bo.candidateUsers?.join(', ') || '',
      candidateGroups: bo.candidateGroups?.join(', ') || '',
      formKey: bo.formKey || '',
      priority: bo.priority || '',
      dueDate: bo.dueDate || '',
      followUpDate: bo.followUpDate || ''
    };
  }

  private applyDefaultPropertiesForNewElement(element: any): void {
    if (!element || !element.type) return;

    const templates = this.customPropertyService.getDefaultTemplates();
    let templateName: any;

    if (element.type.includes('Task')) {
      templateName = 'Task Properties';
    } else if (element.type.includes('Event')) {
      templateName = 'Event Properties';
    } else if (element.type.includes('Gateway')) {
      templateName = 'Gateway Properties';
    }

    if (templateName && templates[templateName]) {
      try {
        const template = templates[templateName];
        const properties = Array.isArray(template)
          ? template.map(prop => ({
            ...prop,
            id: this.generatePropertyId()
          }))
          : [];

        this.customPropertyService.setElementProperties(element.id, properties);
      } catch (error) {
        console.warn('Could not apply default properties:', error);
      }
    }
  }

  // =================== THEME AND SETTINGS ===================

  applyTheme(): void {
    const theme = this.themes.find(t => t.name === this.settings.theme);
    if (!theme || !this.modelerContainer) return;

    const container = this.modelerContainer.nativeElement;
    container.style.backgroundColor = theme.colors.background;

    // Apply CSS custom properties for theme
    document.documentElement.style.setProperty('--bpmn-canvas-bg', theme.colors.canvas);
    document.documentElement.style.setProperty('--bpmn-grid-color', theme.colors.grid);
    document.documentElement.style.setProperty('--bpmn-selection-color', theme.colors.selection);
  }

  changeTheme(themeName: string): void {
    this.settings.theme = themeName;
    this.applyTheme();
    this.markAsChanged();
    this.showNotification(`Applied ${themeName} theme`, 'success');
  }

  toggleGrid(): void {
    this.settings.gridEnabled = !this.settings.gridEnabled;
    // Implementation would depend on available grid module
    this.markAsChanged();
  }

  toggleSnapToGrid(): void {
    this.settings.snapToGrid = !this.settings.snapToGrid;
    // Implementation would depend on available snap module
    this.markAsChanged();
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

  // =================== UNDO/REDO ===================

  undo(): void {
    if (this.modeler && 'get' in this.modeler) {
      try {
        const commandStack = this.modeler.get('commandStack');
        if (commandStack.canUndo()) {
          commandStack.undo();
        }
      } catch (error) {
        console.error('Error during undo:', error);
      }
    }
  }

  redo(): void {
    if (this.modeler && 'get' in this.modeler) {
      try {
        const commandStack = this.modeler.get('commandStack');
        if (commandStack.canRedo()) {
          commandStack.redo();
        }
      } catch (error) {
        console.error('Error during redo:', error);
      }
    }
  }

  canUndo(): boolean {
    if (this.modeler && 'get' in this.modeler) {
      try {
        const commandStack = this.modeler.get('commandStack');
        return commandStack.canUndo();
      } catch {
        return false;
      }
    }
    return false;
  }

  canRedo(): boolean {
    if (this.modeler && 'get' in this.modeler) {
      try {
        const commandStack = this.modeler.get('commandStack');
        return commandStack.canRedo();
      } catch {
        return false;
      }
    }
    return false;
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

    switch (format) {
      case 'json':
        this.exportAsJson();
        break;
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

  private exportAsJson(): void {
    if (!this.currentDiagram) {
      this.showNotification('Please save the diagram first.', 'warning');
      return;
    }

    const jsonData = JSON.stringify(this.currentDiagram, null, 2);
    this.downloadBlob(
      new Blob([jsonData], { type: 'application/json' }),
      this.generateFileName('json')
    );
    this.showNotification('Diagram exported as JSON', 'success');
  }

  private exportAsXml(): void {
    if (!this.modeler || !('saveXML' in this.modeler)) {
      this.showNotification('Cannot export in viewer mode.', 'error');
      return;
    }

    this.modeler.saveXML({ format: true })
      .then((result: any) => {
        this.downloadBlob(
          new Blob([result.xml], { type: 'application/xml' }),
          this.generateFileName('xml')
        );
        this.showNotification('Diagram exported as XML', 'success');
      })
      .catch((error: any) => {
        console.error('Error exporting XML:', error);
        this.showNotification('Error exporting XML: ' + error.message, 'error');
      });
  }

  private exportAsSvg(): void {
    if (!this.modeler || !('saveSVG' in this.modeler)) {
      this.showNotification('Cannot export SVG in viewer mode.', 'error');
      return;
    }

    this.modeler.saveSVG()
      .then((result: any) => {
        this.downloadBlob(
          new Blob([result.svg], { type: 'image/svg+xml' }),
          this.generateFileName('svg')
        );
        this.showNotification('Diagram exported as SVG', 'success');
      })
      .catch((error: any) => {
        console.error('Error exporting SVG:', error);
        this.showNotification('Error exporting SVG: ' + error.message, 'error');
      });
  }

  private exportAsPng(): void {
    // Implementation would require html2canvas or similar
    this.showNotification('PNG export not yet implemented', 'warning');
  }

 exportAsPdf(): void {
    if (!this.canView) {
      this.showNotification('You do not have permission to export diagrams.', 'error');
      return;
    }

    if (!this.currentDiagram?.fileName) {
      this.showNotification('Please save the diagram first before exporting to PDF.', 'warning');
      return;
    }

    if (!this.modeler) {
      this.showNotification('BPMN modeler not initialized', 'error');
      return;
    }

    try {
      this.modeler.saveSVG().then((result: any) => {
        const svgString = result.svg;
        this.convertSvgToPdf(svgString, this.currentDiagram!.fileName!);
      }).catch((error: any) => {
        console.error('Error getting SVG from modeler:', error);
        this.showNotification('Error exporting diagram: ' + error.message, 'error');
      });
    } catch (error: any) {
      console.error('Error in exportToPdf:', error);
      this.showNotification('Error exporting diagram: ' + error.message, 'error');
    }
  }
private convertSvgToPdf(svgString: string, fileName: string): void {
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
      this.showNotification('Could not extract diagram SVG', 'error');
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

      this.showNotification('Diagram exported to PDF successfully', 'success');

      document.body.removeChild(tempDiv);
    }).catch(error  => {
      console.error('Error converting SVG to PDF:', error);
      this.showNotification('Error converting diagram to PDF: ' + error.message, 'error');
      document.body.removeChild(tempDiv);
    });
  }
  // =================== FILE OPERATIONS ===================

  openFileDialog(): void {
    // Trigger file input click
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.xml,.json';
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

        if (file.name.endsWith('.json')) {
          this.loadJsonFile(content);
        } else {
          this.loadDiagram(content);
        }

        this.hasUnsavedChanges = true;
      };
      reader.readAsText(file);

      input.value = '';
    }
  }

  private loadJsonFile(jsonContent: string): void {
    try {
      const diagramData: DiagramFile = JSON.parse(jsonContent);

      if (diagramData.content && diagramData.metadata) {
        this.loadDiagramFromFile(diagramData);
        this.showNotification('JSON diagram file loaded successfully', 'success');
      } else {
        throw new Error('Invalid JSON diagram format');
      }
    } catch (error: any) {
      console.error('Error loading JSON file:', error);
      this.showNotification('Error loading JSON file: ' + error.message, 'error');
    }
  }

  // =================== AUTO-SAVE AND CHANGE DETECTION ===================

  private setupChangeDetection(): void {
    this.changeDetectionSubscription = timer(0, 1000)
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(1000),
        distinctUntilChanged()
      )
      .subscribe(() => {
        if (this.settings.autoSave && this.hasUnsavedChanges && this.currentDiagram?.id) {
          this.performAutoSave();
        }
      });
  }

  private performAutoSave(): void {
    if (!this.modeler || !('saveXML' in this.modeler)) return;

    this.modeler.saveXML({ format: true })
      .then((result: any) => {
        const xml = result.xml;
        const diagramSettings = this.getCurrentDiagramSettings();

        const autoSaveObservable = this.diagramService.autoSave(
          xml,
          this.elementColors,
          this.getAllCustomProperties(),
          diagramSettings
        );

        if (autoSaveObservable) {
          autoSaveObservable.subscribe({
            next: () => {
              this.hasUnsavedChanges = false;
              console.log('Auto-save completed');
            },
            error: (error: any) => {
              console.error('Auto-save failed:', error);
            }
          });
        }
      })
      .catch((error: any) => {
        console.error('Auto-save XML generation failed:', error);
      });
  }

  private markAsChanged(): void {
    this.hasUnsavedChanges = true;
  }

  private cleanupSubscriptions(): void {
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
    if (this.changeDetectionSubscription) {
      this.changeDetectionSubscription.unsubscribe();
    }
  }

  // =================== SETTINGS MANAGEMENT ===================

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('bpmn_modeler_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.settings = { ...this.settings, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('bpmn_modeler_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  updateSettings(newSettings: Partial<ModelerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Apply immediate changes
    if (newSettings.theme) {
      this.applyTheme();
    }

    if (typeof newSettings.autoSave === 'boolean') {
      this.diagramService.setAutoSaveEnabled(newSettings.autoSave);
    }

    if (newSettings.autoSaveInterval) {
      this.diagramService.setAutoSaveInterval(newSettings.autoSaveInterval);
    }
  }

  // =================== UTILITY METHODS ===================

  private promptForFileName(): string | null {
    return prompt('Enter filename:', 'new_diagram.bpmn');
  }

  private generateFileName(extension: string): string {
    const baseName = this.currentDiagram?.fileName?.replace(/\.(bpmn|xml)$/, '') || 'diagram';
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

  private generatePropertyId(): string {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
    return this.currentDiagram?.fileName || 'New Diagram';
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

  get hasMetadata(): boolean {
    return this.currentDiagram?.metadata !== undefined;
  }

  get metadataInfo(): string {
    if (!this.currentDiagram?.metadata) return 'No metadata';

    const metadata = this.currentDiagram.metadata;
    const colorCount = Object.keys(metadata.elementColors || {}).length;
    const propertyCount = Object.keys(metadata.customProperties || {}).length;

    return `${colorCount} colored elements, ${propertyCount} elements with properties`;
  }

  get lastSaveTime(): string {
    const lastSave = this.diagramService.getLastSaveTime();
    return lastSave ? lastSave.toLocaleString() : 'Never';
  }

  get autoSaveStatus(): string {
    if (!this.diagramService.isAutoSaveEnabled()) return 'Disabled';
    if (this.hasUnsavedChanges) return 'Pending';
    return 'Up to date';
  }
}