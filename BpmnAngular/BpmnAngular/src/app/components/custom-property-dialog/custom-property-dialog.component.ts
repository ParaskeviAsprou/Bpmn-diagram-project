
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
    FormsModule,
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
  templateUrl: './custom-property-dialog.component.html',
  styleUrl:'./custom-property-dialog.component.css'
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