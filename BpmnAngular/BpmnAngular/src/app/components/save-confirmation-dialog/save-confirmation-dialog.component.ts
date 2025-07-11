import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';

export interface SaveConfirmationData {
  fileName: string;
  isNewFile: boolean;
  hasChanges: boolean;
  changeCount: number;
  lastSaveTime?: Date;
  fileExists: boolean;
  folderName: string;
}

export interface SaveConfirmationResult {
  action: 'save' | 'saveAs' | 'cancel';
  fileName?: string;
  overwrite?: boolean;
}

@Component({
  selector: 'app-save-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule
  ],
  template: `
    <div class="save-dialog">
      <h2 mat-dialog-title>
        <mat-icon>save</mat-icon>
        {{ data.isNewFile ? 'Save New Diagram' : 'Save Changes' }}
      </h2>

      <mat-dialog-content>
        <div class="dialog-content">
          
          <!-- File Information -->
          <div class="file-info">
            <div class="info-row">
              <mat-icon>description</mat-icon>
              <span class="label">File:</span>
              <span class="value">{{ data.fileName }}</span>
            </div>
            
            <div class="info-row">
              <mat-icon>folder</mat-icon>
              <span class="label">Location:</span>
              <span class="value">{{ data.folderName || 'Root Folder' }}</span>
            </div>
            
            <div class="info-row" *ngIf="data.hasChanges">
              <mat-icon>edit</mat-icon>
              <span class="label">Changes:</span>
              <span class="value changes">{{ data.changeCount }} unsaved changes</span>
            </div>
            
            <div class="info-row" *ngIf="data.lastSaveTime">
              <mat-icon>schedule</mat-icon>
              <span class="label">Last saved:</span>
              <span class="value">{{ formatTime(data.lastSaveTime) }}</span>
            </div>
          </div>

          <!-- File Name Input (for new files or save as) -->
          <form [formGroup]="saveForm" *ngIf="showFileNameInput">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>File Name</mat-label>
              <input matInput formControlName="fileName" 
                     placeholder="Enter file name">
              <mat-hint>File will be saved as .bpmn format</mat-hint>
              <mat-error *ngIf="saveForm.get('fileName')?.hasError('required')">
                File name is required
              </mat-error>
              <mat-error *ngIf="saveForm.get('fileName')?.hasError('pattern')">
                Invalid file name format
              </mat-error>
            </mat-form-field>

            <!-- Overwrite checkbox if file exists -->
            <div class="overwrite-section" *ngIf="data.fileExists">
              <mat-checkbox formControlName="overwrite" color="warn">
                <strong>Overwrite existing file</strong>
                <br>
                <small class="warning-text">
                  A file with this name already exists. Check this box to overwrite it.
                </small>
              </mat-checkbox>
            </div>
          </form>

          <!-- Warning Messages -->
          <div class="warnings" *ngIf="data.fileExists && !data.isNewFile">
            <div class="warning-box">
              <mat-icon>warning</mat-icon>
              <span>This will overwrite the existing file. This action cannot be undone.</span>
            </div>
          </div>

          <!-- Save Options -->
          <div class="save-options" *ngIf="!data.isNewFile">
            <h3>Save Options</h3>
            <div class="option-buttons">
              <button mat-stroked-button 
                      (click)="setSaveAsMode()"
                      class="option-button">
                <mat-icon>content_copy</mat-icon>
                <div class="option-content">
                  <strong>Save As New File</strong>
                  <small>Create a copy with a new name</small>
                </div>
              </button>
              
              <button mat-stroked-button 
                      (click)="setUpdateMode()"
                      class="option-button">
                <mat-icon>save</mat-icon>
                <div class="option-content">
                  <strong>Update Existing File</strong>
                  <small>Save changes to current file</small>
                </div>
              </button>
            </div>
          </div>

        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        
        <button mat-raised-button color="primary" 
                (click)="onSave()"
                [disabled]="!canSave()">
          <mat-icon>save</mat-icon>
          {{ getSaveButtonText() }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .save-dialog {
      min-width: 500px;
    }
    
    .dialog-content {
      padding: 16px 0;
    }
    
    .file-info {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .info-row:last-child {
      margin-bottom: 0;
    }
    
    .label {
      font-weight: 500;
      min-width: 80px;
    }
    
    .value {
      color: #666;
    }
    
    .value.changes {
      color: #f57c00;
      font-weight: 500;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .overwrite-section {
      margin: 16px 0;
      padding: 12px;
      background: #fff3e0;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
    
    .warning-text {
      color: #e65100;
    }
    
    .warnings {
      margin: 16px 0;
    }
    
    .warning-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      border-left: 4px solid #f44336;
      color: #c62828;
    }
    
    .save-options {
      margin: 24px 0;
    }
    
    .save-options h3 {
      margin: 0 0 16px 0;
      color: #333;
    }
    
    .option-buttons {
      display: flex;
      gap: 12px;
      flex-direction: column;
    }
    
    .option-button {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      text-align: left;
      justify-content: flex-start;
    }
    
    .option-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .option-content small {
      color: #666;
    }
  `]
})
export class SaveConfirmationDialogComponent {
  
  saveForm: FormGroup;
  showFileNameInput = false;
  saveAsMode = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SaveConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveConfirmationData
  ) {
    this.saveForm = this.fb.group({
      fileName: [
        this.data.fileName, 
        [Validators.required, Validators.pattern(/^[^<>:"/\\|?*]+$/)]
      ],
      overwrite: [false]
    });

    // Show file name input for new files or if file exists
    this.showFileNameInput = this.data.isNewFile || this.data.fileExists;
  }

  setSaveAsMode() {
    this.saveAsMode = true;
    this.showFileNameInput = true;
    // Clear the filename to force user to enter a new one
    this.saveForm.get('fileName')?.setValue('');
  }

  setUpdateMode() {
    this.saveAsMode = false;
    this.showFileNameInput = false;
  }

  canSave(): boolean {
    if (this.showFileNameInput) {
      const isFormValid = this.saveForm.valid;
      const hasOverwritePermission = !this.data.fileExists || this.saveForm.get('overwrite')?.value;
      return isFormValid && hasOverwritePermission;
    }
    return true;
  }

  getSaveButtonText(): string {
    if (this.data.isNewFile) {
      return 'Save New File';
    }
    if (this.saveAsMode) {
      return 'Save As New File';
    }
    return 'Save Changes';
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  onSave() {
    const result: SaveConfirmationResult = {
      action: this.saveAsMode ? 'saveAs' : 'save',
      fileName: this.showFileNameInput ? this.saveForm.get('fileName')?.value : this.data.fileName,
      overwrite: this.saveForm.get('overwrite')?.value || false
    };

    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close({ action: 'cancel' });
  }
}