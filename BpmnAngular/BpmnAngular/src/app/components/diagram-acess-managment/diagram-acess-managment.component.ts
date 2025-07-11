import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { DiagramAssignment, DiagramFile, DiagramService } from '../../services/diagram-assgnment.service';
import { User } from '../../services/authentication.service';
import { Role, RoleService } from '../../services/role.service';
import { Group, GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';


@Component({
  selector: 'app-diagram-access-management',
  standalone: true,
  imports: [],
  templateUrl: './diagram-acess-management.component.html',
  styleUrls: ['./diagram-acess-management.component.css'],

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

  constructor(
    private diagramService: DiagramService,
    private userService: UserService,
    private roleService: RoleService,
    private groupService: GroupService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    
    forkJoin({
      diagrams: this.diagramService.getAllFiles(),
      users: this.userService.getAllUsers(),
      roles: this.roleService.getAllRoles(),
      groups: this.groupService.getAllGroups()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.diagrams = data.diagrams;
        this.users = data.users;
        this.roles = data.roles;
        this.groups = data.groups;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading = false;
      }
    });
  }

  loadDiagramAssignments(): void {
    if (this.selectedDiagramId) {
      this.selectedDiagram = this.diagrams.find(d => d.id === +this.selectedDiagramId) || null;
      
      this.diagramService.getDiagramAssignments(+this.selectedDiagramId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (assignments) => {
            this.assignments = assignments;
          },
          error: (error) => {
            console.error('Error loading assignments:', error);
          }
        });
    }
  }

  addAssignment(): void {
    if (!this.selectedDiagramId || !this.assignmentForm.type || !this.assignmentForm.targetId) {
      return;
    }

    let assignmentCall;
    
    switch (this.assignmentForm.type) {
      case 'USER':
        assignmentCall = this.diagramService.assignDiagramToUser(
          +this.selectedDiagramId,
          this.assignmentForm.targetId,
          this.assignmentForm.permissionLevel,
          this.assignmentForm.notes
        );
        break;
      case 'ROLE':
        assignmentCall = this.diagramService.assignDiagramToRole(
          +this.selectedDiagramId,
          this.assignmentForm.targetId,
          this.assignmentForm.permissionLevel,
          this.assignmentForm.notes
        );
        break;
      case 'GROUP':
        assignmentCall = this.diagramService.assignDiagramToGroup(
          +this.selectedDiagramId,
          this.assignmentForm.targetId,
          this.assignmentForm.permissionLevel,
          this.assignmentForm.notes
        );
        break;
      default:
        return;
    }

    assignmentCall.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadDiagramAssignments();
          this.closeAssignmentModal();
        },
        error: (error) => {
          console.error('Error adding assignment:', error);
          alert('Error adding assignment: ' + error.message);
        }
      });
  }

  updateAssignmentPermission(assignment: DiagramAssignment, event: any): void {
    const newPermissionLevel = event.target.value;
    
    this.diagramService.updateAssignmentPermission(assignment.id, newPermissionLevel)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedAssignment) => {
          const index = this.assignments.findIndex(a => a.id === assignment.id);
          if (index > -1) {
            this.assignments[index] = updatedAssignment;
          }
        },
        error: (error) => {
          console.error('Error updating assignment:', error);
          alert('Error updating assignment: ' + error.message);
          // Reset the select to original value
          event.target.value = assignment.permissionLevel;
        }
      });
  }

  removeAssignment(assignment: DiagramAssignment): void {
    if (confirm('Are you sure you want to remove this assignment?')) {
      this.diagramService.removeAssignment(assignment.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.assignments = this.assignments.filter(a => a.id !== assignment.id);
          },
          error: (error) => {
            console.error('Error removing assignment:', error);
            alert('Error removing assignment: ' + error.message);
          }
        });
    }
  }

  viewDiagram(diagram: DiagramFile): void {
    // Navigate to diagram viewer
    // this.router.navigate(['/diagrams/view', diagram.id]);
    console.log('View diagram:', diagram);
  }

  editDiagram(diagram: DiagramFile): void {
    // Navigate to diagram editor
    // this.router.navigate(['/diagrams/edit', diagram.id]);
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