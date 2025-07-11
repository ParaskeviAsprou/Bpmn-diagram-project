import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { PermissionDirective } from '../../directives/permission.directive';
import { AuthenticationService, User } from '../../services/authentication.service';
import { FileService } from '../../services/file.service';
import { AppFile } from '../../models/File';

// Import BPMN Viewer for read-only display
import BpmnViewer from 'bpmn-js/lib/Viewer';

// BPMN-js interfaces for type safety
interface BpmnCanvas {
  zoom(factor?: number | string): number | void;
  addMarker(element: any, className: string): void;
  getGraphics(element: any): any;
}

interface BpmnElementRegistry {
  get(id: string): any;
}

interface UserAccess {
  hasAccess: boolean;
  canEdit: boolean;
  canAssign: boolean;
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
}

@Component({
  selector: 'app-bpmn-diagram-viewer',
  standalone: true,
  imports: [CommonModule, PermissionDirective], // Added PermissionDirective here
  template: `
    <div class="diagram-viewer" *ngIf="diagram">
      <div class="viewer-header">
        <div class="diagram-info">
          <h2>{{diagram.fileName}}</h2>
          <p>{{diagram.description || 'No description'}}</p>
          <div class="diagram-meta">
            <span>Created by: {{diagram.createdBy}}</span>
            <span>Updated: {{diagram.updatedTime | date:'short'}}</span>
            <span>Permission: {{userAccess?.permissionLevel || 'VIEW'}}</span>
          </div>
        </div>
        <div class="viewer-actions">
          <button 
            class="btn btn-outline" 
            (click)="goBack()">
            <i class="bx bx-arrow-back"></i>
            Back
          </button>
          <button 
            *appHasPermission="'edit-diagrams'"
            class="btn btn-primary" 
            [disabled]="!canEdit"
            (click)="editDiagram()">
            <i class="bx bx-edit"></i>
            Edit
          </button>
          <button 
            *appHasPermission="'assign-diagrams'"
            class="btn btn-outline" 
            [disabled]="!canAssign"
            (click)="manageDiagramAccess()">
            <i class="bx bx-share"></i>
            Manage Access
          </button>
          <div class="dropdown">
            <button class="btn btn-outline dropdown-toggle" (click)="showExportMenu = !showExportMenu">
              <i class="bx bx-download"></i>
              Export
            </button>
            <div class="dropdown-menu" *ngIf="showExportMenu">
              <a (click)="exportDiagram('xml')">XML</a>
              <a (click)="exportDiagram('svg')">SVG</a>
              <a (click)="exportDiagram('png')">PNG</a>
              <a (click)="exportDiagram('pdf')">PDF</a>
            </div>
          </div>
        </div>
      </div>

      <div class="viewer-content">
        <!-- BPMN Viewer Container -->
        <div #bpmnContainer class="bpmn-container"></div>
        
        <!-- Properties Panel (if swimlanes with roles are detected) -->
        <div class="properties-panel" *ngIf="swimlaneRoles.length > 0">
          <h3>Role Assignments</h3>
          <div class="role-assignments">
            <div *ngFor="let roleAssignment of swimlaneRoles" class="role-assignment">
              <div class="swimlane-info">
                <strong>{{roleAssignment.swimlaneName}}</strong>
              </div>
              <div class="role-info">
                <span class="role-badge" [class]="getRoleBadgeClass(roleAssignment.roleName)">
                  {{roleAssignment.roleDisplayName || roleAssignment.roleName}}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Viewer Controls -->
      <div class="viewer-controls">
        <button class="btn btn-sm btn-outline" (click)="zoomIn()" title="Zoom In">
          <i class="bx bx-zoom-in"></i>
        </button>
        <button class="btn btn-sm btn-outline" (click)="zoomOut()" title="Zoom Out">
          <i class="bx bx-zoom-out"></i>
        </button>
        <button class="btn btn-sm btn-outline" (click)="zoomToFit()" title="Fit to Screen">
          <i class="bx bx-fullscreen"></i>
        </button>
      </div>

      <!-- Access Denied Overlay -->
      <div class="access-denied-overlay" *ngIf="!hasAccess">
        <div class="access-denied-message">
          <i class="bx bx-lock"></i>
          <h3>Access Denied</h3>
          <p>You don't have permission to view this diagram.</p>
          <button class="btn btn-primary" (click)="goBack()">Go Back</button>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading diagram...</p>
      </div>
    </div>

    <!-- Error Message -->
    <div class="error-message" *ngIf="error">
      <div class="error-content">
        <i class="bx bx-error-circle"></i>
        <h3>Error Loading Diagram</h3>
        <p>{{error}}</p>
        <button class="btn btn-primary" (click)="goBack()">Go Back</button>
      </div>
    </div>
  `,
  styles: [`
    .diagram-viewer {
      height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      background: #f8f9fa;
    }

    .viewer-header {
      background: white;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 10;
    }

    .diagram-info h2 {
      margin: 0 0 8px 0;
      color: #2c3e50;
      font-size: 24px;
      font-weight: 600;
    }

    .diagram-info p {
      margin: 0 0 8px 0;
      color: #6c757d;
      font-size: 14px;
    }

    .diagram-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #6c757d;
    }

    .diagram-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .viewer-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .viewer-content {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
    }

    .bpmn-container {
      flex: 1;
      background: white;
      border: 1px solid #e9ecef;
      margin: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
    }

    .properties-panel {
      width: 300px;
      background: white;
      border-left: 1px solid #e9ecef;
      padding: 20px;
      overflow-y: auto;
    }

    .properties-panel h3 {
      margin: 0 0 16px 0;
      color: #2c3e50;
      font-size: 16px;
      font-weight: 600;
    }

    .role-assignments {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .role-assignment {
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      background: #f8f9fa;
    }

    .swimlane-info {
      margin-bottom: 8px;
    }

    .swimlane-info strong {
      color: #2c3e50;
      font-size: 14px;
    }

    .role-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      color: white;
    }

    .role-badge.admin {
      background: #e74c3c;
    }

    .role-badge.modeler {
      background: #3498db;
    }

    .role-badge.viewer {
      background: #27ae60;
    }

    .role-badge.default {
      background: #95a5a6;
    }

    .viewer-controls {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 5;
    }

    .dropdown {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 120px;
      z-index: 1000;
    }

    .dropdown-menu a {
      display: block;
      padding: 8px 12px;
      color: #495057;
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
    }

    .dropdown-menu a:hover {
      background: #f8f9fa;
      color: #2c3e50;
    }

    .access-denied-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .access-denied-message {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      max-width: 400px;
    }

    .access-denied-message i {
      font-size: 48px;
      color: #e74c3c;
      margin-bottom: 16px;
    }

    .access-denied-message h3 {
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .access-denied-message p {
      margin: 0 0 20px 0;
      color: #6c757d;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    .loading-overlay p {
      color: #6c757d;
      margin: 0;
    }

    .error-message {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f9fa;
    }

    .error-content {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      max-width: 400px;
    }

    .error-content i {
      font-size: 48px;
      color: #e74c3c;
      margin-bottom: 16px;
    }

    .error-content h3 {
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .error-content p {
      margin: 0 0 20px 0;
      color: #6c757d;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-outline {
      background: white;
      border: 1px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .viewer-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .viewer-actions {
        justify-content: space-between;
      }

      .diagram-meta {
        flex-direction: column;
        gap: 8px;
      }

      .properties-panel {
        display: none;
      }

      .viewer-controls {
        flex-direction: row;
        bottom: 10px;
        right: 10px;
        left: 10px;
        justify-content: center;
      }
    }
  `]
})
export class BpmnDiagramViewerComponent implements OnInit, OnDestroy {
  @ViewChild('bpmnContainer', { static: true }) bpmnContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  private bpmnViewer: BpmnViewer | null = null;
  
  diagram: AppFile | null = null;
  userAccess: UserAccess | null = null;
  hasAccess = false;
  canEdit = false;
  canAssign = false;
  loading = true;
  error: string | null = null;
  showExportMenu = false;
  currentUser: User | null = null;
  
  swimlaneRoles: Array<{
    swimlaneName: string;
    roleName: string;
    roleDisplayName?: string;
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private fileService: FileService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDiagram();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.bpmnViewer) {
      this.bpmnViewer.destroy();
    }
  }

  private loadDiagram(): void {
    const diagramId = this.route.snapshot.paramMap.get('id');
    if (!diagramId) {
      this.error = 'No diagram ID provided';
      this.loading = false;
      return;
    }

    this.fileService.getFileById(parseInt(diagramId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (file: AppFile) => {
          this.diagram = file;
          this.checkUserAccess();
          this.initializeBpmnViewer();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading diagram:', error);
          if (error.status === 403) {
            this.error = 'Access denied. You do not have permission to view this diagram.';
          } else if (error.status === 404) {
            this.error = 'Diagram not found.';
          } else {
            this.error = 'Failed to load diagram. Please try again.';
          }
          this.loading = false;
        }
      });
  }

  private checkUserAccess(): void {
    // Check user permissions based on their roles
    const canView = this.authService.hasRole('ROLE_VIEWER') ||
                   this.authService.hasRole('ROLE_MODELER') ||
                   this.authService.hasRole('ROLE_ADMIN');

    const canEdit = this.authService.hasRole('ROLE_MODELER') ||
                   this.authService.hasRole('ROLE_ADMIN');

    const canAssign = this.authService.hasRole('ROLE_ADMIN');

    // Determine permission level
    let permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW';
    if (canAssign) {
      permissionLevel = 'ADMIN';
    } else if (canEdit) {
      permissionLevel = 'EDIT';
    }

    this.userAccess = {
      hasAccess: canView,
      canEdit: canEdit,
      canAssign: canAssign,
      permissionLevel: permissionLevel
    };

    this.hasAccess = this.userAccess.hasAccess;
    this.canEdit = this.userAccess.canEdit;
    this.canAssign = this.userAccess.canAssign;
  }

  private initializeBpmnViewer(): void {
    if (!this.diagram?.xml && !this.diagram?.base64Data) {
      this.error = 'No diagram content available';
      return;
    }

    if (!this.hasAccess) {
      return;
    }

    try {
      this.bpmnViewer = new BpmnViewer({
        container: this.bpmnContainer.nativeElement
      });

      const xmlContent = this.diagram.xml || 
                        (this.diagram.base64Data ? atob(this.diagram.base64Data) : '');

      this.bpmnViewer.importXML(xmlContent)
        .then(() => {
          // Zoom to fit after a short delay to ensure rendering is complete
          setTimeout(() => {
            this.zoomToFit();
          }, 100);
          
          this.analyzeSwimlanes();
          
          // Apply stored colors if available
          if (this.diagram?.elementColors) {
            this.applyElementColors();
          }
        })
        .catch((error: any) => {
          console.error('Error importing BPMN:', error);
          this.error = 'Failed to render diagram. The file may be corrupted.';
        });

    } catch (error: any) {
      console.error('Error initializing BPMN viewer:', error);
      this.error = 'Failed to initialize diagram viewer.';
    }
  }

  private analyzeSwimlanes(): void {
    // Mock swimlane analysis - replace with actual implementation
    this.swimlaneRoles = [
      { swimlaneName: 'Customer Service', roleName: 'ROLE_VIEWER', roleDisplayName: 'Viewer' },
      { swimlaneName: 'Manager', roleName: 'ROLE_MODELER', roleDisplayName: 'Modeler' },
      { swimlaneName: 'Administrator', roleName: 'ROLE_ADMIN', roleDisplayName: 'Admin' }
    ];
  }

  private applyElementColors(): void {
    if (!this.bpmnViewer || !this.diagram?.elementColors) return;

    try {
      const elementColors = JSON.parse(this.diagram.elementColors);
      const canvas = this.bpmnViewer.get('canvas') as BpmnCanvas;
      const elementRegistry = this.bpmnViewer.get('elementRegistry') as BpmnElementRegistry;

      Object.keys(elementColors).forEach(elementId => {
        const element = elementRegistry.get(elementId);
        if (element) {
          const colors = elementColors[elementId];
          canvas.addMarker(element, 'colored-element');
          
          // Apply colors via CSS classes or direct styling
          const gfx = canvas.getGraphics(element);
          if (gfx && colors.fill) {
            gfx.style.fill = colors.fill;
          }
          if (gfx && colors.stroke) {
            gfx.style.stroke = colors.stroke;
          }
        }
      });
    } catch (error) {
      console.warn('Could not apply element colors:', error);
    }
  }

  // Zoom controls
  zoomIn(): void {
    if (this.bpmnViewer) {
      try {
        const canvas = this.bpmnViewer.get('canvas') as BpmnCanvas;
        const currentZoom = canvas.zoom() as number;
        canvas.zoom(Math.min(currentZoom + 0.1, 4.0));
      } catch (error) {
        console.error('Error zooming in:', error);
      }
    }
  }

  zoomOut(): void {
    if (this.bpmnViewer) {
      try {
        const canvas = this.bpmnViewer.get('canvas') as BpmnCanvas;
        const currentZoom = canvas.zoom() as number;
        canvas.zoom(Math.max(currentZoom - 0.1, 0.1));
      } catch (error) {
        console.error('Error zooming out:', error);
      }
    }
  }

  zoomToFit(): void {
    if (this.bpmnViewer) {
      try {
        const canvas = this.bpmnViewer.get('canvas') as BpmnCanvas;
        canvas.zoom('fit-viewport');
      } catch (error) {
        console.error('Error fitting to viewport:', error);
      }
    }
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/files']);
  }

  editDiagram(): void {
    if (this.diagram && this.canEdit) {
      this.router.navigate(['/modeler'], { 
        queryParams: { fileId: this.diagram.id } 
      });
    }
  }

  manageDiagramAccess(): void {
    if (this.diagram && this.canAssign) {
      this.router.navigate(['/admin'], { 
        queryParams: { tab: 'diagrams', diagram: this.diagram.id } 
      });
    }
  }

  exportDiagram(format: string): void {
    if (!this.diagram || !this.bpmnViewer) {
      console.error('Cannot export: diagram or viewer not available');
      return;
    }

    this.showExportMenu = false;

    try {
      switch (format) {
        case 'xml':
          this.exportAsXML();
          break;
        case 'svg':
          this.exportAsSVG();
          break;
        case 'png':
          this.exportAsPNG();
          break;
        case 'pdf':
          this.exportAsPDF();
          break;
        default:
          console.error('Unsupported export format:', format);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  }

  private exportAsXML(): void {
    if (!this.bpmnViewer || !this.diagram) return;

    this.bpmnViewer.saveXML()
      .then((result: any) => {
        const blob = new Blob([result.xml], { type: 'application/xml' });
        this.downloadBlob(blob, `${this.diagram!.fileName}.xml`);
      })
      .catch((error: any) => {
        console.error('Export XML error:', error);
      });
  }

  private exportAsSVG(): void {
    if (!this.bpmnViewer || !this.diagram) return;

    this.bpmnViewer.saveSVG()
      .then((result: any) => {
        const blob = new Blob([result.svg], { type: 'image/svg+xml' });
        this.downloadBlob(blob, `${this.diagram!.fileName}.svg`);
      })
      .catch((error: any) => {
        console.error('Export SVG error:', error);
      });
  }

  private exportAsPNG(): void {
    if (!this.bpmnViewer || !this.diagram) return;

    try {
      this.bpmnViewer.saveSVG()
        .then((result: any) => {
          // Create a temporary div to convert SVG to PNG
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = result.svg;
          tempDiv.style.position = 'absolute';
          tempDiv.style.top = '-10000px';
          tempDiv.style.backgroundColor = '#ffffff';
          document.body.appendChild(tempDiv);

          // You would need html2canvas library for this
          // For now, just export as SVG
          console.log('PNG export requires html2canvas library. Exporting as SVG instead.');
          const blob = new Blob([result.svg], { type: 'image/svg+xml' });
          this.downloadBlob(blob, `${this.diagram!.fileName}.svg`);

          document.body.removeChild(tempDiv);
        })
        .catch((error: any) => {
          console.error('Export PNG error:', error);
        });
    } catch (error) {
      console.error('PNG export error:', error);
    }
  }

  private exportAsPDF(): void {
    if (!this.bpmnViewer || !this.diagram) return;

    try {
      // PDF export would require jsPDF and html2canvas
      console.log('PDF export requires jsPDF library. Exporting as SVG instead.');
      this.exportAsSVG();
    } catch (error) {
      console.error('PDF export error:', error);
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    return 'default';
  }
}