// // enhanced-file-conflict.service.ts
// import { Injectable } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';
// import { Observable, of } from 'rxjs';
// import { switchMap } from 'rxjs/operators';


// export interface ConflictResolutionResult {
//   action: 'proceed' | 'cancel';
//   newFileName?: string;
//   createVersion?: boolean;
//   versionNotes?: string;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class FileConflictService {

//   constructor(
//     private dialog: MatDialog,
//     private diagramService: DiagramService
//   ) {}

//   /**
//    * Handle file conflicts when saving diagrams
//    */
//   handleFileConflict(
//     existingDiagram: DiagramFile,
//     newContent: string,
//     proposedFileName: string
//   ): Observable<ConflictResolutionResult> {
    
//     const hasContentChanges = this.hasSignificantChanges(existingDiagram, newContent);
    
//     if (!hasContentChanges) {
//       // No significant changes, just update metadata
//       return of({
//         action: 'proceed',
//         createVersion: false
//       });
//     }

//     // Show enhanced conflict dialog
//     const dialogData: ConflictDialogData = {
//       fileName: proposedFileName,
//       existingDiagram: existingDiagram,
//       hasContentChanges: hasContentChanges,
//       changesSummary: this.generateChangesSummary(existingDiagram, newContent)
//     };

//     const dialogRef = this.dialog.open(ConflictDialogComponent, {
//       width: '700px',
//       maxWidth: '90vw',
//       maxHeight: '80vh',
//       data: dialogData,
//       disableClose: true
//     });

//     return dialogRef.afterClosed().pipe(
//       switchMap((result: EnhancedConflictResult | undefined) => {
//         if (!result || result.action === 'cancel') {
//           return of({ action: 'cancel' as const });
//         }

//         return of({
//           action: 'proceed' as const,
//           newFileName: result.newFileName,
//           createVersion: result.createVersion,
//           versionNotes: result.versionNotes
//         });
//       })
//     );
//   }

//   /**
//    * Check if there are significant changes between versions
//    */
//   private hasSignificantChanges(existing: DiagramFile, newContent: string): boolean {
//     // Compare XML content
//     const contentChanged = existing.content !== newContent;
    
//     // You could add more sophisticated comparison here
//     // Like comparing structure, elements, etc.
    
//     return contentChanged;
//   }

//   /**
//    * Generate a summary of changes
//    */
//   private generateChangesSummary(existing: DiagramFile, newContent: string): ChangesSummary {
//     const summary: ChangesSummary = {
//       contentChanged: existing.content !== newContent,
//       elementCount: {
//         before: this.countElements(existing.content),
//         after: this.countElements(newContent)
//       },
//       hasMetadataChanges: false, // Will be set by caller if needed
//       changes: []
//     };

//     // Generate change descriptions
//     if (summary.contentChanged) {
//       const elementDiff = summary.elementCount.after - summary.elementCount.before;
//       if (elementDiff > 0) {
//         summary.changes.push(`Added ${elementDiff} element(s)`);
//       } else if (elementDiff < 0) {
//         summary.changes.push(`Removed ${Math.abs(elementDiff)} element(s)`);
//       } else {
//         summary.changes.push('Modified existing elements');
//       }
//     }

//     return summary;
//   }

//   /**
//    * Count BPMN elements in content
//    */
//   private countElements(content: string): number {
//     if (!content) return 0;
//     const matches = content.match(/<bpmn:/g);
//     return matches ? matches.length : 0;
//   }
// }

// // Enhanced dialog interfaces
// export interface ConflictDialogData {
//   fileName: string;
//   existingDiagram: DiagramFile;
//   hasContentChanges: boolean;
//   changesSummary: ChangesSummary;
// }

// export interface EnhancedConflictResult {
//   action: 'overwrite' | 'version' | 'rename' | 'cancel';
//   newFileName?: string;
//   createVersion?: boolean;
//   versionNotes?: string;
// }

// export interface ChangesSummary {
//   contentChanged: boolean;
//   elementCount: {
//     before: number;
//     after: number;
//   };
//   hasMetadataChanges: boolean;
//   changes: string[];
// }

// // Enhanced File Conflict Dialog Component
// import { Component, Inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
// import { MatButtonModule } from '@angular/material/button';
// import { MatInputModule } from '@angular/material/input';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatIconModule } from '@angular/material/icon';
// import { MatCardModule } from '@angular/material/card';
// import { MatRadioModule } from '@angular/material/radio';
// import { MatCheckboxModule } from '@angular/material/checkbox';
// import { MatChipsModule } from '@angular/material/chips';

// @Component({
//   selector: 'app-enhanced-file-conflict-dialog',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     MatDialogModule,
//     MatButtonModule,
//     MatInputModule,
//     MatFormFieldModule,
//     MatIconModule,
//     MatCardModule,
//     MatRadioModule,
//     MatCheckboxModule,
//     MatChipsModule
//   ],
//   template: `
//     <div class="enhanced-conflict-dialog">
//       <div mat-dialog-title class="dialog-header">
//         <div class="header-content">
//           <mat-icon class="header-icon" [ngClass]="getHeaderIconClass()">{{ getHeaderIcon() }}</mat-icon>
//           <div class="header-text">
//             <h2>{{ getDialogTitle() }}</h2>
//             <p class="conflict-file">{{ data.fileName }}</p>
//           </div>
//         </div>
//       </div>

//       <div mat-dialog-content class="dialog-content">
//         <!-- Changes Summary -->
//         <mat-card class="changes-summary" *ngIf="data.hasContentChanges">
//           <mat-card-header>
//             <mat-icon mat-card-avatar color="warn">timeline</mat-icon>
//             <mat-card-title>Detected Changes</mat-card-title>
//             <mat-card-subtitle>Summary of modifications</mat-card-subtitle>
//           </mat-card-header>
//           <mat-card-content>
//             <div class="changes-list">
//               <mat-chip-set>
//                 <mat-chip *ngFor="let change of data.changesSummary.changes" color="accent">
//                   {{ change }}
//                 </mat-chip>
//               </mat-chip-set>
//             </div>
//             <div class="element-count-comparison">
//               <div class="count-item">
//                 <span class="label">Before:</span>
//                 <span class="count">{{ data.changesSummary.elementCount.before }} elements</span>
//               </div>
//               <mat-icon class="arrow">arrow_forward</mat-icon>
//               <div class="count-item">
//                 <span class="label">After:</span>
//                 <span class="count">{{ data.changesSummary.elementCount.after }} elements</span>
//               </div>
//             </div>
//           </mat-card-content>
//         </mat-card>

//         <!-- Existing Diagram Info -->
//         <mat-card class="existing-diagram-info">
//           <mat-card-header>
//             <mat-icon mat-card-avatar color="primary">description</mat-icon>
//             <mat-card-title>Current Diagram</mat-card-title>
//             <mat-card-subtitle>Already exists in your workspace</mat-card-subtitle>
//           </mat-card-header>
//           <mat-card-content>
//             <div class="diagram-details">
//               <div class="detail-row">
//                 <mat-icon>schedule</mat-icon>
//                 <span>Last Modified: {{ formatDate(data.existingDiagram.updatedAt) }}</span>
//               </div>
//               <div class="detail-row">
//                 <mat-icon>person</mat-icon>
//                 <span>Modified By: {{ data.existingDiagram.updatedBy || data.existingDiagram.createdBy }}</span>
//               </div>
//               <div class="detail-row" *ngIf="data.existingDiagram.versionCount">
//                 <mat-icon>bookmark</mat-icon>
//                 <span>Versions: {{ data.existingDiagram.versionCount }}</span>
//               </div>
//               <div class="detail-row" *ngIf="hasEnhancements()">
//                 <mat-icon>extension</mat-icon>
//                 <span>Enhanced with metadata (colors, properties)</span>
//               </div>
//             </div>
//           </mat-card-content>
//         </mat-card>

//         <!-- Resolution Options -->
//         <div class="resolution-options">
//           <h4>How would you like to proceed?</h4>

//           <mat-radio-group [(ngModel)]="selectedAction" class="action-options">
            
//             <!-- Create Version Option -->
//             <div class="action-option recommended" *ngIf="data.hasContentChanges">
//               <mat-radio-button value="version" class="action-radio">
//                 <div class="action-content">
//                   <div class="action-header">
//                     <mat-icon color="primary">bookmark_add</mat-icon>
//                     <strong>Create New Version</strong>
//                     <span class="recommended-badge">Recommended</span>
//                   </div>
//                   <p class="action-description">
//                     Save current version and create a new version with your changes. 
//                     This preserves history and allows easy rollback.
//                   </p>
                  
//                   <mat-form-field appearance="outline" class="version-notes-field" *ngIf="selectedAction === 'version'">
//                     <mat-label>Version Notes (Optional)</mat-label>
//                     <textarea 
//                       matInput 
//                       [(ngModel)]="versionNotes" 
//                       [ngModelOptions]="{standalone: true}"
//                       placeholder="Describe what changed in this version..."
//                       rows="2"></textarea>
//                   </mat-form-field>
//                 </div>
//               </mat-radio-button>
//             </div>

//             <!-- Overwrite Option -->
//             <div class="action-option warning">
//               <mat-radio-button value="overwrite" class="action-radio">
//                 <div class="action-content">
//                   <div class="action-header">
//                     <mat-icon color="warn">sync</mat-icon>
//                     <strong>Replace Current Diagram</strong>
//                     <span class="warning-badge">Destructive</span>
//                   </div>
//                   <p class="action-description">
//                     Replace the existing diagram with your changes. 
//                     <span class="warning-text">Previous content will be lost unless you have versions!</span>
//                   </p>
//                 </div>
//               </mat-radio-button>
//             </div>

//             <!-- Rename Option -->
//             <div class="action-option">
//               <mat-radio-button value="rename" class="action-radio">
//                 <div class="action-content">
//                   <div class="action-header">
//                     <mat-icon color="accent">drive_file_rename_outline</mat-icon>
//                     <strong>Save with Different Name</strong>
//                   </div>
//                   <p class="action-description">
//                     Keep both diagrams by giving this one a different name.
//                   </p>
                  
//                   <mat-form-field appearance="outline" class="rename-field" *ngIf="selectedAction === 'rename'">
//                     <mat-label>New file name</mat-label>
//                     <input 
//                       matInput 
//                       [(ngModel)]="newFileName" 
//                       [ngModelOptions]="{standalone: true}"
//                       placeholder="Enter new file name">
//                   </mat-form-field>
//                 </div>
//               </mat-radio-button>
//             </div>

//           </mat-radio-group>
//         </div>
//       </div>

//       <div mat-dialog-actions class="dialog-actions">
//         <button mat-button (click)="onCancel()" class="cancel-btn">
//           <mat-icon>close</mat-icon>
//           Cancel
//         </button>
        
//         <button 
//           mat-raised-button 
//           color="primary" 
//           (click)="onProceed()"
//           [disabled]="!canProceed()"
//           class="proceed-btn">
//           <mat-icon>{{ getActionIcon() }}</mat-icon>
//           {{ getActionText() }}
//         </button>
//       </div>
//     </div>
//   `,
//   styles: [`
//     .enhanced-conflict-dialog {
//       min-width: 600px;
//       max-width: 800px;
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
//     }

//     .header-icon.changes { color: #ff9800; }
//     .header-icon.conflict { color: #f44336; }

//     .header-text h2 {
//       margin: 0;
//       font-size: 20px;
//       font-weight: 500;
//     }

//     .conflict-file {
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
//       max-height: 70vh;
//       overflow-y: auto;
//     }

//     .changes-summary, .existing-diagram-info {
//       margin-bottom: 24px;
//     }

//     .changes-list {
//       margin-bottom: 16px;
//     }

//     .element-count-comparison {
//       display: flex;
//       align-items: center;
//       gap: 12px;
//       font-size: 14px;
//     }

//     .count-item {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//     }

//     .label {
//       font-size: 12px;
//       color: #666;
//       text-transform: uppercase;
//     }

//     .count {
//       font-weight: 500;
//       color: #333;
//     }

//     .arrow {
//       color: #666;
//     }

//     .diagram-details {
//       display: flex;
//       flex-direction: column;
//       gap: 8px;
//     }

//     .detail-row {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       font-size: 14px;
//     }

//     .detail-row mat-icon {
//       font-size: 16px;
//       color: #666;
//     }

//     .resolution-options h4 {
//       margin: 0 0 16px 0;
//       color: #333;
//     }

//     .action-options {
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     .action-option {
//       border: 2px solid #e0e0e0;
//       border-radius: 8px;
//       padding: 16px;
//       transition: all 0.3s ease;
//     }

//     .action-option:has(.action-radio.mat-radio-checked) {
//       border-color: #1976d2;
//       background: #f3f8ff;
//     }

//     .action-option.recommended:has(.action-radio.mat-radio-checked) {
//       border-color: #4caf50;
//       background: #f1f8e9;
//     }

//     .action-option.warning:has(.action-radio.mat-radio-checked) {
//       border-color: #ff9800;
//       background: #fff8e1;
//     }

//     .action-radio {
//       width: 100%;
//     }

//     .action-content {
//       margin-left: 32px;
//     }

//     .action-header {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       margin-bottom: 8px;
//     }

//     .recommended-badge {
//       background: #4caf50;
//       color: white;
//       padding: 2px 8px;
//       border-radius: 12px;
//       font-size: 11px;
//       font-weight: 500;
//     }

//     .warning-badge {
//       background: #ff9800;
//       color: white;
//       padding: 2px 8px;
//       border-radius: 12px;
//       font-size: 11px;
//       font-weight: 500;
//     }

//     .action-description {
//       margin: 0;
//       color: #666;
//       font-size: 14px;
//       line-height: 1.4;
//     }

//     .warning-text {
//       color: #f44336;
//       font-weight: 500;
//     }

//     .version-notes-field, .rename-field {
//       width: 100%;
//       margin-top: 12px;
//     }

//     .dialog-actions {
//       border-top: 1px solid #e0e0e0;
//       margin-top: 0;
//       padding: 16px 24px;
//       display: flex;
//       justify-content: space-between;
//       gap: 12px;
//     }

//     @media (max-width: 768px) {
//       .enhanced-conflict-dialog {
//         min-width: 90vw;
//       }

//       .dialog-actions {
//         flex-direction: column;
//       }

//       .dialog-actions button {
//         width: 100%;
//       }
//     }
//   `]
// })
// export class ConflictDialogComponent {
//   selectedAction: string = 'version';
//   newFileName: string = '';
//   versionNotes: string = '';

//   constructor(
//     public dialogRef: MatDialogRef<ConflictDialogComponent>,
//     @Inject(MAT_DIALOG_DATA) public data: ConflictDialogData
//   ) {
//     // Initialize with suggested new name
//     this.newFileName = this.generateNewFileName(data.fileName);
    
//     // Set default action based on whether there are changes
//     this.selectedAction = data.hasContentChanges ? 'version' : 'overwrite';
//   }

//   onProceed(): void {
//     if (!this.selectedAction) return;

//     let result: EnhancedConflictResult = { 
//       action: this.selectedAction as any,
//       createVersion: this.selectedAction === 'version'
//     };

//     if (this.selectedAction === 'rename' && this.newFileName) {
//       result.newFileName = this.newFileName.trim();
//     }

//     if (this.selectedAction === 'version' && this.versionNotes) {
//       result.versionNotes = this.versionNotes.trim();
//     }

//     this.dialogRef.close(result);
//   }

//   onCancel(): void {
//     this.dialogRef.close({ action: 'cancel' });
//   }

//   canProceed(): boolean {
//     if (!this.selectedAction) return false;
    
//     if (this.selectedAction === 'rename') {
//       return this.isValidNewName();
//     }
    
//     return true;
//   }

//   isValidNewName(): boolean {
//     const valid = !!this.newFileName && 
//            this.newFileName.trim().length > 0 && 
//            this.newFileName.trim() !== this.data.fileName;
//     return Boolean(valid);
//   }

//   getDialogTitle(): string {
//     return this.data.hasContentChanges ? 'Diagram Has Changed' : 'Save Diagram';
//   }

//   getHeaderIcon(): string {
//     return this.data.hasContentChanges ? 'timeline' : 'save';
//   }

//   getHeaderIconClass(): string {
//     return this.data.hasContentChanges ? 'changes' : 'conflict';
//   }

//   getActionIcon(): string {
//     switch (this.selectedAction) {
//       case 'overwrite': return 'sync';
//       case 'version': return 'bookmark_add';
//       case 'rename': return 'drive_file_rename_outline';
//       default: return 'save';
//     }
//   }

//   getActionText(): string {
//     switch (this.selectedAction) {
//       case 'overwrite': return 'Replace Diagram';
//       case 'version': return 'Create Version';
//       case 'rename': return 'Save with New Name';
//       default: return 'Proceed';
//     }
//   }

//   hasEnhancements(): boolean {
//     const metadata = this.data.existingDiagram.metadata;
//     return !!(metadata && (
//       Object.keys(metadata.elementColors || {}).length > 0 ||
//       Object.keys(metadata.customProperties || {}).length > 0
//     ));
//   }

//   formatDate(dateInput: string | Date | undefined): string {
//     if (!dateInput) return 'Unknown';
//     const date = new Date(dateInput);
//     return date.toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   }

//   private generateNewFileName(originalName: string): string {
//     const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
//     const lastDotIndex = originalName.lastIndexOf('.');
    
//     if (lastDotIndex > 0) {
//       const name = originalName.substring(0, lastDotIndex);
//       const extension = originalName.substring(lastDotIndex);
//       return `${name}_${timestamp}${extension}`;
//     } else {
//       return `${originalName}_${timestamp}`;
//     }
//   }
// }