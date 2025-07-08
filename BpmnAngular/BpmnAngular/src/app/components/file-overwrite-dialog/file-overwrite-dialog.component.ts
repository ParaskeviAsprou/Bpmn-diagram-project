// src/app/components/file-overwrite-dialog/file-overwrite-dialog.component.ts - NEW FILE
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

export interface FileOverwriteData {
  fileName: string;
  folderPath: string;
}

export interface FileOverwriteResult {
  action: 'overwrite' | 'rename' | 'cancel';
  newName?: string;
}

@Component({
  selector: 'app-file-overwrite-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule
  ],
  template: `
    <h2 mat-dialog-title>File Already Exists</h2>
    <mat-dialog-content>
      <p>The file "<strong>{{ data.fileName }}</strong>" already exists in:</p>
      <p class="folder-path">{{ data.folderPath }}</p>
      <p>What would you like to do?</p>
      
      <mat-radio-group [(ngModel)]="selectedAction" class="action-group">
        <mat-radio-button value="overwrite">Overwrite existing file</mat-radio-button>
        <mat-radio-button value="rename">Save with different name</mat-radio-button>
        <mat-radio-button value="cancel">Cancel</mat-radio-button>
      </mat-radio-group>
      
      <mat-form-field *ngIf="selectedAction === 'rename'" appearance="outline" class="full-width">
        <mat-label>New filename</mat-label>
        <input matInput [(ngModel)]="newFileName" placeholder="Enter new filename" 
               (keyup.enter)="onConfirm()">
        <mat-hint>Include file extension (.bpmn, .xml)</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onConfirm()" 
              [disabled]="selectedAction === 'rename' && !isValidFileName()">
        {{ getButtonText() }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .action-group { 
      display: flex; 
      flex-direction: column; 
      gap: 12px; 
      margin: 20px 0; 
    }
    .full-width { 
      width: 100%; 
      margin-top: 16px; 
    }
    .folder-path {
      background: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      color: #666;
      border-left: 4px solid #2196f3;
    }
    mat-dialog-content {
      min-width: 400px;
    }
  `]
})
export class FileOverwriteDialogComponent {
  selectedAction: 'overwrite' | 'rename' | 'cancel' = 'overwrite';
  newFileName: string = '';

  constructor(
    public dialogRef: MatDialogRef<FileOverwriteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FileOverwriteData
  ) {
    this.newFileName = this.generateNewFileName(data.fileName);
  }

  private generateNewFileName(originalName: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const nameWithoutExt = originalName.replace(/\.(bpmn|xml)$/, '');
    const extension = originalName.match(/\.(bpmn|xml)$/)?.[0] || '.bpmn';
    return `${nameWithoutExt}_${timestamp}${extension}`;
  }

  isValidFileName(): boolean {
    return this.newFileName.trim().length > 0 && 
           this.newFileName !== this.data.fileName &&
           /\.(bpmn|xml)$/.test(this.newFileName);
  }

  getButtonText(): string {
    switch (this.selectedAction) {
      case 'overwrite': return 'Overwrite';
      case 'rename': return 'Save with New Name';
      case 'cancel': return 'Cancel';
      default: return 'OK';
    }
  }

  onConfirm(): void {
    if (this.selectedAction === 'rename' && !this.isValidFileName()) {
      return;
    }

    const result: FileOverwriteResult = {
      action: this.selectedAction,
      newName: this.selectedAction === 'rename' ? this.newFileName : undefined
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}