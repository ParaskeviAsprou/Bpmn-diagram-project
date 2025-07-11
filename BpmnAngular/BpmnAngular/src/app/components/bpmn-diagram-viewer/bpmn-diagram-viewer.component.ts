import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DiagramFile, DiagramService } from '../../services/diagram-assgnment.service';
import { AuthenticationService } from '../../services/authentication.service';
import { CommonModule } from '@angular/common';
import { HasPermissionDirective } from '../../directives/permission.directive';
import Viewer from 'bpmn-js/lib/Viewer';
@Component({
  selector: 'app-bpmn-diagram-viewer',
  standalone: true,
  imports: [CommonModule, HasPermissionDirective],
  templateUrl: './bpmn-diagram-viewer.component.html',
  styleUrl: './bpmn-diagram-viewer.component.css',
})
export class BpmnDiagramViewerComponent implements OnInit, OnDestroy {
  @ViewChild('bpmnContainer', { static: true }) bpmnContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  private bpmnViewer: any; // BpmnJS instance
  
  diagram: DiagramFile | null = null;
  userAccess: any = null;
  hasAccess = false;
  canEdit = false;
  canAssign = false;
  loading = true;
  error: string | null = null;
  showExportMenu = false;
  
  swimlaneRoles: Array<{
    swimlaneName: string;
    roleName: string;
    roleDisplayName?: string;
  }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private diagramService: DiagramService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
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

    this.diagramService.getDiagram(diagramId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (diagram: DiagramFile) => {
          this.diagram = diagram;
          this.checkUserAccess();
          this.initializeBpmnViewer();
        },
        error: (error: any) => {
          this.error = 'Failed to load diagram';
          this.loading = false;
        }
      });
  }

  private checkUserAccess(): void {
    if (!this.diagram) return;
    
    // Check user permissions
    this.hasAccess = true; // Implement actual permission check
    this.canEdit = this.authService.hasPermission('edit-diagrams');
    this.canAssign = this.authService.hasPermission('assign-diagrams');
  }

  private initializeBpmnViewer(): void {
    if (!this.diagram?.content) {
      this.error = 'No diagram content available';
      this.loading = false;
      return;
    }

    this.bpmnViewer = new Viewer({
      container: this.bpmnContainer.nativeElement
    });

    this.bpmnViewer.importXML(this.diagram.content)
      .then(() => {
        this.loading = false;
        this.extractSwimlaneRoles();
      })
      .catch((error: any) => {
        this.error = 'Failed to render diagram';
        this.loading = false;
      });
  }

  private extractSwimlaneRoles(): void {
    // Extract swimlane role information from the diagram
    this.swimlaneRoles = [];
  }

  goBack(): void {
    this.router.navigate(['/my-diagrams']);
  }

  editDiagram(): void {
    if (this.diagram) {
      this.router.navigate(['/modeler', this.diagram.id]);
    }
  }

  manageDiagramAccess(): void {
    if (this.diagram) {
      this.router.navigate(['/diagram-access', this.diagram.id]);
    }
  }

  exportDiagram(format: string): void {
    this.showExportMenu = false;
    if (!this.bpmnViewer) return;

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
    }
  }

  private exportAsXML(): void {
    this.bpmnViewer.saveXML({ format: true })
      .then((result: any) => {
        this.downloadFile(result.xml, `${this.diagram?.fileName}.bpmn`, 'application/xml');
      });
  }

  private exportAsSVG(): void {
    this.bpmnViewer.saveSVG()
      .then((result: any) => {
        this.downloadFile(result.svg, `${this.diagram?.fileName}.svg`, 'image/svg+xml');
      });
  }

  private exportAsPNG(): void {
    // Implementation for PNG export
  }

  private exportAsPDF(): void {
    // Implementation for PDF export
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getRoleBadgeClass(roleName: string): string {
    switch (roleName?.toLowerCase()) {
      case 'admin': return 'admin';
      case 'modeler': return 'modeler';
      case 'viewer': return 'viewer';
      default: return 'default';
    }
  }s.route.params.pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const diagramId = +params['id'];
        if (diagramId) {
          this.loadDiagram(diagramId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.bpmnViewer) {
      this.bpmnViewer.destroy();
    }
  }

  loadDiagram(diagramId: number): void {
    this.loading = true;
 
    this.diagramService.checkDiagramAccess(diagramId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (access) => {
          this.userAccess = access;
          this.hasAccess = access.hasAccess;
          this.canEdit = access.canEdit;
          this.canAssign = access.canAssign;
          
          if (this.hasAccess) {
            this.loadDiagramContent(diagramId);
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error checking diagram access:', error);
          this.error = 'Error checking diagram access';
          this.loading = false;
        }
      });
  }

  loadDiagramContent(diagramId: number): void {
    this.diagramService.getFileById(diagramId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (diagram) => {
          this.diagram = diagram;
          this.initializeBpmnViewer();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading diagram:', error);
          this.error = 'Error loading diagram content';
          this.loading = false;
        }
      });
  }

  initializeBpmnViewer(): void {
    if (!this.diagram?.xml) {
      this.error = 'No diagram content found';
      return;
    }

    try {
      // Initialize BPMN.js viewer
      // this.bpmnViewer = new BpmnJS({
      //   container: this.bpmnContainer.nativeElement
      // });

      // For demo purposes, we'll show a placeholder
      this.bpmnContainer.nativeElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; color: #666;">
          <div style="text-align: center;">
            <h3>BPMN Diagram Viewer</h3>
            <p>Diagram: ${this.diagram.fileName}</p>
            <p>This would render the BPMN diagram using bpmn-js</p>
            <pre style="max-width: 500px; overflow: auto; text-align: left; background: white; padding: 20px; border-radius: 4px;">
              ${this.diagram.xml.substring(0, 500)}...
            </pre>
          </div>
        </div>
      `;

      // this.bpmnViewer.importXML(this.diagram.xml).then(() => {
      //   this.extractSwimlaneRoles();
      // });
      
      // Mock swimlane roles for demo
      this.swimlaneRoles = [
        { swimlaneName: 'Customer Service', roleName: 'ROLE_VIEWER', roleDisplayName: 'Viewer' },
        { swimlaneName: 'Manager', roleName: 'ROLE_MODELER', roleDisplayName: 'Modeler' },
        { swimlaneName: 'Administrator', roleName: 'ROLE_ADMIN', roleDisplayName: 'Admin' }
      ];

    } catch (error) {
      console.error('Error initializing BPMN viewer:', error);
      this.error = 'Error initializing diagram viewer';
    }
  }

  extractSwimlaneRoles(): void {
    // Implementation to extract role assignments from swimlanes
    // This would parse the BPMN XML to find swimlanes with role assignments
    // and populate the swimlaneRoles array
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    return 'default';
  }

  editDiagram(): void {
    if (this.diagram && this.canEdit) {
      this.router.navigate(['/diagrams/edit', this.diagram.id]);
    }
  }

  manageDiagramAccess(): void {
    if (this.diagram && this.canAssign) {
      this.router.navigate(['/admin'], { queryParams: { tab: 'diagrams', diagram: this.diagram.id } });
    }
  }

  exportDiagram(format: string): void {
    if (this.diagram) {
      window.open(`http://localhost:8080/api/v1/file/${this.diagram.id}/export/${format}`, '_blank');
    }
    this.showExportMenu = false;
  }

  goBack(): void {
    this.router.navigate(['/diagrams']);
  }
}