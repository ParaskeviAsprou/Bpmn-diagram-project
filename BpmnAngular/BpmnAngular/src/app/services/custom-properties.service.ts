import { Injectable } from '@angular/core';
import { AuthenticationService } from './authentication.service';

export interface CustomProperty {
  id: string;
  title: string;  // Changed from 'name' to 'title' for consistency with dialog
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';
  value: any;
  required: boolean;
  description?: string;
  options?: string[];
  category?: string;
  order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomPropertyService {
  private properties: Map<string, CustomProperty[]> = new Map();

  constructor(private authService: AuthenticationService) { }

  initialize(): void {
    // Initialize the service
  }

  canManageProperties(): boolean {
    return this.authService.canEdit() || this.authService.isAdmin();
  }

  // =================== ELEMENT PROPERTY MANAGEMENT ===================

  getElementProperties(elementId: string): CustomProperty[] {
    const allProperties = this.properties.get(elementId);
    
    if (!Array.isArray(allProperties)) {
      return [];
    }
    
    return allProperties;
  }

  setElementProperties(elementId: string, properties: CustomProperty[]): void {
    if (!Array.isArray(properties)) {
      properties = [];
    }
    
    this.properties.set(elementId, [...properties]);
  }

  addProperty(elementId: string, property: CustomProperty): void {
    const existing = this.getElementProperties(elementId);
    const updated = [...existing, property];
    this.setElementProperties(elementId, updated);
  }

  updateProperty(elementId: string, propertyTitle: string, newValue: string): void {
    const properties = this.getElementProperties(elementId);
    const propertyIndex = properties.findIndex(p => p.title === propertyTitle);
    
    if (propertyIndex !== -1) {
      properties[propertyIndex].value = newValue;
      this.setElementProperties(elementId, properties);
    }
  }

  removeProperty(elementId: string, propertyTitle: string): void {
    const properties = this.getElementProperties(elementId);
    const filtered = properties.filter(p => p.title !== propertyTitle);
    this.setElementProperties(elementId, filtered);
  }

  removeAllElementProperties(elementId: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    this.properties.delete(elementId);
  }

  // =================== BULK OPERATIONS ===================

  getAllProperties(): Map<string, CustomProperty[]> {
    return new Map(this.properties);
  }

  clearAllProperties(): void {
    this.properties.clear();
  }

  copyElementProperties(sourceElementId: string, targetElementId: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const sourceProperties = this.getElementProperties(sourceElementId);
    if (sourceProperties.length === 0) {
      return;
    }

    const copiedProperties = sourceProperties.map(prop => ({
      ...prop,
      id: this.generatePropertyId()
    }));

    this.setElementProperties(targetElementId, copiedProperties);
  }

  // =================== VALIDATION ===================

  validateProperty(property: CustomProperty): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!property.title?.trim()) {
      errors.push('Property title is required');
    }

    if (!property.type) {
      errors.push('Property type is required');
    }

    if (property.required && (property.value === null || property.value === undefined || property.value === '')) {
      errors.push('Required property must have a value');
    }

    if (property.type === 'number' && property.value !== null && property.value !== undefined) {
      if (isNaN(Number(property.value))) {
        errors.push('Number property must have a valid numeric value');
      }
    }

    if (property.type === 'select' && (!property.options || property.options.length === 0)) {
      errors.push('Select property must have options');
    }

    return { valid: errors.length === 0, errors };
  }

  validateAllElementProperties(elementId: string): { valid: boolean; errors: { [propertyId: string]: string[] } } {
    const properties = this.getElementProperties(elementId);
    const errors: { [propertyId: string]: string[] } = {};
    let valid = true;

    properties.forEach(property => {
      const validation = this.validateProperty(property);
      if (!validation.valid) {
        errors[property.id] = validation.errors;
        valid = false;
      }
    });

    return { valid, errors };
  }

  // =================== UTILITY METHODS ===================

  hasElementProperties(elementId: string): boolean {
    return this.getElementProperties(elementId).length > 0;
  }

  getElementPropertiesCount(elementId: string): number {
    return this.getElementProperties(elementId).length;
  }

  // =================== IMPORT/EXPORT ===================

  exportProperties(elementId?: string): string {
    if (elementId) {
      const elementProps = this.getElementProperties(elementId);
      return JSON.stringify({ elementId, properties: elementProps }, null, 2);
    } else {
      const allProperties: { [key: string]: CustomProperty[] } = {};
      this.properties.forEach((value, key) => {
        allProperties[key] = value;
      });
      return JSON.stringify({
        properties: allProperties,
        exportedAt: new Date().toISOString()
      }, null, 2);
    }
  }

  importProperties(jsonData: string, replaceExisting = false): boolean {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    try {
      const data = JSON.parse(jsonData);
      
      if (data.properties) {
        if (replaceExisting) {
          this.properties.clear();
        }
        
        Object.keys(data.properties).forEach(elementId => {
          this.setElementProperties(elementId, data.properties[elementId]);
        });
      } else if (data.elementId && data.properties) {
        this.setElementProperties(data.elementId, data.properties);
      } else {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error importing properties:', error);
      return false;
    }
  }

  // =================== PRIVATE METHODS ===================

  private generatePropertyId(): string {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // =================== DEFAULT TEMPLATES ===================

  getDefaultTemplates(): any {
    return {
      'Task Properties': [
        { title: 'Priority', type: 'select', required: false, description: 'Task priority level', options: ['Low', 'Medium', 'High', 'Critical'], category: 'General' },
        { title: 'Assignee', type: 'text', required: false, description: 'Person responsible for this task', category: 'Assignment' },
        { title: 'Due Date', type: 'date', required: false, description: 'Task deadline', category: 'Timing' },
        { title: 'Estimated Hours', type: 'number', required: false, description: 'Estimated time to complete', category: 'Planning' }
      ],
      'Event Properties': [
        { title: 'Event Type', type: 'select', required: true, description: 'Type of event', options: ['System', 'User', 'Timer', 'Message'], category: 'Configuration' },
        { title: 'Description', type: 'textarea', required: false, description: 'Detailed event description', category: 'Documentation' },
        { title: 'Active', type: 'boolean', required: false, description: 'Whether event is active', category: 'Status' }
      ],
      'Gateway Properties': [
        { title: 'Condition', type: 'textarea', required: false, description: 'Gateway condition logic', category: 'Logic' },
        { title: 'Default Path', type: 'text', required: false, description: 'Default execution path', category: 'Routing' }
      ]
    };
  }
}