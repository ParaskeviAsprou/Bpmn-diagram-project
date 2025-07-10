import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Router } from '@angular/router';
import { AccessInfo, DiagramAssignmentService } from '../../services/diagram-assgnment.service';
import { AuthenticationService } from '../../services/authentication.service';
import { DiagramSharingComponent } from '../diagram-sharing/diagram-sharing.component';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatCard, MatCardContent, MatCardModule } from '@angular/material/card';
import { MatFormField, MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect, MatSelectModule } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChip, MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatSelectionList } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
interface DiagramInfo {
  id: number;
  fileName: string;
  description: string;
  uploadTime: string;
  updatedTime: string;
  createdBy: string;
  fileSize: number;
  accessInfo?: AccessInfo;
  assignmentSource?: string; 
}

@Component({
  selector: 'app-my-diagrams',
  standalone: true,
  imports: [   CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
  ],
  templateUrl: './my-diagrams.component.html',
  styleUrl: './my-diagrams.component.css'
})
export class MyDiagramsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<DiagramInfo>();
  loading = false;
  currentUser: any;

  displayedColumns = [
    'fileName', 
    'description', 
    'createdBy', 
    'permission', 
    'assignmentSource', 
    'updatedTime', 
    'actions'
  ];

  filterText = '';
  showOnlyMyDiagrams = false;

  permissionFilters = [
    { value: 'all', label: 'All Permissions', count: 0 },
    { value: 'VIEW', label: 'View Only', count: 0 },
    { value: 'EDIT', label: 'Can Edit', count: 0 },
    { value: 'ADMIN', label: 'Admin', count: 0 }
  ];

  selectedPermissionFilter = 'all';

  constructor(
    private assignmentService: DiagramAssignmentService,
    private authService: AuthenticationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDiagrams();
    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadDiagrams(): void {
    this.loading = true;
    
    this.assignmentService.getAvailableDiagrams().subscribe({
      next: async (diagrams) => {
        const diagramsWithAccess = await this.enrichDiagramsWithAccessInfo(diagrams);
        this.dataSource.data = diagramsWithAccess;
        this.updatePermissionCounts();
        this.loading = false;
      },
      error: (error) => {
        this.showError('Failed to load diagrams');
        this.loading = false;
      }
    });
  }

  private async enrichDiagramsWithAccessInfo(diagrams: any[]): Promise<DiagramInfo[]> {
    const enrichedDiagrams: DiagramInfo[] = [];

    for (const diagram of diagrams) {
      try {
        const accessInfo = await this.assignmentService.checkDiagramAccess(diagram.id).toPromise();
        const assignmentSource = this.determineAssignmentSource(diagram);
        
        enrichedDiagrams.push({
          id: diagram.id,
          fileName: diagram.fileName,
          description: diagram.description || 'No description',
          uploadTime: diagram.uploadTime,
          updatedTime: diagram.updatedTime,
          createdBy: diagram.createdBy,
          fileSize: diagram.fileSize,
          accessInfo,
          assignmentSource
        });
      } catch (error) {
        // If we can't get access info, still include the diagram but with basic info
        enrichedDiagrams.push({
          id: diagram.id,
          fileName: diagram.fileName,
          description: diagram.description || 'No description',
          uploadTime: diagram.uploadTime,
          updatedTime: diagram.updatedTime,
          createdBy: diagram.createdBy,
          fileSize: diagram.fileSize,
          accessInfo: { canView: true, canEdit: false, canAssign: false, permissionLevel: 'VIEW' },
          assignmentSource: 'unknown'
        });
      }
    }

    return enrichedDiagrams;
  }

  private determineAssignmentSource(diagram: any): string {
    // This would ideally come from the backend, but we can make educated guesses
    if (diagram.createdBy === this.currentUser?.username) {
      return 'owner';
    }
    
    // Could check assignments to determine if it's through role, group, or direct assignment
    // For now, return 'assigned' as a generic term
    return 'assigned';
  }

  setupFilters(): void {
    this.dataSource.filterPredicate = (data: DiagramInfo, filter: string) => {
      const filterObj = JSON.parse(filter);
      
      // Text filter
      const textMatch = !filterObj.text || 
        data.fileName.toLowerCase().includes(filterObj.text.toLowerCase()) ||
        data.description.toLowerCase().includes(filterObj.text.toLowerCase()) ||
        data.createdBy.toLowerCase().includes(filterObj.text.toLowerCase());
      
      // Permission filter
      const permissionMatch = filterObj.permission === 'all' || 
        data.accessInfo?.permissionLevel === filterObj.permission;
      
      // My diagrams filter
      const ownerMatch = !filterObj.onlyMy || data.createdBy === this.currentUser?.username;
      
      return textMatch && permissionMatch && ownerMatch;
    };
  }

  applyFilters(): void {
    const filterValue = JSON.stringify({
      text: this.filterText,
      permission: this.selectedPermissionFilter,
      onlyMy: this.showOnlyMyDiagrams
    });
    
    this.dataSource.filter = filterValue;
    this.updatePermissionCounts();
  }

  updatePermissionCounts(): void {
    const filteredData = this.dataSource.filteredData;
    
    this.permissionFilters.forEach(filter => {
      if (filter.value === 'all') {
        filter.count = filteredData.length;
      } else {
        filter.count = filteredData.filter(item => 
          item.accessInfo?.permissionLevel === filter.value
        ).length;
      }
    });
  }

  openDiagram(diagram: DiagramInfo): void {
    if (diagram.accessInfo?.canView) {
      this.router.navigate(['/editor', diagram.id]);
    } else {
      this.showError('You do not have permission to view this diagram');
    }
  }

  editDiagram(diagram: DiagramInfo): void {
    if (diagram.accessInfo?.canEdit) {
      this.router.navigate(['/editor', diagram.id]);
    } else {
      this.showError('You do not have permission to edit this diagram');
    }
  }

  shareDiagram(diagram: DiagramInfo): void {
    if (diagram.accessInfo?.canAssign) {
      const dialogRef = this.dialog.open(DiagramSharingComponent, {
        width: '900px',
        maxHeight: '90vh',
        data: {
          diagramId: diagram.id,
          diagramName: diagram.fileName,
          canAssign: diagram.accessInfo.canAssign
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.loadDiagrams(); // Refresh if changes were made
        }
      });
    } else {
      // Still open dialog but in read-only mode
      this.dialog.open(DiagramSharingComponent, {
        width: '900px',
        maxHeight: '90vh',
        data: {
          diagramId: diagram.id,
          diagramName: diagram.fileName,
          canAssign: false
        }
      });
    }
  }

  exportDiagram(diagram: DiagramInfo, format: string): void {
    // This would call the export API endpoint
    window.open(`/api/v1/file/${diagram.id}/export/${format}`, '_blank');
  }

  getPermissionIcon(permissionLevel: string): string {
    switch (permissionLevel) {
      case 'VIEW': return 'visibility';
      case 'EDIT': return 'edit';
      case 'ADMIN': return 'admin_panel_settings';
      default: return 'help';
    }
  }

  getPermissionColor(permissionLevel: string): string {
    switch (permissionLevel) {
      case 'VIEW': return 'primary';
      case 'EDIT': return 'accent';
      case 'ADMIN': return 'warn';
      default: return 'basic';
    }
  }

  getAssignmentSourceIcon(source: string): string {
    switch (source) {
      case 'owner': return 'person';
      case 'direct': return 'how_to_reg';
      case 'role': return 'admin_panel_settings';
      case 'group': return 'group';
      case 'hierarchy': return 'account_tree';
      default: return 'share';
    }
  }

  getAssignmentSourceLabel(source: string): string {
    switch (source) {
      case 'owner': return 'Owner';
      case 'direct': return 'Direct Assignment';
      case 'role': return 'Role Assignment';
      case 'group': return 'Group Assignment';
      case 'hierarchy': return 'Role Hierarchy';
      default: return 'Assigned';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

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
