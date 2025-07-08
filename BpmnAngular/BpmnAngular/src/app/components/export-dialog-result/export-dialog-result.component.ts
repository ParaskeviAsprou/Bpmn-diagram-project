// export-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface ExportDialogData {
  fileName: string;
  elementType?: string;
  hasCustomProperties?: boolean;
  hasElementColors?: boolean;
}

export interface ExportDialogResult {
  format: 'pdf' | 'svg' | 'png' | 'xml';
  fileName: string;
  includeMetadata?: boolean;
  quality?: 'low' | 'medium' | 'high';
  paperSize?: string;
}

export interface ExportFormat {
  format: 'pdf' | 'svg' | 'png' | 'xml';
  label: string;
  description: string;
  icon: string;
  fileExtension: string;
  features: string[];
  recommended?: boolean;
  supportsQuality?: boolean;
  supportsPaperSize?: boolean;
}

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  template: `
    <div class="export-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="header-content">
          <mat-icon class="header-icon">file_download</mat-icon>
          <div class="header-text">
            <h2>Export Diagram</h2>
            <p class="file-info">{{ data.fileName }}</p>
          </div>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        
        <!-- Export Format Selection -->
        <div class="format-selection">
          <h3>Choose Export Format</h3>
          
          <div class="format-grid">
            <div *ngFor="let format of exportFormats" 
                 class="format-card"
                 [class.selected]="selectedFormat?.format === format.format"
                 [class.recommended]="format.recommended"
                 (click)="selectFormat(format)">
              
              <div class="format-header">
                <mat-icon class="format-icon" [style.color]="getFormatColor(format.format)">
                  {{ format.icon }}
                </mat-icon>
                <div class="format-info">
                  <h4>{{ format.label }}</h4>
                  <p>{{ format.description }}</p>
                </div>
                <mat-icon *ngIf="format.recommended" class="recommended-badge" color="accent" matTooltip="Recommended">
                  star
                </mat-icon>
              </div>
              
              <div class="format-features">
                <div class="feature-chips">
                  <span *ngFor="let feature of format.features" class="feature-chip">
                    {{ feature }}
                  </span>
                </div>
              </div>
              
              <div class="format-extension">
                File: {{ getExportFileName(format.fileExtension) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Export Options -->
        <div *ngIf="selectedFormat" class="export-options">
          <h3>Export Options</h3>
          
          <div class="options-grid">
            
            <!-- File Name -->
            <mat-form-field appearance="outline" class="filename-field">
              <mat-label>File Name</mat-label>
              <input matInput [(ngModel)]="exportFileName" placeholder="Enter file name">
              <mat-hint>Extension will be added automatically</mat-hint>
            </mat-form-field>

            <!-- Quality Setting -->
            <mat-form-field *ngIf="selectedFormat.supportsQuality" appearance="outline" class="quality-field">
              <mat-label>Quality</mat-label>
              <mat-select [(ngModel)]="selectedQuality">
                <mat-option value="low">
                  <div class="quality-option">
                    <span>Low</span>
                    <small>Faster export, smaller file</small>
                  </div>
                </mat-option>
                <mat-option value="medium">
                  <div class="quality-option">
                    <span>Medium</span>
                    <small>Balanced quality and size</small>
                  </div>
                </mat-option>
                <mat-option value="high">
                  <div class="quality-option">
                    <span>High</span>
                    <small>Best quality, larger file</small>
                  </div>
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Paper Size for PDF -->
            <mat-form-field *ngIf="selectedFormat.supportsPaperSize" appearance="outline" class="paper-field">
              <mat-label>Paper Size</mat-label>
              <mat-select [(ngModel)]="selectedPaperSize">
                <mat-option value="a4">A4 (210 × 297 mm)</mat-option>
                <mat-option value="letter">Letter (8.5 × 11 in)</mat-option>
                <mat-option value="a3">A3 (297 × 420 mm)</mat-option>
                <mat-option value="tabloid">Tabloid (11 × 17 in)</mat-option>
                <mat-option value="auto">Auto (Fit to content)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Advanced Options -->
          <div class="advanced-options">
            <h4>Advanced Options</h4>
            
            <div class="checkbox-group">
              <mat-checkbox [(ngModel)]="includeMetadata" *ngIf="hasMetadata()">
                <div class="checkbox-content">
                  <span class="checkbox-label">Include Custom Properties</span>
                  <small class="checkbox-description">Export custom properties and element colors</small>
                </div>
              </mat-checkbox>
              
              <mat-checkbox [(ngModel)]="includeTimestamp">
                <div class="checkbox-content">
                  <span class="checkbox-label">Include Timestamp</span>
                  <small class="checkbox-description">Add export date to file name</small>
                </div>
              </mat-checkbox>
              
              <mat-checkbox [(ngModel)]="openAfterExport">
                <div class="checkbox-content">
                  <span class="checkbox-label">Open After Export</span>
                  <small class="checkbox-description">Automatically open the exported file</small>
                </div>
              </mat-checkbox>
            </div>
          </div>
        </div>

        <!-- Format Information -->
        <div *ngIf="selectedFormat" class="format-info-section">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-icon mat-card-avatar [style.color]="getFormatColor(selectedFormat.format)">
                {{ selectedFormat.icon }}
              </mat-icon>
              <mat-card-title>{{ selectedFormat.label }} Export</mat-card-title>
              <mat-card-subtitle>{{ selectedFormat.description }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="format-details">
                <div class="detail-item">
                  <mat-icon>description</mat-icon>
                  <span>Final file: {{ getExportFileName(selectedFormat.fileExtension) }}</span>
                </div>
                <div class="detail-item" *ngIf="getEstimatedSize()">
                  <mat-icon>storage</mat-icon>
                  <span>Estimated size: {{ getEstimatedSize() }}</span>
                </div>
                <div class="detail-item">
                  <mat-icon>device_hub</mat-icon>
                  <span>Compatible with: {{ getCompatibility() }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Export Progress -->
        <div *ngIf="isExporting" class="export-progress">
          <div class="progress-content">
            <mat-icon class="progress-icon spinning">refresh</mat-icon>
            <div class="progress-text">
              <h4>Exporting...</h4>
              <p>Generating {{ selectedFormat?.label }} file</p>
            </div>
          </div>
          <mat-progress-bar mode="indeterminate" class="progress-bar"></mat-progress-bar>
        </div>

      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" [disabled]="isExporting">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        
        <div class="export-actions">
          <button mat-stroked-button (click)="previewExport()" [disabled]="!selectedFormat || isExporting">
            <mat-icon>preview</mat-icon>
            Preview
          </button>
          
          <button mat-raised-button color="primary" (click)="startExport()" [disabled]="!selectedFormat || isExporting">
            <mat-icon>file_download</mat-icon>
            {{ isExporting ? 'Exporting...' : 'Export' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .export-dialog {
      min-width: 800px;
      max-width: 1000px;
      max-height: 90vh;
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
      color: #4caf50;
    }

    .header-text h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .file-info {
      margin: 8px 0 0 0;
      font-family: monospace;
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    .dialog-content {
      padding: 24px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .format-selection h3, .export-options h3 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .format-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .format-card {
      border: 2px solid #e0e0e0;
      border-radius: 16px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      background: white;
    }

    .format-card:hover {
      border-color: #1976d2;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
      transform: translateY(-2px);
    }

    .format-card.selected {
      border-color: #4caf50;
      background: #f1f8e9;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.25);
    }

    .format-card.recommended::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(45deg, #ff9800, #f57c00);
      border-radius: 16px;
      z-index: -1;
    }

    .format-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .format-icon {
      font-size: 32px;
    }

    .format-info {
      flex: 1;
    }

    .format-info h4 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .format-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.4;
    }

    .recommended-badge {
      color: #ff9800;
    }

    .format-features {
      margin-bottom: 12px;
    }

    .feature-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .feature-chip {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    .format-extension {
      font-family: monospace;
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      padding: 6px 8px;
      border-radius: 4px;
    }

    .export-options {
      border-top: 1px solid #e0e0e0;
      padding-top: 24px;
    }

    .options-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .quality-option {
      display: flex;
      flex-direction: column;
    }

    .quality-option small {
      color: #666;
      font-size: 11px;
    }

    .advanced-options h4 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .checkbox-content {
      display: flex;
      flex-direction: column;
    }

    .checkbox-label {
      font-weight: 500;
    }

    .checkbox-description {
      color: #666;
      font-size: 12px;
      margin-top: 2px;
    }

    .format-info-section {
      margin-top: 24px;
    }

    .info-card {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
    }

    .format-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .detail-item mat-icon {
      font-size: 16px;
      color: #666;
    }

    .export-progress {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .progress-content {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .progress-icon {
      font-size: 32px;
      color: #4caf50;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    .progress-text h4 {
      margin: 0 0 4px 0;
      font-size: 18px;
    }

    .progress-text p {
      margin: 0;
      color: #666;
    }

    .progress-bar {
      width: 300px;
    }

    .dialog-actions {
      border-top: 1px solid #e0e0e0;
      margin-top: 0;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
    }

    .export-actions {
      display: flex;
      gap: 12px;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .export-dialog {
        min-width: 95vw;
        max-width: 95vw;
      }

      .format-grid {
        grid-template-columns: 1fr;
      }

      .options-grid {
        grid-template-columns: 1fr;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 12px;
      }

      .export-actions {
        order: -1;
      }
    }
  `]
})
export class ExportDialogComponent {
  selectedFormat: ExportFormat | null = null;
  exportFileName = '';
  selectedQuality: 'low' | 'medium' | 'high' = 'medium';
  selectedPaperSize = 'a4';
  includeMetadata = true;
  includeTimestamp = false;
  openAfterExport = false;
  isExporting = false;

  exportFormats: ExportFormat[] = [
    {
      format: 'pdf',
      label: 'PDF Document',
      description: 'High-quality printable document format',
      icon: 'picture_as_pdf',
      fileExtension: 'pdf',
      features: ['Printable', 'Scalable', 'Professional'],
      recommended: true,
      supportsQuality: true,
      supportsPaperSize: true
    },
    {
      format: 'svg',
      label: 'SVG Vector',
      description: 'Scalable vector graphics for web and print',
      icon: 'image',
      fileExtension: 'svg',
      features: ['Scalable', 'Web-friendly', 'Editable'],
      supportsQuality: false,
      supportsPaperSize: false
    },
    {
      format: 'png',
      label: 'PNG Image',
      description: 'High-quality raster image with transparency',
      icon: 'image',
      fileExtension: 'png',
      features: ['Transparent', 'Web-ready', 'Sharp'],
      supportsQuality: true,
      supportsPaperSize: false
    },
    {
      format: 'xml',
      label: 'BPMN XML',
      description: 'Source code format for import/export',
      icon: 'code',
      fileExtension: 'xml',
      features: ['Portable', 'Editable', 'Standard'],
      supportsQuality: false,
      supportsPaperSize: false
    }
  ];

  constructor(
    public dialogRef: MatDialogRef<ExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogData
  ) {
    this.exportFileName = this.getBaseFileName();
    // Pre-select PDF as default
    this.selectedFormat = this.exportFormats.find(f => f.format === 'pdf') || null;
  }

  selectFormat(format: ExportFormat): void {
    this.selectedFormat = format;
  }

  getBaseFileName(): string {
    return this.data.fileName.replace(/\.(bpmn|xml)$/, '') || 'diagram';
  }

  getExportFileName(extension: string): string {
    let name = this.exportFileName || this.getBaseFileName();
    
    if (this.includeTimestamp) {
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
      name += '_' + timestamp;
    }
    
    return name + '.' + extension;
  }

  getFormatColor(format: string): string {
    switch (format) {
      case 'pdf': return '#f44336';
      case 'svg': return '#ff9800';
      case 'png': return '#4caf50';
      case 'xml': return '#2196f3';
      default: return '#666';
    }
  }

  hasMetadata(): boolean {
    return !!this.data.hasCustomProperties || !!this.data.hasElementColors;
  }

  getEstimatedSize(): string {
    if (!this.selectedFormat) return '';
    
    switch (this.selectedFormat.format) {
      case 'pdf': 
        return this.selectedQuality === 'high' ? '500KB - 2MB' : '200KB - 800KB';
      case 'svg': 
        return '50KB - 200KB';
      case 'png': 
        return this.selectedQuality === 'high' ? '1MB - 5MB' : '300KB - 1MB';
      case 'xml': 
        return '10KB - 100KB';
      default: 
        return '';
    }
  }

  getCompatibility(): string {
    if (!this.selectedFormat) return '';
    
    switch (this.selectedFormat.format) {
      case 'pdf': 
        return 'All devices, Adobe Reader, Browsers';
      case 'svg': 
        return 'Web browsers, Vector editors, Adobe Illustrator';
      case 'png': 
        return 'All image viewers, Web browsers, Office apps';
      case 'xml': 
        return 'BPMN tools, Text editors, Development environments';
      default: 
        return '';
    }
  }

  previewExport(): void {
    // Implement preview functionality
    console.log('Preview export:', this.selectedFormat);
  }

  startExport(): void {
    if (!this.selectedFormat) return;

    this.isExporting = true;

    const result: ExportDialogResult = {
      format: this.selectedFormat.format,
      fileName: this.getExportFileName(this.selectedFormat.fileExtension),
      includeMetadata: this.includeMetadata,
      quality: this.selectedQuality,
      paperSize: this.selectedPaperSize
    };

    // Simulate export delay
    setTimeout(() => {
      this.isExporting = false;
      this.dialogRef.close(result);
    }, 1500);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}