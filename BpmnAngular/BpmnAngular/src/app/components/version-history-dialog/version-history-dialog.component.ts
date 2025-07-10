// // version-history-dialog.component.ts
// import { Component, Inject, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
// import { MatButtonModule } from '@angular/material/button';
// import { MatIconModule } from '@angular/material/icon';
// import { MatTableModule } from '@angular/material/table';
// import { MatCardModule } from '@angular/material/card';
// import { MatChipsModule } from '@angular/material/chips';
// import { MatTooltipModule } from '@angular/material/tooltip';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { DiagramAssignmentService } from '../../services/diagram-assgnment.service';



// export interface VersionHistoryDialogData {
//   diagram: DiagramFile;
// }

// export interface VersionHistoryResult {
//   action: 'restore' | 'create' | 'close';
//   versionNumber?: number;
//   versionNotes?: string;
// }

// @Component({
//   selector: 'app-version-history-dialog',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     MatDialogModule,
//     MatButtonModule,
//     MatIconModule,
//     MatTableModule,
//     MatCardModule,
//     MatChipsModule,
//     MatTooltipModule,
//     MatProgressSpinnerModule
//   ],
//   template: `
//     <div class="version-history-dialog">
//       <div mat-dialog-title class="dialog-header">
//         <div class="header-content">
//           <mat-icon class="header-icon">history</mat-icon>
//           <div class="header-text">
//             <h2>Version History</h2>
//             <p class="diagram-name">{{ data.diagram.fileName }}</p>
//           </div>
//         </div>
//       </div>

//       <div mat-dialog-content class="dialog-content">
//         <!-- Current Version Info -->
//         <mat-card class="current-version-card">
//           <mat-card-header>
//             <mat-icon mat-card-avatar color="primary">star</mat-icon>
//             <mat-card-title>Current Version</mat-card-title>
//             <mat-card-subtitle>Active diagram</mat-card-subtitle>
//           </mat-card-header>
//           <mat-card-content>
//             <div class="version-info">
//               <div class="info-item">
//                 <mat-icon>schedule</mat-icon>
//                 <span>Last Modified: {{ formatDate(data.diagram.updatedAt) }}</span>
//               </div>
//               <div class="info-item">
//                 <mat-icon>person</mat-icon>
//                 <span>Modified By: {{ data.diagram.updatedBy || data.diagram.createdBy }}</span>
//               </div>
//               <div class="info-item" *ngIf="hasMetadata()">
//                 <mat-icon>extension</mat-icon>
//                 <span>Enhanced with metadata</span>
//               </div>
//             </div>
//           </mat-card-content>
//         </mat-card>

//         <!-- Create New Version Section -->
//         <mat-card class="create-version-card">
//           <mat-card-header>
//             <mat-icon mat-card-avatar color="accent">add</mat-icon>
//             <mat-card-title>Create New Version</mat-card-title>
//             <mat-card-subtitle>Save current state as a version</mat-card-subtitle>
//           </mat-card-header>
//           <mat-card-content>
//             <div class="create-version-form">
//               <!-- <mat-form-field appearance="outline" class="version-notes-field">
//                 <mat-label>Version Notes (Optional)</mat-label> -->
//                 <textarea 
//                   matInput 
//                   [(ngModel)]="newVersionNotes"
//                   placeholder="Describe what changed in this version..."
//                   rows="2"></textarea>
//               <!-- </mat-form-field> -->
//               <button 
//                 mat-raised-button 
//                 color="accent"
//                 (click)="createNewVersion()"
//                 [disabled]="isCreatingVersion">
//                 <mat-icon *ngIf="!isCreatingVersion">save</mat-icon>
//                 <mat-spinner *ngIf="isCreatingVersion" diameter="20"></mat-spinner>
//                 Create Version
//               </button>
//             </div>
//           </mat-card-content>
//         </mat-card>

//         <!-- Version History Table -->
//         <div class="versions-section">
//           <h3>Previous Versions</h3>
          
//           <div *ngIf="isLoading" class="loading-state">
//             <mat-spinner diameter="40"></mat-spinner>
//             <p>Loading version history...</p>
//           </div>

//           <div *ngIf="!isLoading && versions.length === 0" class="empty-state">
//             <mat-icon class="empty-icon">history</mat-icon>
//             <h4>No Previous Versions</h4>
//             <p>This diagram doesn't have any saved versions yet.</p>
//             <p>Create a version above to start tracking changes.</p>
//           </div>

//           <div *ngIf="!isLoading && versions.length > 0" class="versions-table">
//             <table mat-table [dataSource]="versions" class="versions-mat-table">
              
//               <!-- Version Number Column -->
//               <ng-container matColumnDef="version">
//                 <th mat-header-cell *matHeaderCellDef>Version</th>
//                 <td mat-cell *matCellDef="let version">
//                   <div class="version-badge">
//                     <mat-icon>bookmark</mat-icon>
//                     <span>v{{ version.versionNumber }}</span>
//                   </div>
//                 </td>
//               </ng-container>

//               <!-- Date Column -->
//               <ng-container matColumnDef="date">
//                 <th mat-header-cell *matHeaderCellDef>Created</th>
//                 <td mat-cell *matCellDef="let version">
//                   <div class="date-info">
//                     <span class="date">{{ formatDate(version.createdTime) }}</span>
//                     <span class="time">{{ formatTime(version.createdTime) }}</span>
//                   </div>
//                 </td>
//               </ng-container>

//               <!-- Author Column -->
//               <ng-container matColumnDef="author">
//                 <th mat-header-cell *matHeaderCellDef>Author</th>
//                 <td mat-cell *matCellDef="let version">
//                   <div class="author-info">
//                     <mat-icon>person</mat-icon>
//                     <span>{{ version.createdBy }}</span>
//                   </div>
//                 </td>
//               </ng-container>

//               <!-- Notes Column -->
//               <ng-container matColumnDef="notes">
//                 <th mat-header-cell *matHeaderCellDef>Notes</th>
//                 <td mat-cell *matCellDef="let version">
//                   <div class="notes-content">
//                     <span *ngIf="version.versionNotes; else noNotes" 
//                           [matTooltip]="version.versionNotes"
//                           class="notes-text">
//                       {{ truncateText(version.versionNotes, 50) }}
//                     </span>
//                     <ng-template #noNotes>
//                       <span class="no-notes">No notes</span>
//                     </ng-template>
//                   </div>
//                 </td>
//               </ng-container>

//               <!-- Features Column -->
//               <ng-container matColumnDef="features">
//                 <th mat-header-cell *matHeaderCellDef>Features</th>
//                 <td mat-cell *matCellDef="let version">
//                   <div class="features-chips">
//                     <mat-chip-set>
//                       <mat-chip *ngIf="version.hasMetadata" color="primary">
//                         <mat-icon matChipAvatar>extension</mat-icon>
//                         Enhanced
//                       </mat-chip>
//                     </mat-chip-set>
//                   </div>
//                 </td>
//               </ng-container>

//               <!-- Actions Column -->
//               <ng-container matColumnDef="actions">
//                 <th mat-header-cell *matHeaderCellDef>Actions</th>
//                 <td mat-cell *matCellDef="let version">
//                   <div class="action-buttons">
//                     <button 
//                       mat-icon-button 
//                       color="primary"
//                       (click)="restoreVersion(version)"
//                       [disabled]="isRestoring"
//                       matTooltip="Restore this version">
//                       <mat-icon>restore</mat-icon>
//                     </button>
//                     <button 
//                       mat-icon-button 
//                       color="accent"
//                       (click)="compareWithCurrent(version)"
//                       matTooltip="Compare with current">
//                       <mat-icon>compare</mat-icon>
//                     </button>
//                   </div>
//                 </td>
//               </ng-container>

//               <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
//               <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
//             </table>
//           </div>
//         </div>
//       </div>

//       <div mat-dialog-actions class="dialog-actions">
//         <button mat-button (click)="onCancel()">
//           <mat-icon>close</mat-icon>
//           Close
//         </button>
//       </div>
//     </div>
//   `,
//   styles: [`
//     .version-history-dialog {
//       min-width: 800px;
//       max-width: 1200px;
//       max-height: 80vh;
//     }

//     .dialog-header {
//       border-bottom: 1px solid #e0e0e0;
//       margin-bottom: 0;
//       padding-bottom: 16px;
//     }

//     .header-content {
//       display: flex;
//       align-items: center;
//       gap: 12px;
//     }

//     .header-icon {
//       font-size: 32px;
//       color: #1976d2;
//     }

//     .header-text h2 {
//       margin: 0;
//       font-size: 20px;
//       font-weight: 500;
//     }

//     .diagram-name {
//       margin: 4px 0 0 0;
//       color: #666;
//       font-size: 14px;
//       font-family: monospace;
//       background: #f5f5f5;
//       padding: 4px 8px;
//       border-radius: 4px;
//       display: inline-block;
//     }

//     .dialog-content {
//       padding: 24px;
//       max-height: 60vh;
//       overflow-y: auto;
//     }

//     .current-version-card, .create-version-card {
//       margin-bottom: 24px;
//     }

//     .version-info {
//       display: flex;
//       flex-direction: column;
//       gap: 8px;
//     }

//     .info-item {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       font-size: 14px;
//     }

//     .info-item mat-icon {
//       font-size: 16px;
//       color: #666;
//     }

//     .create-version-form {
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     .version-notes-field {
//       width: 100%;
//     }

//     .versions-section h3 {
//       margin: 0 0 16px 0;
//       color: #333;
//     }

//     .loading-state, .empty-state {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       padding: 40px;
//       text-align: center;
//     }

//     .empty-icon {
//       font-size: 48px;
//       color: #ccc;
//       margin-bottom: 16px;
//     }

//     .empty-state h4 {
//       margin: 0 0 8px 0;
//       color: #666;
//     }

//     .empty-state p {
//       margin: 4px 0;
//       color: #999;
//     }

//     .versions-mat-table {
//       width: 100%;
//       margin-top: 16px;
//     }

//     .version-badge {
//       display: flex;
//       align-items: center;
//       gap: 4px;
//       font-weight: 500;
//     }

//     .version-badge mat-icon {
//       font-size: 16px;
//       color: #1976d2;
//     }

//     .date-info {
//       display: flex;
//       flex-direction: column;
//     }

//     .date {
//       font-weight: 500;
//     }

//     .time {
//       font-size: 12px;
//       color: #666;
//     }

//     .author-info {
//       display: flex;
//       align-items: center;
//       gap: 4px;
//     }

//     .author-info mat-icon {
//       font-size: 16px;
//       color: #666;
//     }

//     .notes-content {
//       max-width: 200px;
//     }

//     .notes-text {
//       font-style: italic;
//     }

//     .no-notes {
//       color: #999;
//       font-style: italic;
//     }

//     .features-chips mat-chip {
//       font-size: 11px;
//     }

//     .action-buttons {
//       display: flex;
//       gap: 4px;
//     }

//     .dialog-actions {
//       border-top: 1px solid #e0e0e0;
//       margin-top: 0;
//       padding: 16px 24px;
//       justify-content: flex-end;
//     }

//     @media (max-width: 768px) {
//       .version-history-dialog {
//         min-width: 95vw;
//       }

//       .versions-mat-table {
//         font-size: 12px;
//       }

//       .action-buttons {
//         flex-direction: column;
//       }
//     }
//   `]
// })
// export class VersionHistoryDialogComponent implements OnInit {
//   versions: DiagramVersion[] = [];
//   newVersionNotes: string = '';
//   isLoading = true;
//   isCreatingVersion = false;
//   isRestoring = false;

//   displayedColumns: string[] = ['version', 'date', 'author', 'notes', 'features', 'actions'];

//   constructor(
//     public dialogRef: MatDialogRef<VersionHistoryDialogComponent>,
//     @Inject(MAT_DIALOG_DATA) public data: VersionHistoryDialogData,
//     private diagramService: DiagramAssignmentService
//   ) {}

//   ngOnInit(): void {
//     this.loadVersionHistory();
//   }

//   loadVersionHistory(): void {
//     if (!this.data.diagram.id) return;

//     this.isLoading = true;
//     this.diagramService.getDiagramVersions(this.data.diagram.id)
//       .subscribe({
//         next: (versions) => {
//           this.versions = versions;
//           this.isLoading = false;
//         },
//         error: (error) => {
//           console.error('Error loading versions:', error);
//           this.isLoading = false;
//         }
//       });
//   }

//   createNewVersion(): void {
//     if (!this.data.diagram.id) return;

//     this.isCreatingVersion = true;
//     this.diagramService.createVersion(this.data.diagram.id, this.newVersionNotes || undefined)
//       .subscribe({
//         next: (version:DiagramVersion) => {
//           this.versions.unshift(version); // Add to beginning of list
//           this.newVersionNotes = '';
//           this.isCreatingVersion = false;
          
//           const result: VersionHistoryResult = {
//             action: 'create',
//             versionNumber: version.versionNumber,
//             versionNotes: version.versionNotes
//           };
//           this.dialogRef.close(result);
//         },
//         error: (error:any) => {
//           console.error('Error creating version:', error);
//           this.isCreatingVersion = false;
//         }
//       });
//   }

//   restoreVersion(version: DiagramVersion): void {
//     const confirm = window.confirm(
//       `Restore to version ${version.versionNumber}? This will replace the current diagram content.`
//     );
    
//     if (!confirm) return;

//     this.isRestoring = true;
//     this.diagramService.restoreVersion(this.data.diagram.id!, version.versionNumber)
//       .subscribe({
//         next: (restoredDiagram) => {
//           this.isRestoring = false;
          
//           const result: VersionHistoryResult = {
//             action: 'restore',
//             versionNumber: version.versionNumber
//           };
//           this.dialogRef.close(result);
//         },
//         error: (error) => {
//           console.error('Error restoring version:', error);
//           this.isRestoring = false;
//         }
//       });
//   }

//   compareWithCurrent(version: DiagramVersion): void {
//     // Implement version comparison - could open another dialog
//     console.log('Compare version', version.versionNumber, 'with current');
//     // For now, just show an alert
//     alert(`Version comparison feature coming soon!\nWould compare version ${version.versionNumber} with current version.`);
//   }

//   onCancel(): void {
//     this.dialogRef.close({ action: 'close' });
//   }

//   hasMetadata(): boolean {
//     const metadata = this.data.diagram.metadata;
//     return !!(metadata && (
//       Object.keys(metadata.elementColors || {}).length > 0 ||
//       Object.keys(metadata.customProperties || {}).length > 0
//     ));
//   }

//   formatDate(date: Date | string | undefined): string {
//     if (!date) return 'Unknown';
//     const d = new Date(date);
//     return d.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     });
//   }

//   formatTime(date: Date | string | undefined): string {
//     if (!date) return '';
//     const d = new Date(date);
//     return d.toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   }

//   truncateText(text: string, maxLength: number): string {
//     if (!text) return '';
//     return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
//   }
// }