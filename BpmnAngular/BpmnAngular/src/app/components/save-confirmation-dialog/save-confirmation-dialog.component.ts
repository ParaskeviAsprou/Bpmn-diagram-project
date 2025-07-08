// save-confirmation-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface SaveConfirmationData {
  fileName: string;
  isNewFile: boolean;
  hasChanges: boolean;
  changeCount?: number;
  lastSaveTime?: Date;
  fileExists?: boolean;
  folderName?: string;
}

export interface SaveConfirmationResult {
  action: 'save' | 'saveAs' | 'cancel';
  fileName?: string;
  overwrite?: boolean;
  createBackup?: boolean;
}

@Component({
  selector: 'app-save-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatCardModule,
    MatTooltipModule
  ],
  template: `
    <div class="save-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="header-content">
          <mat-icon class="header-icon" [ngClass]="getHeaderIconClass()">{{ getHeaderIcon() }}</mat-icon>
          <div class="header-text">
            <h2>{{ getDialogTitle() }}</h2>
            <p class="file-info">
              <span class="file-name">{{ data.fileName }}</span>
              <span *ngIf="data.folderName" class="folder-info">in {{ data.folderName }}</span>
            </p>
          </div>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        
        <!-- Changes Summary -->
        <mat-card *ngIf="data.hasChanges" class="changes-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">edit</mat-icon>
            <mat-card-title>Unsaved Changes</mat-card-title>
            <mat-card-subtitle>Your diagram has been modified</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="changes-info">
              <div class="change-item" *ngIf="data.changeCount">
                <mat-icon>timeline</mat-icon>
                <span>{{ data.changeCount }} change(s) made</span>
              </div>
              <div class="change-item" *ngIf="data.lastSaveTime">
                <mat-icon>schedule</mat-icon>
                <span>Last saved: {{ formatTime(data.lastSaveTime) }}</span>
              </div>
              <div class="change-item" *ngIf="!data.lastSaveTime">
                <mat-icon>new_releases</mat-icon>
                <span>This is a new diagram</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- File Exists Warning -->
        <mat-card *ngIf="data.fileExists && !data.isNewFile" class="warning-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">warning</mat-icon>
            <mat-card-title>File Already Exists</mat-card-title>
            <mat-card-subtitle>This will overwrite the existing file</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="warning-content">
              <p>A file with this name already exists. Choose how to proceed:</p>
              <div class="backup-option">
                <mat-checkbox [(ngModel)]="createBackup">
                  <span class="checkbox-label">
                    <mat-icon>backup</mat-icon>
                    Create backup of existing file
                  </span>
                </mat-checkbox>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Save Options -->
        <div class="save-options">
          <h3>Save Options</h3>
          
          <!-- Quick Save -->
          <div class="option-card primary-option" (click)="quickSave()">
            <div class="option-header">
              <mat-icon color="primary">save</mat-icon>
              <div class="option-content">
                <h4>{{ data.isNewFile ? 'Save' : 'Save Changes' }}</h4>
                <p>{{ data.isNewFile ? 'Save this diagram with the current name' : 'Update the existing file with your changes' }}</p>
              </div>
            </div>
            <mat-icon class="chevron">chevron_right</mat-icon>
          </div>

          <!-- Save As -->
          <div class="option-card" (click)="saveAs()">
            <div class="option-header">
              <mat-icon color="accent">save_as</mat-icon>
              <div class="option-content">
                <h4>Save As</h4>
                <p>Save with a different name or location</p>
              </div>
            </div>
            <mat-icon class="chevron">chevron_right</mat-icon>
          </div>

          <!-- Save As Form -->
          <div *ngIf="showSaveAsForm" class="save-as-form">
            <mat-form-field appearance="outline" class="filename-field">
              <mat-label>File Name</mat-label>
              <input matInput 
                [(ngModel)]="newFileName" 
                placeholder="Enter new file name"
                (keydown.enter)="confirmSaveAs()"
                #fileNameInput>
              <mat-hint>Include .bpmn extension or it will be added automatically</mat-hint>
            </mat-form-field>
            
            <div class="save-as-actions">
              <button mat-raised-button color="primary" (click)="confirmSaveAs()" [disabled]="!isValidFileName()">
                <mat-icon>save_as</mat-icon>
                Save As
              </button>
              <button mat-stroked-button (click)="cancelSaveAs()">
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Tips Section -->
        <div class="tips-section">
          <mat-icon class="tips-icon">lightbulb</mat-icon>
          <div class="tips-content">
            <h4>Tips</h4>
            <ul>
              <li>Use <kbd>Ctrl+S</kbd> for quick save</li>
              <li *ngIf="data.hasChanges">Your changes include element modifications and custom properties</li>
              <li>BPMN files are saved in XML format</li>
            </ul>
          </div>
        </div>

      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        
        <div class="primary-actions">
          <button mat-stroked-button (click)="saveAs()" class="save-as-btn">
            <mat-icon>save_as</mat-icon>
            Save As
          </button>
          
          <button mat-raised-button color="primary" (click)="quickSave()" class="save-btn">
            <mat-icon>save</mat-icon>
            {{ data.isNewFile ? 'Save' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .save-dialog {
      min-width: 600px;
      max-width: 800px;
    }

    .dialog-header {
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;
      padding-bottom: 16px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 36px;
    }

    .header-icon.save { color: #4caf50; }
    .header-icon.new { color: #2196f3; }
    .header-icon.warning { color: #ff9800; }

    .header-text h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .file-info {
      margin: 8px 0 0 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .file-name {
      font-family: monospace;
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    .folder-info {
      color: #666;
      font-size: 14px;
    }

    .dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .changes-card, .warning-card {
      margin-bottom: 24px;
    }

    .changes-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .change-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .change-item mat-icon {
      font-size: 16px;
      color: #666;
    }

    .warning-content p {
      margin: 0 0 16px 0;
    }

    .backup-option {
      display: flex;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .save-options h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .option-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .option-card:hover {
      border-color: #1976d2;
      background: #f8f9fa;
    }

    .option-card.primary-option {
      border-color: #4caf50;
      background: #f1f8e9;
    }

    .option-card.primary-option:hover {
      border-color: #388e3c;
      background: #e8f5e8;
    }

    .option-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .option-content h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .option-content p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .chevron {
      color: #999;
    }

    .save-as-form {
      background: #f8f9fa;
      border: 2px solid #1976d2;
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
    }

    .filename-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .save-as-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .tips-section {
      display: flex;
      gap: 16px;
      margin-top: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .tips-icon {
      color: #2196f3;
      font-size: 24px;
      margin-top: 2px;
    }

    .tips-content h4 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .tips-content ul {
      margin: 0;
      padding-left: 20px;
    }

    .tips-content li {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }

    kbd {
      background: #f1f1f1;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 12px;
      font-family: monospace;
    }

    .dialog-actions {
      border-top: 1px solid #e0e0e0;
      margin-top: 0;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
    }

    .primary-actions {
      display: flex;
      gap: 12px;
    }

    .save-btn, .save-as-btn {
      min-width: 120px;
    }

    @media (max-width: 768px) {
      .save-dialog {
        min-width: 95vw;
        max-width: 95vw;
      }

      .header-content {
        gap: 12px;
      }

      .header-icon {
        font-size: 28px;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 12px;
      }

      .primary-actions {
        order: -1;
      }

      .cancel-btn {
        width: 100%;
      }

      .save-btn, .save-as-btn {
        flex: 1;
      }
    }
  `]
})
export class SaveConfirmationDialogComponent {
  newFileName = '';
  showSaveAsForm = false;
  createBackup = false;

  constructor(
    public dialogRef: MatDialogRef<SaveConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveConfirmationData
  ) {
    this.newFileName = data.fileName || 'new_diagram.bpmn';
  }

  getDialogTitle(): string {
    if (this.data.isNewFile) {
      return 'Save New Diagram';
    }
    return this.data.hasChanges ? 'Save Changes' : 'Save Diagram';
  }

  getHeaderIcon(): string {
    if (this.data.isNewFile) return 'note_add';
    if (this.data.fileExists) return 'warning';
    return 'save';
  }

  getHeaderIconClass(): string {
    if (this.data.isNewFile) return 'new';
    if (this.data.fileExists) return 'warning';
    return 'save';
  }

  quickSave(): void {
    const result: SaveConfirmationResult = {
      action: 'save',
      fileName: this.data.fileName,
      overwrite: true,
      createBackup: this.createBackup
    };
    this.dialogRef.close(result);
  }

  saveAs(): void {
    if (this.showSaveAsForm) {
      this.confirmSaveAs();
    } else {
      this.showSaveAsForm = true;
      setTimeout(() => {
        const input = document.querySelector('.filename-field input') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }
  }

  confirmSaveAs(): void {
    if (this.isValidFileName()) {
      let fileName = this.newFileName.trim();
      if (!fileName.endsWith('.bpmn') && !fileName.endsWith('.xml')) {
        fileName += '.bpmn';
      }

      const result: SaveConfirmationResult = {
        action: 'saveAs',
        fileName: fileName,
        overwrite: false,
        createBackup: false
      };
      this.dialogRef.close(result);
    }
  }

  cancelSaveAs(): void {
    this.showSaveAsForm = false;
    this.newFileName = this.data.fileName || 'new_diagram.bpmn';
  }

  isValidFileName(): boolean {
    const fileName = this.newFileName.trim();
    return fileName.length > 0 && 
           fileName !== this.data.fileName &&
           /^[^<>:"/\\|?*]+$/.test(fileName);
  }

  formatTime(date: Date): string {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
      .format(Math.round((date.getTime() - Date.now()) / (1000 * 60)), 'minute');
  }

  onCancel(): void {
    const result: SaveConfirmationResult = {
      action: 'cancel'
    };
    this.dialogRef.close(result);
  }
}