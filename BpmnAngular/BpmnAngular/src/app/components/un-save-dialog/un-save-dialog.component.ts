// unsaved-changes-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

export interface UnsavedChangesDialogData {
  fileName?: string;
  changeCount?: number;
  lastSaveTime?: Date;
  actionType: 'navigate' | 'close' | 'new' | 'open';
  actionDescription?: string;
}

export interface UnsavedChangesDialogResult {
  action: 'save' | 'discard' | 'cancel';
}

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="unsaved-changes-dialog">
      <div class="dialog-header">
        <div class="header-content">
          <mat-icon class="warning-icon">warning</mat-icon>
          <div class="header-text">
            <h2>Unsaved Changes Detected</h2>
            <p class="subtitle">{{ getActionMessage() }}</p>
          </div>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        <!-- File Info Card -->
        <mat-card class="file-info-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="file-icon">description</mat-icon>
            <mat-card-title>{{ data.fileName || 'Untitled Diagram' }}</mat-card-title>
            <mat-card-subtitle>{{ getFileStatus() }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="changes-summary">
              <div class="change-item" *ngIf="data.changeCount">
                <mat-icon class="change-icon">edit</mat-icon>
                <span>{{ data.changeCount }} unsaved changes</span>
              </div>
              <div class="change-item" *ngIf="data.lastSaveTime">
                <mat-icon class="time-icon">schedule</mat-icon>
                <span>Last saved: {{ formatTime(data.lastSaveTime) }}</span>
              </div>
              <div class="change-item" *ngIf="!data.lastSaveTime">
                <mat-icon class="time-icon">new_releases</mat-icon>
                <span>Never saved</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Warning Message -->
        <div class="warning-message">
          <mat-icon class="warning-icon-large">info</mat-icon>
          <div class="warning-text">
            <h3>What would you like to do?</h3>
            <p>Your changes will be permanently lost if you {{ getActionVerb() }} without saving.</p>
          </div>
        </div>

        <!-- Action Options -->
        <div class="action-options">
          <div class="option-card save-option" (click)="onSave()">
            <mat-icon class="option-icon save-icon">save</mat-icon>
            <div class="option-content">
              <h4>Save Changes</h4>
              <p>Save your work before {{ getActionVerb() }}</p>
            </div>
            <mat-icon class="arrow-icon">arrow_forward</mat-icon>
          </div>

          <div class="option-card discard-option" (click)="onDiscard()">
            <mat-icon class="option-icon discard-icon">delete_forever</mat-icon>
            <div class="option-content">
              <h4>Discard Changes</h4>
              <p>Permanently lose all unsaved changes</p>
            </div>
            <mat-icon class="arrow-icon">arrow_forward</mat-icon>
          </div>

          <div class="option-card cancel-option" (click)="onCancel()">
            <mat-icon class="option-icon cancel-icon">close</mat-icon>
            <div class="option-content">
              <h4>Cancel</h4>
              <p>Continue working on your diagram</p>
            </div>
            <mat-icon class="arrow-icon">arrow_forward</mat-icon>
          </div>
        </div>
      </div>

      <!-- Keyboard Shortcuts -->
      <div class="keyboard-shortcuts">
        <div class="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>S</kbd> <span>Save</span>
        </div>
        <div class="shortcut-item">
          <kbd>Esc</kbd> <span>Cancel</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unsaved-changes-dialog {
      min-width: 500px;
      max-width: 600px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      padding: 24px 24px 16px 24px;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: white;
      border-radius: 8px 8px 0 0;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
    }

    .warning-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .header-text h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .subtitle {
      margin: 4px 0 0 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .dialog-content {
      padding: 24px;
      background: #f8fafb;
    }

    .file-info-card {
      margin-bottom: 24px;
      border-left: 4px solid #ff9800;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .file-icon {
      background: #ff9800;
      color: white;
    }

    .changes-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .change-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: #666;
    }

    .change-icon, .time-icon {
      font-size: 16px;
      color: #ff9800;
    }

    .warning-message {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .warning-icon-large {
      font-size: 24px;
      color: #ff9800;
      margin-top: 4px;
    }

    .warning-text h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 1.1rem;
    }

    .warning-text p {
      margin: 0;
      color: #666;
      line-height: 1.4;
    }

    .action-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .option-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .option-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .save-option:hover {
      border-color: #4caf50;
      background: #f1f8e9;
    }

    .discard-option:hover {
      border-color: #f44336;
      background: #ffebee;
    }

    .cancel-option:hover {
      border-color: #2196f3;
      background: #e3f2fd;
    }

    .option-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .save-icon { color: #4caf50; }
    .discard-icon { color: #f44336; }
    .cancel-icon { color: #2196f3; }

    .option-content {
      flex: 1;
    }

    .option-content h4 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #333;
    }

    .option-content p {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
      line-height: 1.3;
    }

    .arrow-icon {
      font-size: 20px;
      color: #ccc;
      transition: all 0.3s ease;
    }

    .option-card:hover .arrow-icon {
      color: #666;
      transform: translateX(4px);
    }

    .keyboard-shortcuts {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding: 16px;
      background: #f0f0f0;
      border-top: 1px solid #e0e0e0;
      margin: 0 -24px -24px -24px;
      border-radius: 0 0 8px 8px;
    }

    .shortcut-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #666;
    }

    kbd {
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 3px;
      padding: 2px 6px;
      font-size: 0.75rem;
      font-family: monospace;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    @media (max-width: 600px) {
      .unsaved-changes-dialog {
        min-width: 95vw;
      }

      .action-options {
        gap: 8px;
      }

      .option-card {
        padding: 12px;
      }

      .keyboard-shortcuts {
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }
    }
  `]
})
export class UnsavedChangesDialogComponent {

  constructor(
    private dialogRef: MatDialogRef<UnsavedChangesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UnsavedChangesDialogData
  ) {}

  getActionMessage(): string {
    switch (this.data.actionType) {
      case 'navigate':
        return 'You are about to leave this page';
      case 'close':
        return 'You are about to close the application';
      case 'new':
        return 'You are about to create a new diagram';
      case 'open':
        return 'You are about to open another diagram';
      default:
        return 'You are about to perform an action';
    }
  }

  getFileStatus(): string {
    if (!this.data.lastSaveTime) {
      return 'New file - never saved';
    }
    return `Modified since last save`;
  }

  getActionVerb(): string {
    switch (this.data.actionType) {
      case 'navigate':
        return 'navigate away';
      case 'close':
        return 'close';
      case 'new':
        return 'create a new diagram';
      case 'open':
        return 'open another file';
      default:
        return 'continue';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }

  onSave(): void {
    this.dialogRef.close({ action: 'save' });
  }

  onDiscard(): void {
    this.dialogRef.close({ action: 'discard' });
  }

  onCancel(): void {
    this.dialogRef.close({ action: 'cancel' });
  }
}