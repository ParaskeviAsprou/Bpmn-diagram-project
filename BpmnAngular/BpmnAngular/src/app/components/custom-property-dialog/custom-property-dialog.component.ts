// custom-property-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { CustomProperty, CustomPropertyService } from '../../services/custom-properties.service';

export interface CustomPropertyDialogData {
  elementId: string;
  elementType: string;
  elementName?: string;
  existingProperties: CustomProperty[];
}

export interface CustomPropertyDialogResult {
  properties: CustomProperty[];
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
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatTabsModule,
    MatExpansionModule
  ],
  template: `
    <div class="custom-property-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="header-content">
          <mat-icon class="header-icon">settings</mat-icon>
          <div class="header-text">
            <h2>Custom Properties</h2>
            <p class="element-info">
              <span class="element-type">{{ data.elementType }}</span>
              <span class="element-name" *ngIf="data.elementName">{{ data.elementName }}</span>
            </p>
          </div>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="property-tabs">
          
          <!-- Properties List Tab -->
          <mat-tab label="Properties" class="properties-tab">
            <div class="tab-content">
              
              <!-- Quick Actions -->
              <div class="quick-actions">
                <button mat-raised-button color="primary" (click)="addNewProperty()" class="action-btn">
                  <mat-icon>add</mat-icon>
                  Add Property
                </button>
                <button mat-stroked-button (click)="loadTemplate()" class="action-btn">
                  <mat-icon>playlist_add</mat-icon>
                  From Template
                </button>
                <button mat-stroked-button (click)="clearAll()" [disabled]="properties.length === 0" class="action-btn">
                  <mat-icon>clear_all</mat-icon>
                  Clear All
                </button>
              </div>

              <!-- Properties List -->
              <div class="properties-list" *ngIf="properties.length > 0; else emptyState">
                <mat-card *ngFor="let property of properties; let i = index" class="property-card" 
                         [class.editing]="editingIndex === i">
                  
                  <!-- Property Header -->
                  <mat-card-header class="property-header">
                    <div class="property-title-section">
                      <div class="property-info">
                        <h4 class="property-title">{{ property.title || 'Untitled Property' }}</h4>
                        <mat-chip [class]="'type-' + property.type" class="type-chip">
                          <mat-icon>{{ getTypeIcon(property.type) }}</mat-icon>
                          {{ property.type }}
                        </mat-chip>
                        <mat-icon *ngIf="property.required" class="required-icon" color="warn" matTooltip="Required">star</mat-icon>
                      </div>
                      
                      <div class="property-actions">
                        <button mat-icon-button color="primary" (click)="editProperty(i)" matTooltip="Edit property">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button color="warn" (click)="removeProperty(i)" matTooltip="Remove property">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </div>
                  </mat-card-header>

                  <!-- Property Content -->
                  <mat-card-content class="property-content">
                    <!-- Read-only Mode -->
                    <div *ngIf="editingIndex !== i" class="property-readonly">
                      <div class="property-value-display">
                        <div class="value-label">Current Value:</div>
                        <div class="value-content" [ngSwitch]="property.type">
                          <span *ngSwitchCase="'boolean'" class="boolean-value" [class.true]="property.value" [class.false]="!property.value">
                            <mat-icon>{{ property.value ? 'check_circle' : 'cancel' }}</mat-icon>
                            {{ property.value ? 'Yes' : 'No' }}
                          </span>
                          <span *ngSwitchCase="'date'" class="date-value">
                            <mat-icon>event</mat-icon>
                            {{ property.value | date:'medium' }}
                          </span>
                          <span *ngSwitchCase="'number'" class="number-value">
                            <mat-icon>tag</mat-icon>
                            {{ property.value || 0 }}
                          </span>
                          <span *ngSwitchDefault class="text-value">
                            <mat-icon>text_fields</mat-icon>
                            {{ property.value || 'Not set' }}
                          </span>
                        </div>
                      </div>
                      
                      <div *ngIf="property.description" class="property-description">
                        <mat-icon>info</mat-icon>
                        <span>{{ property.description }}</span>
                      </div>
                    </div>

                    <!-- Edit Mode -->
                    <div *ngIf="editingIndex === i" class="property-edit">
                      <form [formGroup]="getPropertyForm(i)" class="property-form">
                        <div class="form-row">
                          <mat-form-field appearance="outline" class="half-width">
                            <mat-label>Property Title</mat-label>
                            <input matInput formControlName="title" placeholder="Enter property name">
                            <mat-error>Property title is required</mat-error>
                          </mat-form-field>
                          
                          <mat-form-field appearance="outline" class="half-width">
                            <mat-label>Type</mat-label>
                            <mat-select formControlName="type">
                              <mat-option value="text">
                                <mat-icon>text_fields</mat-icon>
                                Text
                              </mat-option>
                              <mat-option value="textarea">
                                <mat-icon>notes</mat-icon>
                                Text Area
                              </mat-option>
                              <mat-option value="number">
                                <mat-icon>tag</mat-icon>
                                Number
                              </mat-option>
                              <mat-option value="boolean">
                                <mat-icon>toggle_on</mat-icon>
                                Boolean
                              </mat-option>
                              <mat-option value="date">
                                <mat-icon>event</mat-icon>
                                Date
                              </mat-option>
                              <mat-option value="select">
                                <mat-icon>list</mat-icon>
                                Select
                              </mat-option>
                            </mat-select>
                          </mat-form-field>
                        </div>

                        <div class="form-row">
                          <mat-form-field appearance="outline" class="full-width">
                            <mat-label>Description</mat-label>
                            <input matInput formControlName="description" placeholder="Optional description">
                          </mat-form-field>
                        </div>

                        <!-- Select Options -->
                        <div *ngIf="getPropertyForm(i).get('type')?.value === 'select'" class="select-options">
                          <mat-form-field appearance="outline" class="full-width">
                            <mat-label>Options (comma-separated)</mat-label>
                            <input matInput formControlName="optionsText" placeholder="Option 1, Option 2, Option 3">
                          </mat-form-field>
                        </div>

                        <!-- Property Value -->
                        <div class="form-row">
                          <div class="value-section" [ngSwitch]="getPropertyForm(i).get('type')?.value">
                            
                            <mat-form-field *ngSwitchCase="'text'" appearance="outline" class="full-width">
                              <mat-label>Default Value</mat-label>
                              <input matInput formControlName="value" placeholder="Enter default value">
                            </mat-form-field>

                            <mat-form-field *ngSwitchCase="'textarea'" appearance="outline" class="full-width">
                              <mat-label>Default Value</mat-label>
                              <textarea matInput formControlName="value" rows="3" placeholder="Enter default value"></textarea>
                            </mat-form-field>

                            <mat-form-field *ngSwitchCase="'number'" appearance="outline" class="full-width">
                              <mat-label>Default Value</mat-label>
                              <input matInput type="number" formControlName="value" placeholder="Enter default number">
                            </mat-form-field>

                            <mat-form-field *ngSwitchCase="'date'" appearance="outline" class="full-width">
                              <mat-label>Default Value</mat-label>
                              <input matInput type="date" formControlName="value">
                            </mat-form-field>

                            <mat-form-field *ngSwitchCase="'select'" appearance="outline" class="full-width">
                              <mat-label>Default Selection</mat-label>
                              <mat-select formControlName="value">
                                <mat-option *ngFor="let option of getSelectOptions(i)" [value]="option">
                                  {{ option }}
                                </mat-option>
                              </mat-select>
                            </mat-form-field>

                            <div *ngSwitchCase="'boolean'" class="boolean-control">
                              <mat-checkbox formControlName="value" class="boolean-checkbox">
                                Default Value
                              </mat-checkbox>
                            </div>

                          </div>
                        </div>

                        <div class="form-row">
                          <mat-checkbox formControlName="required" class="required-checkbox">
                            Required Property
                          </mat-checkbox>
                        </div>

                        <!-- Action Buttons -->
                        <div class="edit-actions">
                          <button mat-raised-button color="primary" (click)="saveProperty(i)" [disabled]="getPropertyForm(i).invalid">
                            <mat-icon>save</mat-icon>
                            Save
                          </button>
                          <button mat-stroked-button (click)="cancelEdit()">
                            <mat-icon>cancel</mat-icon>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <!-- Empty State -->
              <ng-template #emptyState>
                <div class="empty-state">
                  <mat-icon class="empty-icon">settings</mat-icon>
                  <h3>No Custom Properties</h3>
                  <p>Add custom properties to enhance this {{ data.elementType }} with additional metadata.</p>
                  <button mat-raised-button color="primary" (click)="addNewProperty()">
                    <mat-icon>add</mat-icon>
                    Add First Property
                  </button>
                </div>
              </ng-template>

            </div>
          </mat-tab>

          <!-- Templates Tab -->
          <mat-tab label="Templates" class="templates-tab">
            <div class="tab-content">
              <div class="templates-section">
                <h3>Property Templates</h3>
                <p>Quick start with predefined property sets</p>
                
                <div class="template-grid">
                  <mat-card *ngFor="let template of getTemplates()" class="template-card" (click)="applyTemplate(template)">
                    <mat-card-header>
                      <mat-icon mat-card-avatar>{{ template.icon }}</mat-icon>
                      <mat-card-title>{{ template.name }}</mat-card-title>
                      <mat-card-subtitle>{{ template.description }}</mat-card-subtitle>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="template-properties">
                        <mat-chip-set>
                          <mat-chip *ngFor="let prop of template.properties.slice(0, 3)">
                            {{ prop.title }}
                          </mat-chip>
                          <mat-chip *ngIf="template.properties.length > 3">
                            +{{ template.properties.length - 3 }} more
                          </mat-chip>
                        </mat-chip-set>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <div class="actions-left">
          <span class="property-count">{{ properties.length }} properties</span>
        </div>
        <div class="actions-right">
          <button mat-button (click)="onCancel()">
            <mat-icon>close</mat-icon>
            Cancel
          </button>
          <button mat-raised-button color="primary" (click)="onSave()" [disabled]="isInvalid()">
            <mat-icon>save</mat-icon>
            Save Properties
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-property-dialog {
      min-width: 900px;
      max-width: 1200px;
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
      color: #1976d2;
    }

    .header-text h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }

    .element-info {
      margin: 8px 0 0 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .element-type {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    .element-name {
      color: #666;
      font-style: italic;
    }

    .dialog-content {
      padding: 0;
      max-height: 70vh;
      overflow: hidden;
    }

    .property-tabs {
      height: 100%;
    }

    .tab-content {
      padding: 24px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .quick-actions {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .properties-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .property-card {
      border: 2px solid #e0e0e0;
      border-radius: 16px;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .property-card:hover {
      border-color: #1976d2;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    }

    .property-card.editing {
      border-color: #4caf50;
      background: #f1f8e9;
    }

    .property-header {
      background: rgba(255, 255, 255, 0.9);
      border-bottom: 1px solid #e0e0e0;
    }

    .property-title-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .property-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .property-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .type-chip {
      font-size: 11px;
      height: 24px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .type-chip.type-text { background: #e3f2fd; color: #1976d2; }
    .type-chip.type-textarea { background: #e0f2fe; color: #0277bd; }
    .type-chip.type-number { background: #f3e5f5; color: #7b1fa2; }
    .type-chip.type-boolean { background: #e8f5e8; color: #388e3c; }
    .type-chip.type-date { background: #fff3e0; color: #f57c00; }
    .type-chip.type-select { background: #fce4ec; color: #c2185b; }

    .required-icon {
      color: #f44336;
      font-size: 18px;
    }

    .property-actions {
      display: flex;
      gap: 8px;
    }

    .property-content {
      padding: 20px;
    }

    .property-readonly {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .property-value-display {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
    }

    .value-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .value-content {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .boolean-value.true { color: #4caf50; }
    .boolean-value.false { color: #f44336; }

    .property-description {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-style: italic;
      font-size: 13px;
    }

    .property-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .half-width {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .value-section {
      flex: 1;
    }

    .boolean-control {
      display: flex;
      align-items: center;
      height: 56px;
      padding: 0 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .boolean-checkbox, .required-checkbox {
      margin: 0;
    }

    .edit-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .empty-icon {
      font-size: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #333;
    }

    .empty-state p {
      margin: 0 0 24px 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .templates-section h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .templates-section p {
      margin: 0 0 24px 0;
      color: #666;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }

    .template-card {
      cursor: pointer;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .template-card:hover {
      border-color: #1976d2;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
      transform: translateY(-2px);
    }

    .template-properties {
      margin-top: 12px;
    }

    .dialog-actions {
      border-top: 1px solid #e0e0e0;
      margin-top: 0;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .actions-left {
      color: #666;
      font-size: 14px;
    }

    .actions-right {
      display: flex;
      gap: 12px;
    }

    @media (max-width: 768px) {
      .custom-property-dialog {
        min-width: 95vw;
        max-width: 95vw;
      }

      .form-row {
        flex-direction: column;
      }

      .quick-actions {
        flex-wrap: wrap;
      }

      .template-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CustomPropertyDialogComponent implements OnInit {
  properties: CustomProperty[] = [];
  editingIndex = -1;
  selectedTabIndex = 0;
  propertyForms: FormGroup[] = [];

  constructor(
    public dialogRef: MatDialogRef<CustomPropertyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CustomPropertyDialogData,
    private fb: FormBuilder,
    private customPropertyService: CustomPropertyService
  ) {
    this.properties = [...(data.existingProperties || [])];
    this.initializeForms();
  }

  ngOnInit(): void {
    // Component initialization
  }

  initializeForms(): void {
    this.propertyForms = this.properties.map(prop => this.createPropertyForm(prop));
  }

  createPropertyForm(property?: CustomProperty): FormGroup {
    const form = this.fb.group({
      title: [property?.title || '', Validators.required],
      type: [property?.type || 'text', Validators.required],
      value: [property?.value || ''],
      required: [property?.required || false],
      description: [property?.description || ''],
      optionsText: [property?.options?.join(', ') || '']
    });

    return form;
  }

  getPropertyForm(index: number): FormGroup {
    return this.propertyForms[index];
  }

  addNewProperty(): void {
    const newProperty: CustomProperty = {
      id: 'prop_' + Date.now(),
      title: '',
      type: 'text',
      value: '',
      required: false
    };

    this.properties.push(newProperty);
    this.propertyForms.push(this.createPropertyForm(newProperty));
    this.editProperty(this.properties.length - 1);
  }

  editProperty(index: number): void {
    this.editingIndex = index;
  }

  saveProperty(index: number): void {
    const form = this.propertyForms[index];
    if (form.valid) {
      const formValue = form.value;
      
      this.properties[index] = {
        ...this.properties[index],
        title: formValue.title,
        type: formValue.type,
        value: formValue.value,
        required: formValue.required,
        description: formValue.description,
        options: formValue.type === 'select' ? 
          formValue.optionsText.split(',').map((s: string) => s.trim()).filter((s: string) => s) : 
          undefined
      };

      this.editingIndex = -1;
    }
  }

  cancelEdit(): void {
    this.editingIndex = -1;
    // Reset form to original values
    if (this.editingIndex >= 0) {
      this.propertyForms[this.editingIndex] = this.createPropertyForm(this.properties[this.editingIndex]);
    }
  }

  removeProperty(index: number): void {
    if (confirm('Are you sure you want to remove this property?')) {
      this.properties.splice(index, 1);
      this.propertyForms.splice(index, 1);
      if (this.editingIndex === index) {
        this.editingIndex = -1;
      } else if (this.editingIndex > index) {
        this.editingIndex--;
      }
    }
  }

  clearAll(): void {
    if (confirm('Are you sure you want to remove all properties?')) {
      this.properties = [];
      this.propertyForms = [];
      this.editingIndex = -1;
    }
  }

  getSelectOptions(index: number): string[] {
    const form = this.propertyForms[index];
    const optionsText = form.get('optionsText')?.value || '';
    return optionsText.split(',').map((s: string) => s.trim()).filter((s: string) => s);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'text': return 'text_fields';
      case 'textarea': return 'notes';
      case 'number': return 'tag';
      case 'boolean': return 'toggle_on';
      case 'date': return 'event';
      case 'select': return 'list';
      default: return 'text_fields';
    }
  }

  getTemplates(): any[] {
    return [
      {
        name: 'Task Properties',
        description: 'Common properties for task elements',
        icon: 'assignment',
        properties: [
          { title: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: false },
          { title: 'Assignee', type: 'text', required: false },
          { title: 'Due Date', type: 'date', required: false },
          { title: 'Estimated Hours', type: 'number', required: false }
        ]
      },
      {
        name: 'Process Properties',
        description: 'Metadata for process elements',
        icon: 'account_tree',
        properties: [
          { title: 'Process Owner', type: 'text', required: true },
          { title: 'Department', type: 'select', options: ['HR', 'Finance', 'IT', 'Operations'], required: false },
          { title: 'SLA Hours', type: 'number', required: false },
          { title: 'Critical Process', type: 'boolean', required: false }
        ]
      },
      {
        name: 'Compliance Properties',
        description: 'Compliance and audit properties',
        icon: 'verified_user',
        properties: [
          { title: 'Compliance Level', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true },
          { title: 'Audit Required', type: 'boolean', required: false },
          { title: 'Regulation', type: 'text', required: false },
          { title: 'Last Review Date', type: 'date', required: false }
        ]
      }
    ];
  }

  loadTemplate(): void {
    this.selectedTabIndex = 1;
  }

  applyTemplate(template: any): void {
    const confirmApply = confirm(`Apply "${template.name}" template? This will add ${template.properties.length} properties.`);
    
    if (confirmApply) {
      template.properties.forEach((prop: any) => {
        const newProperty: CustomProperty = {
          id: 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          title: prop.title,
          type: prop.type,
          value: prop.value || '',
          required: prop.required || false,
          description: prop.description || '',
          options: prop.options
        };

        this.properties.push(newProperty);
        this.propertyForms.push(this.createPropertyForm(newProperty));
      });

      this.selectedTabIndex = 0; // Switch back to properties tab
    }
  }

  isInvalid(): boolean {
    return this.editingIndex >= 0 || this.propertyForms.some(form => form.invalid);
  }

  onSave(): void {
    if (!this.isInvalid()) {
      const result: CustomPropertyDialogResult = {
        properties: this.properties
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}