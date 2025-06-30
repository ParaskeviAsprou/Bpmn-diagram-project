import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FileService } from '../../services/file.service';
import { AppFile } from '../../files';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import { AuthenticationService, User } from '../../services/authentication.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MatDialog } from '@angular/material/dialog';
import { UnSaveDialogComponent } from '../un-save-dialog/un-save-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CustomProperty, CustomPropertyDialogComponent, CustomPropertyDialogData } from '../custom-property-dialog/custom-property-dialog.component';
import { CustomePropertyService } from '../../services/custom-properties.service';


export interface ExportFormat {
  format: 'pdf' | 'svg' | 'png' | 'xml';
  label: string;
  icon: string;
  description: string;
}

interface ElementColors {
  [elementId: string]: {
    fill?: string;
    stroke?: string;
  };
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
    MatButtonModule
  ],
  templateUrl: './bpmn-modeler.component.html',
  styleUrl: './bpmn-modeler.component.css'
})
export class BpmnModelerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('modelerContainer', { static: true }) modelerContainer!: ElementRef;

  private modeler!: BpmnModeler | BpmnViewer;
  private destroy$ = new Subject<void>();

  selectedElement: any = null;
  isEditMode: boolean = false;
  currentFile: AppFile | null = null;
  isViewerOnly: boolean = false;
  hasUnsavedChanges: boolean = false;
  showExportDropdown: boolean = false;

  // Custom Properties
  elementCustomProperties: CustomProperty[] = [];
  
  // Element colors storage
  private elementColors: ElementColors = {};
  private readonly COLORS_STORAGE_KEY = 'bpmn_element_colors';

  // Export formats configuration
  exportFormats: ExportFormat[] = [
    { format: 'pdf', label: 'Export as PDF', icon: 'bx-file-pdf', description: 'Portable Document Format' },
    { format: 'svg', label: 'Export as SVG', icon: 'bx-image', description: 'Scalable Vector Graphics' },
    { format: 'png', label: 'Export as PNG', icon: 'bx-image-alt', description: 'Portable Network Graphics' },
    { format: 'xml', label: 'Export as XML', icon: 'bx-code', description: 'BPMN XML Source' }
  ];

  // Permission flags
  canEdit: boolean = false;
  canView: boolean = false;
  canCreate: boolean = false;
  canDelete: boolean = false;

  // Current user info
  currentUser: User | null = null;
  userRoles: string[] = [];

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
    followUpDate: '',
    candidateStarter: '',
    executionTime: ''
  };

  readonly popup = inject(MatDialog);

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
    private authService: AuthenticationService,
    private fileService: FileService,
    private route: ActivatedRoute,
    private router: Router,
    private customPropertyService: CustomePropertyService
  ) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const exportDropdown = target.closest('.export-dropdown');

    if (!exportDropdown && this.showExportDropdown) {
      this.showExportDropdown = false;
    }
  }

  ngOnInit(): void {
    this.initializePermissions();
    this.loadElementColors();
    this.customPropertyService.initialize();

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.currentUser = user;
        this.initializePermissions();
      });

    this.route.queryParams.subscribe(params => {
      if (params['fileId']) {
        this.loadFileById(parseInt(params['fileId']));
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
    this.saveElementColors();

    if (this.modeler) {
      this.modeler.destroy();
    }
  }

  // ============= GETTER PROPERTIES =============

  get canManageCustomProperties(): boolean {
    return this.customPropertyService.canManageProperties() && this.selectedElement;
  }

  get currentUserRole(): string {
    if (this.authService.isAdmin()) return 'Administrator';
    if (this.authService.isModeler()) return 'Modeler';
    if (this.authService.isViewer()) return 'Viewer';
    return 'Unknown';
  }

  get canEditProperties(): boolean {
    return this.canEdit && this.selectedElement && !this.isViewerOnly;
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

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isModeler(): boolean {
    return this.authService.isModeler();
  }

  get isViewer(): boolean {
    return this.authService.isViewer();
  }

  get currentFileName(): string {
    return this.currentFile?.fileName || 'New Diagram';
  }

  get hasFileLoaded(): boolean {
    return this.currentFile !== null;
  }

  // ============= ELEMENT COLORS MANAGEMENT =============

  private loadElementColors(): void {
    try {
      const stored = localStorage.getItem(this.COLORS_STORAGE_KEY);
      if (stored) {
        this.elementColors = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading element colors:', error);
      this.elementColors = {};
    }
  }

  private saveElementColors(): void {
    try {
      localStorage.setItem(this.COLORS_STORAGE_KEY, JSON.stringify(this.elementColors));
    } catch (error) {
      console.error('Error saving element colors:', error);
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

  private storeElementColor(elementId: string, colors: { fill?: string; stroke?: string }): void {
    this.elementColors[elementId] = colors;
    this.saveElementColors();
  }

  // ============= INITIALIZATION METHODS =============

  private initializePermissions(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.userRoles = this.authService.getUserRoles();

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
      isViewerOnly: this.isViewerOnly,
      roles: this.userRoles,
      canManageCustomProperties: this.customPropertyService.canManageProperties()
    });
  }

  private initializeModeler(): void {
    try {
      if (this.isViewerOnly) {
        this.modeler = new BpmnViewer({
          container: this.modelerContainer.nativeElement
        });
        console.log('Initialized BPMN Viewer (read-only mode)');
      } else {
        this.modeler = new BpmnModeler({
          container: this.modelerContainer.nativeElement,
          keyboard: {
            bindTo: window
          }
        });
        console.log('Initialized BPMN Modeler (edit mode)');
      }

      if (this.currentFile) {
        this.loadDiagram(this.currentFile.content || this.defaultXml);
      } else {
        this.loadDiagram(this.defaultXml);
      }

      this.addEventListeners();

    } catch (error) {
      console.error('Error initializing BPMN modeler:', error);
    }
  }

  private addEventListeners(): void {
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
      this.modeler.on('element.changed', (e: any) => {
        this.hasUnsavedChanges = true;
        console.log('Element changed:', e.element);
      });

      this.modeler.on('commandStack.changed', (e: any) => {
        this.hasUnsavedChanges = true;
      });

      this.modeler.on('shape.added', (e: any) => {
        this.applyDefaultPropertiesForNewElement(e.element);
      });
    }
  }

  private applyDefaultPropertiesForNewElement(element: any): void {
    if (!element || !element.type) return;

    const templates = this.customPropertyService.getDefaultTemplates();
    let templateName = '';

    if (element.type.includes('Task')) {
      templateName = 'Task Properties';
    } else if (element.type.includes('Event')) {
      templateName = 'Event Properties';
    } else if (element.type.includes('Gateway')) {
      templateName = 'Gateway Properties';
    }

    if (templateName && templates[templateName]) {
      try {
        const properties = templates[templateName].map(prop => ({
          ...prop,
          id: this.generatePropertyId()
        }));
        
        this.customPropertyService.setElementProperties(element.id, properties);
        console.log(`Applied ${templateName} template to element ${element.id}`);
      } catch (error) {
        console.warn('Could not apply default properties:', error);
      }
    }
  }

  // ============= PROPERTY LOADING METHODS =============

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
      followUpDate: bo.followUpDate || '',
      candidateStarter: bo.candidateStarter || '',
      executionTime: bo.executionTime || ''
    };
  }

  private loadCustomProperties(): void {
    if (!this.selectedElement) {
      this.elementCustomProperties = [];
      return;
    }

    this.elementCustomProperties = this.customPropertyService.getElementProperties(this.selectedElement.id);
  }

  // ============= DIAGRAM LOADING AND FILE METHODS =============

  private loadDiagram(xml: string): void {
    if (!this.modeler) return;

    this.modeler.importXML(xml)
      .then(() => {
        console.log('Diagram loaded successfully');
        this.zoomToFit();
        this.hasUnsavedChanges = false;
        
        setTimeout(() => {
          this.applyStoredColors();
        }, 100);
      })
      .catch((error: any) => {
        console.error('Error loading diagram:', error);
        this.showMessage('Error loading diagram: ' + error.message, 'error');
      });
  }

  private loadFileById(fileId: number): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to view files.', 'error');
      return;
    }

    this.fileService.getFileById(fileId).subscribe({
      next: (file: AppFile) => {
        this.currentFile = file;
        console.log('Loaded file:', file.fileName);

        if (this.modeler) {
          this.loadDiagram(file.content || this.defaultXml);
        }
      },
      error: (error: any) => {
        console.error('Error loading file:', error);
        this.showMessage('Error loading file: ' + error.message, 'error');
      }
    });
  }

  // ============= CUSTOM PROPERTIES METHODS =============

 openCustomPropertiesDialog(): void {
  if (!this.customPropertyService.canManageProperties()) {
    this.showMessage('You do not have permission to manage custom properties.', 'error');
    return;
  }

  if (!this.selectedElement) {
    this.showMessage('Please select an element first.', 'warning');
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
    disableClose: true,
    panelClass: 'custom-property-dialog-panel', 
    autoFocus: false,
    restoreFocus: false,
    hasBackdrop: true,
    backdropClass: 'custom-dialog-backdrop'
  });

  dialogRef.afterClosed().subscribe((result: CustomProperty[] | undefined) => {
    if (result) {
      this.onCustomPropertiesSave(result);
    }
  });
}

  onCustomPropertiesSave(properties: CustomProperty[]): void {
    if (!this.selectedElement) {
      return;
    }

    try {
      this.customPropertyService.setElementProperties(this.selectedElement.id, properties);
      this.elementCustomProperties = properties;
      this.hasUnsavedChanges = true;
      this.showMessage(`Custom properties updated for ${this.selectedElement.type}`, 'success');
    } catch (error: any) {
      console.error('Error saving custom properties:', error);
      this.showMessage('Error saving custom properties: ' + error.message, 'error');
    }
  }

  quickAddProperty(type: CustomProperty['type'], title: string): void {
    if (!this.customPropertyService.canManageProperties() || !this.selectedElement) {
      this.showMessage('Cannot add property: insufficient permissions or no element selected.', 'error');
      return;
    }

    try {
      const property = this.customPropertyService.addPropertyToElement(this.selectedElement.id, {
        title,
        type,
        value: this.getDefaultValueForType(type),
        required: false,
        description: `Auto-generated ${type} property`
      });

      this.loadCustomProperties();
      this.hasUnsavedChanges = true;
      this.showMessage(`Added ${title} property`, 'success');
    } catch (error: any) {
      console.error('Error adding property:', error);
      this.showMessage('Error adding property: ' + error.message, 'error');
    }
  }

  deleteCustomProperty(propertyId: string): void {
    if (!this.customPropertyService.canManageProperties() || !this.selectedElement) {
      this.showMessage('Cannot delete property: insufficient permissions or no element selected.', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this property?')) {
      try {
        this.customPropertyService.removeElementProperty(this.selectedElement.id, propertyId);
        this.loadCustomProperties();
        this.hasUnsavedChanges = true;
        this.showMessage('Property deleted successfully', 'success');
      } catch (error: any) {
        console.error('Error deleting property:', error);
        this.showMessage('Error deleting property: ' + error.message, 'error');
      }
    }
  }

  editCustomProperty(property: CustomProperty): void {
    if (!this.customPropertyService.canManageProperties() || !this.selectedElement) {
      this.showMessage('Cannot edit property: insufficient permissions or no element selected.', 'error');
      return;
    }

    const dialogData: CustomPropertyDialogData = {
      elementId: this.selectedElement.id,
      elementType: this.selectedElement.type,
      elementName: this.selectedElement.businessObject?.name || this.selectedElement.id,
      existingProperties: [property]
    };

    const dialogRef = this.popup.open(CustomPropertyDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: CustomProperty[] | undefined) => {
      if (result && result.length > 0) {
        try {
          this.customPropertyService.updateElementProperty(
            this.selectedElement.id, 
            property.id, 
            result[0]
          );
          this.loadCustomProperties();
          this.hasUnsavedChanges = true;
          this.showMessage('Property updated successfully', 'success');
        } catch (error: any) {
          console.error('Error updating property:', error);
          this.showMessage('Error updating property: ' + error.message, 'error');
        }
      }
    });
  }

  getCustomPropertiesCount(): number {
    return this.elementCustomProperties.length;
  }

  hasCustomProperties(): boolean {
    return this.elementCustomProperties.length > 0;
  }

  private getDefaultValueForType(type: CustomProperty['type']): any {
    switch (type) {
      case 'boolean': return false;
      case 'number': return 0;
      case 'date': return null;
      case 'textarea': return '';
      default: return '';
    }
  }

  // ============= ENHANCED COLOR MANAGEMENT =============

  setElementColor(): void {
    if (!this.canEdit || !this.selectedElement) {
      this.showMessage('No element selected or insufficient permissions.', 'error');
      return;
    }

    const colors = [
      { name: 'Default', fill: null, stroke: null },
      { name: 'Light Blue', fill: '#e3f2fd', stroke: '#1976d2' },
      { name: 'Light Green', fill: '#e8f5e8', stroke: '#388e3c' },
      { name: 'Light Red', fill: '#ffebee', stroke: '#d32f2f' },
      { name: 'Light Yellow', fill: '#fffde7', stroke: '#f57c00' },
      { name: 'Light Purple', fill: '#f3e5f5', stroke: '#7b1fa2' },
      { name: 'Light Orange', fill: '#fff3e0', stroke: '#f57c00' },
      { name: 'Light Pink', fill: '#fce4ec', stroke: '#c2185b' },
      { name: 'Light Cyan', fill: '#e0f2f1', stroke: '#00796b' }
    ];

    let colorOptions = 'Select a color:\n';
    colors.forEach((color, index) => {
      colorOptions += `${index + 1}. ${color.name}\n`;
    });

    const choice = prompt(colorOptions + '\nEnter number (1-9):');
    const colorIndex = parseInt(choice || '0') - 1;

    if (colorIndex >= 0 && colorIndex < colors.length) {
      this.updateElementColor(colors[colorIndex].fill, colors[colorIndex].stroke);
    }
  }

  private updateElementColor(fill: string | null, stroke: string | null): void {
    if (!this.modeler || !('get' in this.modeler)) {
      this.showMessage('Cannot update colors in viewer mode.', 'error');
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
        this.storeElementColor(this.selectedElement.id, colors);
      }

      this.hasUnsavedChanges = true;
      this.showMessage('Element color updated successfully', 'success');

    } catch (error: any) {
      console.error('Error updating element color:', error);
      this.showMessage('Error updating color: ' + error.message, 'error');
    }
  }

  // ============= PROPERTY EDITING METHODS =============

  toggleEditMode(): void {
    if (!this.canEdit) {
      this.showMessage('You do not have permission to edit element properties.', 'error');
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
      this.showMessage('Cannot edit properties in viewer mode.', 'error');
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

      this.hasUnsavedChanges = true;
      this.isEditMode = false;
      this.showMessage('Properties saved successfully', 'success');

    } catch (error: any) {
      console.error('Error saving properties:', error);
      this.showMessage('Error saving properties: ' + error.message, 'error');
    }
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.loadElementProperties();
  }

  // ============= DIAGRAM MANAGEMENT METHODS =============

  createNewDiagram(): void {
    if (!this.canCreate) {
      this.showMessage('You do not have permission to create new diagrams.', 'error');
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
    this.currentFile = null;
    this.elementColors = {};
    this.saveElementColors();
    this.loadDiagram(this.defaultXml);
    this.selectedElement = null;
    this.isEditMode = false;
    this.hasUnsavedChanges = false;
    this.showMessage('New diagram ready', 'success');
  }

  onFileChange(event: Event): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to open diagrams.', 'error');
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
        const xml = e.target?.result as string;
        this.loadDiagram(xml);
        this.currentFile = null;
        this.hasUnsavedChanges = true;
      };
      reader.readAsText(file);

      input.value = '';
    }
  }

  saveDiagram(): void {
    if (!this.canEdit) {
      this.showMessage('You do not have permission to save diagrams.', 'error');
      return;
    }

    if (!this.modeler || !('saveXML' in this.modeler)) {
      this.showMessage('Cannot save in viewer mode.', 'error');
      return;
    }

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
        this.showMessage('Error saving diagram: ' + error.message, 'error');
      });
  }

  private saveAsNewFile(xml: string): void {
    const fileName = prompt('Enter filename:', 'new_diagram.bpmn');
    if (!fileName) return;

    const finalFileName = fileName.endsWith('.bpmn') || fileName.endsWith('.xml')
      ? fileName
      : fileName + '.bpmn';

    this.fileService.uploadBpmnContent(finalFileName, xml).subscribe({
      next: (savedFile: AppFile) => {
        this.currentFile = savedFile;
        this.hasUnsavedChanges = false;
        this.showMessage('Diagram saved successfully as ' + finalFileName, 'success');
      },
      error: (error: any) => {
        console.error('Error saving file:', error);
        this.showMessage('Error saving file: ' + error.message, 'error');
      }
    });
  }

  private updateExistingFile(xml: string): void {
    if (!this.currentFile?.id) return;

    this.fileService.updateFileContent(this.currentFile.id, xml).subscribe({
      next: (updatedFile: AppFile) => {
        this.currentFile = updatedFile;
        this.hasUnsavedChanges = false;
        this.showMessage('Diagram updated successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error updating file:', error);
        this.showMessage('Error updating file: ' + error.message, 'error');
      }
    });
  }

  // ============= EXPORT METHODS =============

  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }

  exportDiagram(format: 'pdf' | 'svg' | 'png' | 'xml'): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to export diagrams.', 'error');
      return;
    }

    this.showExportDropdown = false;

    if (!this.modeler) {
      this.showMessage('BPMN modeler not initialized', 'error');
      return;
    }

    console.log(`Exporting diagram as ${format.toUpperCase()}`);

    switch (format) {
      case 'pdf':
        this.exportToPdf();
        break;
      case 'svg':
        this.exportToSvg();
        break;
      case 'png':
        this.exportToPng();
        break;
      case 'xml':
        this.exportToXml();
        break;
      default:
        this.showMessage('Unsupported export format', 'error');
    }
  }

  private exportToSvg(): void {
    if (!this.currentFile?.id) {
      this.showMessage('Please save the diagram first before exporting.', 'warning');
      return;
    }

    this.fileService.exportFile(this.currentFile.id, 'svg').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('svg'));
        this.showMessage('Diagram exported to SVG successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error exporting to SVG:', error);
        this.showMessage('Error exporting to SVG: ' + error.message, 'error');
      }
    });
  }

  private exportToPng(): void {
    if (!this.currentFile?.id) {
      this.showMessage('Please save the diagram first before exporting.', 'warning');
      return;
    }

    this.fileService.exportFile(this.currentFile.id, 'png').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('png'));
        this.showMessage('Diagram exported to PNG successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error exporting to PNG:', error);
        this.showMessage('Error exporting to PNG: ' + error.message, 'error');
      }
    });
  }

  private exportToXml(): void {
    if (!this.currentFile?.id) {
      this.showMessage('Please save the diagram first before exporting.', 'warning');
      return;
    }

    this.fileService.exportFile(this.currentFile.id, 'xml').subscribe({
      next: (blob: Blob) => {
        this.downloadBlob(blob, this.generateFileName('xml'));
        this.showMessage('Diagram exported to XML successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error exporting to XML:', error);
        this.showMessage('Error exporting to XML: ' + error.message, 'error');
      }
    });
  }

  exportToPdf(): void {
    if (!this.canView) {
      this.showMessage('You do not have permission to export diagrams.', 'error');
      return;
    }

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

  private generateFileName(format: string): string {
    const baseName = this.currentFile?.fileName?.replace(/\.(bpmn|xml)$/, '') || 'diagram';
    return `${baseName}.${format}`;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ============= ZOOM CONTROLS =============

  zoomIn(): void {
    if (this.modeler) {
      const canvas = this.modeler.get('canvas');
      const zoom = canvas.zoom();
      canvas.zoom(zoom + 0.1);
    }
  }

  zoomOut(): void {
    if (this.modeler) {
      const canvas = this.modeler.get('canvas');
      const zoom = canvas.zoom();
      canvas.zoom(Math.max(zoom - 0.1, 0.1));
    }
  }

  zoomToFit(): void {
    if (this.modeler) {
      const canvas = this.modeler.get('canvas');
      canvas.zoom('fit-viewport');
    }
  }

  // ============= HELPER METHODS =============

  private generatePropertyId(): string {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      if (document.body.contains(messageDiv)) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';

        setTimeout(() => {
          if (document.body.contains(messageDiv)) {
            document.body.removeChild(messageDiv);
          }
        }, 300);
      }
    }, 3000);
  }
}