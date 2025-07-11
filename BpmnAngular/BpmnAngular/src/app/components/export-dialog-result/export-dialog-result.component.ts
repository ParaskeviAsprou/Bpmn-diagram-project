// ΔΗΜΙΟΥΡΓΗΣΕ ΤΟ ΑΡΧΕΙΟ: BpmnAngular/BpmnAngular/src/app/components/export-dialog-result/export-dialog-result.component.ts

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface ExportDialogData {
  fileName: string;
  elementType: string;
  hasCustomProperties: boolean;
  hasElementColors: boolean;
}

export interface ExportDialogResult {
  format: 'pdf' | 'svg' | 'png' | 'xml';
  fileName: string;
  quality: 'low' | 'medium' | 'high';
  paperSize: 'a4' | 'a3' | 'letter' | 'auto';
  includeMetadata: boolean;
}

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <h2 mat-dialog-title>Export Diagram</h2>
    <mat-dialog-content>
      <div style="display: flex; flex-direction: column; gap: 16px; min-width: 300px;">
        <mat-form-field appearance="outline">
          <mat-label>Format</mat-label>
          <mat-select [(value)]="selectedFormat">
            <mat-option value="pdf">PDF</mat-option>
            <mat-option value="svg">SVG</mat-option>
            <mat-option value="png">PNG</mat-option>
            <mat-option value="xml">XML</mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>File Name</mat-label>
          <input matInput [(ngModel)]="fileName">
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onExport()">Export</button>
    </mat-dialog-actions>
  `
})
export class ExportDialogComponent {
  selectedFormat: 'pdf' | 'svg' | 'png' | 'xml' = 'pdf';
  fileName: string;

  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogData
  ) {
    this.fileName = data.fileName || 'diagram';
  }

  onExport() {
    const result: ExportDialogResult = {
      format: this.selectedFormat,
      fileName: this.fileName,
      quality: 'medium',
      paperSize: 'a4',
      includeMetadata: true
    };
    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close();
  }
}

