// color-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ColorOption {
  name: string;
  fill: string | null;
  stroke: string | null;
  description?: string;
}

export interface ColorDialogData {
  elementId: string;
  elementType: string;
  elementName?: string;
  currentColors?: {
    fill?: string;
    stroke?: string;
  };
}

export interface ColorDialogResult {
  fill: string | null;
  stroke: string | null;
  colorName: string;
}

@Component({
  selector: 'app-color-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule
  ],
  template: `
    <div class="color-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="header-content">
          <mat-icon class="header-icon">palette</mat-icon>
          <div class="header-text">
            <h2>Set Element Color</h2>
            <p class="element-info">
              <span class="element-type">{{ data.elementType }}</span>
              <span class="element-name" *ngIf="data.elementName">{{ data.elementName }}</span>
            </p>
          </div>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        <div class="current-color-section" *ngIf="hasCurrentColors()">
          <h3>Current Colors</h3>
          <div class="current-color-preview">
            <div class="color-sample" 
                 [style.background-color]="data.currentColors?.fill || '#ffffff'"
                 [style.border-color]="data.currentColors?.stroke || '#cccccc'">
              <span class="sample-text">Element</span>
            </div>
            <div class="color-details">
              <div class="color-detail">
                <span class="label">Fill:</span>
                <span class="value">{{ data.currentColors?.fill || 'Default' }}</span>
              </div>
              <div class="color-detail">
                <span class="label">Stroke:</span>
                <span class="value">{{ data.currentColors?.stroke || 'Default' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="color-selection-section">
          <h3>Choose New Color</h3>
          <div class="color-grid">
            <div 
              *ngFor="let color of colorOptions; let i = index"
              class="color-option"
              [class.selected]="selectedColorIndex === i"
              (click)="selectColor(i)"
              [matTooltip]="color.description || color.name"
              matTooltipPosition="above">
              
              <div class="color-card">
                <div class="color-preview" 
                     [style.background-color]="color.fill"
                     [style.border-color]="color.stroke"
                     [style.border-width]="color.stroke ? '2px' : '1px'"
                     [style.border-style]="'solid'">
                  <span class="preview-text" *ngIf="!color.fill && !color.stroke">Default</span>
                </div>
                <div class="color-info">
                  <span class="color-name">{{ color.name }}</span>
                  <div class="color-values" *ngIf="color.fill || color.stroke">
                    <small class="fill-value" *ngIf="color.fill">Fill: {{ color.fill }}</small>
                    <small class="stroke-value" *ngIf="color.stroke">Border: {{ color.stroke }}</small>
                  </div>
                </div>
                
                <!-- Selection indicator -->
                <div class="selection-indicator" *ngIf="selectedColorIndex === i">
                  <mat-icon>check_circle</mat-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-section" *ngIf="selectedColorIndex >= 0">
          <h3>Preview</h3>
          <div class="preview-container">
            <div class="preview-element"
                 [style.background-color]="getSelectedColor().fill || '#ffffff'"
                 [style.border-color]="getSelectedColor().stroke || '#cccccc'"
                 [style.border-width]="getSelectedColor().stroke ? '2px' : '1px'"
                 [style.border-style]="'solid'">
              <span class="preview-text">{{ data.elementType }} Preview</span>
            </div>
            <div class="preview-details">
              <p><strong>{{ getSelectedColor().name }}</strong></p>
              <p *ngIf="getSelectedColor().fill"></p>
              <p *ngIf="getSelectedColor().stroke"></p>
            </div>
          </div>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="onApply()"
          [disabled]="selectedColorIndex < 0"
          class="apply-btn">
          <mat-icon>palette</mat-icon>
          Apply Color
        </button>
      </div>
    </div>
  `,
  styles: [`
    .color-dialog {
      min-width: 500px;
      max-width: 700px;
    }

    .dialog-header {
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 0;
      padding-bottom: 16px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      font-size: 32px;
      color: #1976d2;
    }

    .header-text h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .element-info {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 14px;
    }

    .element-type {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
      margin-right: 8px;
    }

    .element-name {
      font-style: italic;
    }

    .dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .current-color-section {
      margin-bottom: 32px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .current-color-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .current-color-preview {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .color-sample {
      width: 80px;
      height: 50px;
      border: 2px solid;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      color: #333;
    }

    .color-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .color-detail {
      display: flex;
      gap: 8px;
    }

    .color-detail .label {
      font-weight: 500;
      min-width: 50px;
    }

    .color-detail .value {
      font-family: monospace;
      background: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }

    .color-selection-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .color-option {
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .color-option:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .color-option.selected {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(25,118,210,0.3);
    }

    .color-card {
      position: relative;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      transition: border-color 0.2s ease;
    }

    .color-option.selected .color-card {
      border-color: #1976d2;
    }

    .color-preview {
      width: 100%;
      height: 60px;
      border-radius: 6px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      color: #333;
    }

    .color-name {
      font-weight: 500;
      font-size: 14px;
      color: #333;
    }

    .color-values {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .fill-value, .stroke-value {
      font-family: monospace;
      color: #666;
      font-size: 10px;
    }

    .selection-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #1976d2;
    }

    .selection-indicator mat-icon {
      font-size: 20px;
    }

    .preview-section {
      margin-top: 24px;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .preview-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .preview-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .preview-element {
      width: 120px;
      height: 70px;
      border: 2px solid;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      color: #333;
    }

    .preview-details p {
      margin: 4px 0;
    }

    .dialog-actions {
      border-top: 1px solid #e0e0e0;
      margin-top: 0;
      padding: 16px 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .cancel-btn {
      color: #666;
    }

    .apply-btn {
      min-width: 120px;
    }
  `]
})
export class ColorDialogComponent {
  selectedColorIndex: number = -1;

  colorOptions: ColorOption[] = [
    { 
      name: 'Default', 
      fill: null, 
      stroke: null,
      description: 'Reset to default colors'
    },
    { 
      name: 'Light Blue', 
      fill: '#e3f2fd', 
      stroke: '#1976d2',
      description: 'Professional blue theme'
    },
    { 
      name: 'Light Green', 
      fill: '#e8f5e8', 
      stroke: '#388e3c',
      description: 'Success or completion theme'
    },
    { 
      name: 'Light Red', 
      fill: '#ffebee', 
      stroke: '#d32f2f',
      description: 'Error or attention theme'
    },
    { 
      name: 'Light Yellow', 
      fill: '#fffde7', 
      stroke: '#f57c00',
      description: 'Warning or highlight theme'
    },
    { 
      name: 'Light Purple', 
      fill: '#f3e5f5', 
      stroke: '#7b1fa2',
      description: 'Creative or special theme'
    },
    { 
      name: 'Light Orange', 
      fill: '#fff3e0', 
      stroke: '#f57c00',
      description: 'Energy or action theme'
    },
    { 
      name: 'Light Pink', 
      fill: '#fce4ec', 
      stroke: '#c2185b',
      description: 'Soft or gentle theme'
    },
    { 
      name: 'Light Cyan', 
      fill: '#e0f2f1', 
      stroke: '#00796b',
      description: 'Cool or calm theme'
    }
  ];

  constructor(
    public dialogRef: MatDialogRef<ColorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ColorDialogData
  ) {}

  hasCurrentColors(): boolean {
    return !!(this.data.currentColors?.fill || this.data.currentColors?.stroke);
  }

  selectColor(index: number): void {
    this.selectedColorIndex = index;
  }

  getSelectedColor(): ColorOption {
    return this.colorOptions[this.selectedColorIndex] || this.colorOptions[0];
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onApply(): void {
    if (this.selectedColorIndex >= 0) {
      const selectedColor = this.getSelectedColor();
      const result: ColorDialogResult = {
        fill: selectedColor.fill,
        stroke: selectedColor.stroke,
        colorName: selectedColor.name
      };
      this.dialogRef.close(result);
    }
  }
}