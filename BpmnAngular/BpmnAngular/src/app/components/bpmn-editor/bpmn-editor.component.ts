import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';



import { FileService } from '../../services/file.service';
import { AccessInfo, DiagramAssignmentService } from '../../services/diagram-assgnment.service';
import { AuthenticationService } from '../../services/authentication.service';
import { DiagramSharingComponent } from '../diagram-sharing/diagram-sharing.component';

interface DiagramFile {
  id: number;
  fileName: string;
  xml: string;
  customProperties?: string;
  elementColors?: string;
  createdBy: string;
  updatedTime: string;
}
@Component({
  selector: 'app-bpmn-editor',
  standalone: true,
  imports: [],
  templateUrl: './bpmn-editor.component.html',
  styleUrl: './bpmn-editor.component.css'
})
export class BpmnEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Diagram data
  diagramId: number | null = null;
  diagram: DiagramFile | null = null;

  // RBAC Access Control
  accessInfo: AccessInfo = {
    canView: false,
    canEdit: false,
    canAssign: false,
    permissionLevel: 'VIEW'
  };

  // Editor state
  isLoading = false;
  isReadOnly = false;
  hasUnsavedChanges = false;

  // Current user
  currentUser: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fileService: FileService,
    private assignmentService: DiagramAssignmentService,
    private authService: AuthenticationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.diagramId = params['id'] ? parseInt(params['id']) : null;
      if (this.diagramId) {
        this.loadDiagram();
      } else {
        // New diagram mode
        this.initializeNewDiagram();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadDiagram(): Promise<void> {
    if (!this.diagramId) return;

    this.isLoading = true;

    try {
      // Check access permissions first
      const accessInfoResult = await this.assignmentService.checkDiagramAccess(this.diagramId).toPromise();
      if (!accessInfoResult) {
        this.showError('Failed to retrieve access information');
        this.router.navigate(['/my-diagrams']);
        return;
      }
      this.accessInfo = accessInfoResult;

      if (!this.accessInfo.canView) {
        this.showError('You do not have permission to view this diagram');
        this.router.navigate(['/my-diagrams']);
        return;
      }

      // Set read-only mode based on permissions
      this.isReadOnly = !this.accessInfo.canEdit;

      // Load the diagram
      const loadedDiagram = await this.fileService.getFileById(this.diagramId).toPromise();
      this.diagram = loadedDiagram ? loadedDiagram as DiagramFile : null;

      // Initialize the BPMN editor with the diagram
      this.initializeBpmnEditor();

      this.showAccessLevelInfo();

    } catch (error) {
      this.showError('Failed to load diagram');
      this.router.navigate(['/my-diagrams']);
    } finally {
      this.isLoading = false;
    }
  }

  private initializeNewDiagram(): void {
    // Initialize with default access for new diagrams
    this.accessInfo = {
      canView: true,
      canEdit: true,
      canAssign: this.currentUser?.roles?.some((r: any) =>
        ['ROLE_MODELER', 'ROLE_ADMIN'].includes(r.name)
      ) || false,
      permissionLevel: 'ADMIN'
    };

    this.isReadOnly = false;
    this.initializeBpmnEditor();
  }

  private initializeBpmnEditor(): void {
    // Your existing BPMN editor initialization code
    // This would typically initialize the bpmn-js modeler/viewer

    // Example:
    /*
    if (this.isReadOnly) {
      // Initialize as viewer only
      this.bpmnViewer = new BpmnJS({
        container: '#canvas',
        keyboard: { bindTo: document }
      });
    } else {
      // Initialize as modeler
      this.bpmnModeler = new BpmnJS({
        container: '#canvas',
        keyboard: { bindTo: document }
      });
    }
    */
  }

  // Save diagram with RBAC checks
  async saveDiagram(): Promise<void> {
    if (!this.accessInfo.canEdit) {
      this.showError('You do not have permission to edit this diagram');
      return;
    }

    if (this.isReadOnly) {
      this.showError('Diagram is in read-only mode');
      return;
    }

    try {
      this.isLoading = true;

      // Get XML from BPMN editor
      const xml = await this.getBpmnXml();

      if (this.diagramId) {
        // Update existing diagram
        await this.fileService.updateFileContent(
          this.diagramId,
          xml,
          this.diagram?.customProperties || '{}',
          this.diagram?.elementColors || '{}'
        ).toPromise();
      } else {
        // Save new diagram
        const newDiagram = await this.fileService.saveBpmnDiagram({
          name: 'New Diagram',
          xml,
          customProperties: '{}',
          elementColors: '{}',
          folderId: undefined,
          overwrite: false
        }).toPromise();

        if (!newDiagram || typeof newDiagram.id !== 'number') {
          this.showError('Failed to save new diagram');
          return;
        }

        this.diagramId = newDiagram.id;
        this.diagram = {
          id: newDiagram.id,
          fileName: newDiagram.fileName ?? 'Untitled Diagram',
          xml: newDiagram.xml ?? '',
          customProperties: newDiagram.customProperties ?? '{}',
          elementColors: newDiagram.elementColors ?? '{}',
          createdBy: newDiagram.createdBy ?? '',
          updatedTime: newDiagram.updatedTime
            ? (typeof newDiagram.updatedTime === 'string'
                ? newDiagram.updatedTime
                : (newDiagram.updatedTime as Date).toISOString())
            : ''
        };

        // Update URL to reflect the new diagram ID
        this.router.navigate(['/editor', this.diagramId], { replaceUrl: true });
      }

      this.hasUnsavedChanges = false;
      this.showSuccess('Diagram saved successfully');

    } catch (error) {
      this.showError('Failed to save diagram');
    } finally {
      this.isLoading = false;
    }
  }

  // Share diagram
  shareDiagram(): void {
    if (!this.diagramId || !this.diagram) {
      this.showError('No diagram to share');
      return;
    }

    const dialogRef = this.dialog.open(DiagramSharingComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: {
        diagramId: this.diagramId,
        diagramName: this.diagram.fileName,
        canAssign: this.accessInfo.canAssign
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh access info if changes were made
        this.refreshAccessInfo();
      }
    });
  }

  // Export diagram
  exportDiagram(format: string): void {
    if (!this.diagramId || !this.accessInfo.canView) {
      this.showError('Cannot export diagram');
      return;
    }

    // Open export URL
    window.open(`/api/v1/file/${this.diagramId}/export/${format}`, '_blank');
  }

  // Refresh access information
  private async refreshAccessInfo(): Promise<void> {
    if (!this.diagramId) return;

    try {
      const refreshedAccessInfo = await this.assignmentService.checkDiagramAccess(this.diagramId).toPromise();
      if (refreshedAccessInfo) {
        this.accessInfo = refreshedAccessInfo;
        this.isReadOnly = !this.accessInfo.canEdit;
        this.showAccessLevelInfo();
      } else {
        this.showError('Failed to refresh access info');
      }
    } catch (error) {
      console.error('Failed to refresh access info:', error);
    }
  }

  // Show access level information
  private showAccessLevelInfo(): void {
    const permissionLevel = this.accessInfo.permissionLevel;
    let message = '';

    switch (permissionLevel) {
      case 'VIEW':
        message = 'You have view-only access to this diagram';
        break;
      case 'EDIT':
        message = 'You can view and edit this diagram';
        break;
      case 'ADMIN':
        message = 'You have full control over this diagram';
        break;
    }

    if (message) {
      this.snackBar.open(message, 'Close', { duration: 3000 });
    }
  }

  // Get XML from BPMN editor (implement based on your editor)
  private async getBpmnXml(): Promise<string> {
    // This would be implemented based on your BPMN editor
    // Example for bpmn-js:
    /*
    return new Promise((resolve, reject) => {
      this.bpmnModeler.saveXML({ format: true }, (err: any, xml: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(xml);
        }
      });
    });
    */

    // Placeholder implementation
    return this.diagram?.xml || '';
  }

  // Track changes for unsaved warning
  onDiagramChange(): void {
    if (!this.isReadOnly) {
      this.hasUnsavedChanges = true;
    }
  }

  // Navigation guard for unsaved changes
  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }

  // Permission check helpers
  get canSave(): boolean {
    return this.accessInfo.canEdit && !this.isReadOnly && this.hasUnsavedChanges;
  }

  get canShare(): boolean {
    return !!this.diagramId && (this.accessInfo.canAssign || this.accessInfo.canView);
  }

  get canExport(): boolean {
    return !!this.diagramId && this.accessInfo.canView;
  }

  get permissionBadgeColor(): string {
    switch (this.accessInfo.permissionLevel) {
      case 'ADMIN': return 'warn';
      case 'EDIT': return 'accent';
      case 'VIEW': return 'primary';
      default: return 'basic';
    }
  }

  // Utility methods
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }
}