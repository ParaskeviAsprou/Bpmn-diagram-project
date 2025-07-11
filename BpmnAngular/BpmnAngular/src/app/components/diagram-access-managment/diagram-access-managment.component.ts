import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Mock interfaces - replace with actual imports
interface DiagramFile {
  id: number;
  fileName: string;
  description?: string;
  createdBy: string;
  updatedTime: Date;
  fileSize: number;
}

interface DiagramAssignment {
  id: number;
  assignmentType: 'USER' | 'ROLE' | 'GROUP';
  assignedToName: string;
  permissionLevel: 'VIEW' | 'EDIT' | 'ADMIN';
  assignedBy: string;
  assignedTime: Date;
  notes?: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Role {
  id: number;
  name: string;
  displayName?: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
}
@Component({
  selector: 'app-diagram-access-managment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diagram-access-managment.component.html',
  styleUrl: './diagram-access-managment.component.css'
})
export class DiagramAccessManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  diagrams: DiagramFile[] = [];
  selectedDiagramId: number | null = null;
  selectedDiagram: DiagramFile | null = null;
  assignments: DiagramAssignment[] = [];
  
  users: User[] = [];
  roles: Role[] = [];
  groups: Group[] = [];
  
  loading = false;
  showAssignmentModal = false;
  
  assignmentForm = {
    type: '',
    targetId: null as number | null,
    permissionLevel: 'VIEW',
    notes: ''
  };

  constructor() {}

  ngOnInit(): void {
    this.loadMockData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMockData(): void {
    // Mock data - replace with actual service calls
    this.diagrams = [
      {
        id: 1,
        fileName: 'Process Flow.bpmn',
        description: 'Main business process',
        createdBy: 'admin',
        updatedTime: new Date(),
        fileSize: 15360
      }
    ];

    this.users = [
      { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
    ];

    this.roles = [
      { id: 1, name: 'ROLE_ADMIN', displayName: 'Administrator' },
      { id: 2, name: 'ROLE_MODELER', displayName: 'Modeler' }
    ];

    this.groups = [
      { id: 1, name: 'Developers', description: 'Development Team' },
      { id: 2, name: 'Managers', description: 'Management Team' }
    ];
  }

  loadDiagramAssignments(): void {
    if (this.selectedDiagramId !== null) {
      const diagramId = this.selectedDiagramId;
      this.selectedDiagram = this.diagrams.find(d => d.id === +diagramId) || null;
      
      // Mock assignments - replace with actual service call
      this.assignments = [
        {
          id: 1,
          assignmentType: 'USER',
          assignedToName: 'John Doe',
          permissionLevel: 'EDIT',
          assignedBy: 'admin',
          assignedTime: new Date(),
          notes: 'Project lead'
        }
      ];
    }
  }

  addAssignment(): void {
    if (!this.selectedDiagramId || !this.assignmentForm.type || !this.assignmentForm.targetId) {
      return;
    }

    // Mock assignment creation - replace with actual service call
    console.log('Adding assignment:', this.assignmentForm);
    
    // Simulate successful assignment
    this.closeAssignmentModal();
    this.loadDiagramAssignments();
  }

  updateAssignmentPermission(assignment: DiagramAssignment, event: any): void {
    const newPermissionLevel = event.target.value;
    
    // Mock update - replace with actual service call
    console.log('Updating assignment permission:', assignment.id, newPermissionLevel);
    
    assignment.permissionLevel = newPermissionLevel as 'VIEW' | 'EDIT' | 'ADMIN';
  }

  removeAssignment(assignment: DiagramAssignment): void {
    if (confirm('Are you sure you want to remove this assignment?')) {
      // Mock removal - replace with actual service call
      console.log('Removing assignment:', assignment.id);
      
      this.assignments = this.assignments.filter(a => a.id !== assignment.id);
    }
  }

  viewDiagram(diagram: DiagramFile): void {
    
    console.log('View diagram:', diagram);
  }

  editDiagram(diagram: DiagramFile): void {
    console.log('Edit diagram:', diagram);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  closeAssignmentModal(): void {
    this.showAssignmentModal = false;
    this.assignmentForm = {
      type: '',
      targetId: null,
      permissionLevel: 'VIEW',
      notes: ''
    };
  }
}