
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';

export interface CustomProperty {
  id: string;
  title: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';
  value: any;
  required: boolean;
  description?: string;
  options?: string[];
}

export interface CustomPropertyDialogData {
  elementId: string;
  elementType: string;
  elementName: string;
  existingProperties: CustomProperty[];
}

@Component({
  selector: 'app-custom-property-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="custom-property-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>settings</mat-icon>
          Custom Properties for {{ data.elementName }}
        </h2>
        <button mat-icon-button (click)="onCancel()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        <div class="element-info">
          <div class="info-item">
            <span class="label">Element Type:</span>
            <span class="value">{{ data.elementType }}</span>
          </div>
          <div class="info-item">
            <span class="label">Element ID:</span>
            <span class="value">{{ data.elementId }}</span>
          </div>
        </div>

        <form [formGroup]="propertyForm" class="properties-form">
          <div class="section-header">
            <h3>Properties ({{ propertiesArray.length }})</h3>
            <button type="button" mat-raised-button color="primary" 
                    (click)="addProperty()" class="add-btn">
              <mat-icon>add</mat-icon>
              Add Property
            </button>
          </div>

          <div formArrayName="properties" class="properties-list">
            <div *ngFor="let property of propertiesArray.controls; let i = index" 
                 [formGroupName]="i" class="property-item">
              
              <div class="property-header">
                <div class="property-number">{{ i + 1 }}</div>
                <button type="button" mat-icon-button color="warn" 
                        (click)="removeProperty(i)" class="delete-btn">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>

              <div class="property-fields">
                <div class="field-row">
                  <mat-form-field appearance="outline" class="field-title">
                    <mat-label>Property Name</mat-label>
                    <input matInput formControlName="title" placeholder="Enter property name">
                    <mat-error *ngIf="property.get('title')?.hasError('required')">
                      Property name is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="field-type">
                    <mat-label>Type</mat-label>
                    <mat-select formControlName="type" (selectionChange)="onTypeChange(i, $event.value)">
                      <mat-option value="text">Text</mat-option>
                      <mat-option value="textarea">Textarea</mat-option>
                      <mat-option value="number">Number</mat-option>
                      <mat-option value="boolean">Boolean</mat-option>
                      <mat-option value="date">Date</mat-option>
                      <mat-option value="select">Select</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="field-row">
                  <mat-form-field appearance="outline" class="field-description">
                    <mat-label>Description (Optional)</mat-label>
                    <input matInput formControlName="description" placeholder="Enter description">
                  </mat-form-field>

                  <div class="field-required">
                    <mat-checkbox formControlName="required">Required</mat-checkbox>
                  </div>
                </div>

                <!-- Options for select type -->
                <div *ngIf="property.get('type')?.value === 'select'" class="select-options">
                  <mat-form-field appearance="outline" class="field-options">
                    <mat-label>Options (comma separated)</mat-label>
                    <textarea matInput formControlName="optionsText" 
                              placeholder="Option 1, Option 2, Option 3"
                              rows="2"></textarea>
                  </mat-form-field>
                </div>

                <!-- Value field based on type -->
                <div class="field-row">
                  <mat-form-field appearance="outline" class="field-value">
                    <mat-label>Default Value</mat-label>
                    
                    <!-- Text input -->
                    <input *ngIf="property.get('type')?.value === 'text'" 
                           matInput formControlName="value" placeholder="Enter default value">
                    
                    <!-- Textarea -->
                    <textarea *ngIf="property.get('type')?.value === 'textarea'" 
                              matInput formControlName="value" 
                              placeholder="Enter default value" rows="3"></textarea>
                    
                    <!-- Number input -->
                    <input *ngIf="property.get('type')?.value === 'number'" 
                           matInput type="number" formControlName="value" 
                           placeholder="Enter default value">
                    
                    <!-- Date input -->
                    <input *ngIf="property.get('type')?.value === 'date'" 
                           matInput [matDatepicker]="picker" formControlName="value">
                    <mat-datepicker-toggle *ngIf="property.get('type')?.value === 'date'" 
                                           matSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                    
                    <!-- Select input -->
                    <mat-select *ngIf="property.get('type')?.value === 'select'" 
                                formControlName="value">
                      <mat-option *ngFor="let option of getSelectOptions(i)" [value]="option">
                        {{ option }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>

                  <!-- Boolean checkbox -->
                  <div *ngIf="property.get('type')?.value === 'boolean'" class="field-boolean">
                    <mat-checkbox formControlName="value">Default Value</mat-checkbox>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="propertiesArray.length === 0" class="no-properties">
              <mat-icon>info</mat-icon>
              <p>No properties defined. Click "Add Property" to create one.</p>
            </div>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          Cancel
        </button>
        <button mat-raised-button color="primary" (click)="onSave()" 
                [disabled]="!propertyForm.valid" class="save-btn">
          <mat-icon>save</mat-icon>
          Save Properties
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .custom-property-dialog {
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin: -24px -24px 0 -24px;
    }

    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .close-btn {
      color: white;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 0;
    }

    .element-info {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      border-left: 4px solid #667eea;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 500;
      color: #666;
    }

    .value {
      font-family: monospace;
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 0 8px;
    }

    .section-header h3 {
      margin: 0;
      color: #333;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .properties-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .property-item {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
      background: white;
    }

    .property-item:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .property-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
      border-bottom: 1px solid #e0e0e0;
    }

    .property-number {
      background: #667eea;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .delete-btn {
      color: #dc3545;
    }

    .property-fields {
      padding: 16px;
    }

    .field-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: flex-start;
    }

    .field-row:last-child {
      margin-bottom: 0;
    }

    .field-title {
      flex: 2;
    }

    .field-type {
      flex: 1;
    }

    .field-description {
      flex: 3;
    }

    .field-required {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }

    .field-value {
      flex: 1;
    }

    .field-boolean {
      display: flex;
      align-items: center;
      margin-top: 8px;
      flex: 1;
    }

    .field-options {
      width: 100%;
    }

    .select-options {
      margin-bottom: 16px;
    }

    .no-properties {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      background: #f8f9fa;
      border-radius: 8px;
      border: 2px dashed #dee2e6;
    }

    .no-properties mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #999;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
      margin: 0 -24px -24px -24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .save-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .cancel-btn {
      color: #666;
    }

    @media (max-width: 768px) {
      .custom-property-dialog {
        max-width: 95vw;
      }

      .field-row {
        flex-direction: column;
        gap: 8px;
      }

      .field-title,
      .field-type,
      .field-description,
      .field-value {
        flex: 1;
        width: 100%;
      }

      .section-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }
  `]
})
export class CustomPropertyDialogComponent implements OnInit {
  propertyForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CustomPropertyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CustomPropertyDialogData
  ) {
    this.propertyForm = this.fb.group({
      properties: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadExistingProperties();
  }

  get propertiesArray(): FormArray {
    return this.propertyForm.get('properties') as FormArray;
  }

  private loadExistingProperties(): void {
    if (this.data.existingProperties && this.data.existingProperties.length > 0) {
      this.data.existingProperties.forEach(prop => {
        this.propertiesArray.push(this.createPropertyFormGroup(prop));
      });
    } else {
      this.addProperty();
    }
  }

  private createPropertyFormGroup(property?: CustomProperty): FormGroup {
    const optionsText = property?.options ? property.options.join(', ') : '';
    
    return this.fb.group({
      id: [property?.id || this.generateId()],
      title: [property?.title || '', Validators.required],
      type: [property?.type || 'text'],
      value: [property?.value || this.getDefaultValueForType(property?.type || 'text')],
      required: [property?.required || false],
      description: [property?.description || ''],
      optionsText: [optionsText]
    });
  }

  addProperty(): void {
    this.propertiesArray.push(this.createPropertyFormGroup());
  }

  removeProperty(index: number): void {
    if (this.propertiesArray.length > 1) {
      this.propertiesArray.removeAt(index);
    }
  }

  onTypeChange(index: number, newType: string): void {
    const propertyGroup = this.propertiesArray.at(index) as FormGroup;
    const valueControl = propertyGroup.get('value');
    
    if (valueControl) {
      valueControl.setValue(this.getDefaultValueForType(newType));
    }
  }

  getSelectOptions(index: number): string[] {
    const propertyGroup = this.propertiesArray.at(index) as FormGroup;
    const optionsText = propertyGroup.get('optionsText')?.value || '';
    
    return optionsText
      .split(',')
      .map((option: string) => option.trim())
      .filter((option: string) => option.length > 0);
  }

  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'boolean': return false;
      case 'number': return 0;
      case 'date': return null;
      case 'textarea': return '';
      case 'select': return '';
      default: return '';
    }
  }

  private generateId(): string {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  onSave(): void {
    if (this.propertyForm.valid) {
      const properties: CustomProperty[] = this.propertiesArray.value.map((prop: any) => {
        const result: CustomProperty = {
          id: prop.id,
          title: prop.title,
          type: prop.type,
          value: prop.value,
          required: prop.required,
          description: prop.description
        };

        if (prop.type === 'select' && prop.optionsText) {
          result.options = prop.optionsText
            .split(',')
            .map((option: string) => option.trim())
            .filter((option: string) => option.length > 0);
        }

        return result;
      });

      this.dialogRef.close(properties);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}