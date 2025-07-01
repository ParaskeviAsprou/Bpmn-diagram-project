
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthenticationService } from './authentication.service';

export interface CustomProperty {
  id: string;
  title: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select';
  value: any;
  required: boolean;
  description?: string;
  options?: string[];
  category?: string;
  order?: number;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'required' | 'custom';
  value?: any;
  message?: string;
}

export interface ElementCustomProperties {
  elementId: string;
  elementType?: string;
  properties: CustomProperty[];
  lastModified?: string;
  modifiedBy?: string;
}

export interface PropertyTemplate {
  name: string;
  description: string;
  properties: Omit<CustomProperty, 'id' | 'value'>[];
  applicableElementTypes: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CustomPropertyService {
  private readonly STORAGE_KEY = 'bpmn_custom_properties';
  private propertiesSubject = new BehaviorSubject<ElementCustomProperties[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  private templatesSubject = new BehaviorSubject<PropertyTemplate[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor(private authService: AuthenticationService) {
    this.loadFromStorage();
    this.loadTemplates();
  }

  initialize(): void {
    this.loadFromStorage();
    this.loadTemplates();
  }

  canManageProperties(): boolean {
    return this.authService.canEdit() || this.authService.isAdmin();
  }

  // ============= ELEMENT PROPERTY MANAGEMENT =============

  getElementProperties(elementId: string): CustomProperty[] {
    const allProperties = this.propertiesSubject.value;
    const elementProps = allProperties.find(ep => ep.elementId === elementId);
    return elementProps ? elementProps.properties : [];
  }

  setElementProperties(elementId: string, properties: CustomProperty[], elementType?: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const allProperties = this.propertiesSubject.value;
    const existingIndex = allProperties.findIndex(ep => ep.elementId === elementId);
    
    const elementProperties: ElementCustomProperties = {
      elementId,
      elementType,
      properties,
      lastModified: new Date().toISOString(),
      modifiedBy: this.authService.getCurrentUser()?.username || 'unknown'
    };

    if (existingIndex >= 0) {
      allProperties[existingIndex] = elementProperties;
    } else {
      allProperties.push(elementProperties);
    }

    this.propertiesSubject.next([...allProperties]);
    this.saveToStorage();
  }

  addPropertyToElement(elementId: string, property: Omit<CustomProperty, 'id'>, elementType?: string): CustomProperty {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const newProperty: CustomProperty = {
      ...property,
      id: this.generatePropertyId()
    };

    const existingProperties = this.getElementProperties(elementId);
    const updatedProperties = [...existingProperties, newProperty];
    
    this.setElementProperties(elementId, updatedProperties, elementType);
    return newProperty;
  }

  updateElementProperty(elementId: string, propertyId: string, updates: Partial<CustomProperty>): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const properties = this.getElementProperties(elementId);
    const propertyIndex = properties.findIndex(p => p.id === propertyId);

    if (propertyIndex >= 0) {
      properties[propertyIndex] = { ...properties[propertyIndex], ...updates };
      
      const allProperties = this.propertiesSubject.value;
      const elementPropsIndex = allProperties.findIndex(ep => ep.elementId === elementId);
      
      if (elementPropsIndex >= 0) {
        this.setElementProperties(elementId, properties, allProperties[elementPropsIndex].elementType);
      }
    } else {
      throw new Error('Property not found');
    }
  }

  removeElementProperty(elementId: string, propertyId: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const properties = this.getElementProperties(elementId);
    const filteredProperties = properties.filter(p => p.id !== propertyId);
    
    const allProperties = this.propertiesSubject.value;
    const elementPropsIndex = allProperties.findIndex(ep => ep.elementId === elementId);
    
    if (elementPropsIndex >= 0) {
      this.setElementProperties(elementId, filteredProperties, allProperties[elementPropsIndex].elementType);
    }
  }

  removeAllElementProperties(elementId: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const allProperties = this.propertiesSubject.value;
    const filteredProperties = allProperties.filter(ep => ep.elementId !== elementId);
    this.propertiesSubject.next(filteredProperties);
    this.saveToStorage();
  }

  // ============= BULK OPERATIONS =============

  getAllProperties(): { [elementId: string]: CustomProperty[] } {
    const allProperties = this.propertiesSubject.value;
    const result: { [elementId: string]: CustomProperty[] } = {};
    
    allProperties.forEach(ep => {
      result[ep.elementId] = ep.properties;
    });
    
    return result;
  }

  setAllProperties(propertiesMap: { [elementId: string]: CustomProperty[] }): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const elementProperties: ElementCustomProperties[] = Object.keys(propertiesMap).map(elementId => ({
      elementId,
      properties: propertiesMap[elementId],
      lastModified: new Date().toISOString(),
      modifiedBy: this.authService.getCurrentUser()?.username || 'unknown'
    }));

    this.propertiesSubject.next(elementProperties);
    this.saveToStorage();
  }

  copyElementProperties(sourceElementId: string, targetElementId: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const sourceProperties = this.getElementProperties(sourceElementId);
    if (sourceProperties.length === 0) {
      return;
    }

    // Create new IDs for copied properties
    const copiedProperties = sourceProperties.map(prop => ({
      ...prop,
      id: this.generatePropertyId()
    }));

    this.setElementProperties(targetElementId, copiedProperties);
  }

  // ============= TEMPLATE MANAGEMENT =============

  getTemplates(): PropertyTemplate[] {
    return this.templatesSubject.value;
  }

  addTemplate(template: PropertyTemplate): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage templates');
    }

    const templates = this.templatesSubject.value;
    templates.push(template);
    this.templatesSubject.next([...templates]);
    this.saveTemplates();
  }

  removeTemplate(templateName: string): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage templates');
    }

    const templates = this.templatesSubject.value;
    const filtered = templates.filter(t => t.name !== templateName);
    this.templatesSubject.next(filtered);
    this.saveTemplates();
  }

  applyTemplate(elementId: string, templateName: string, elementType?: string): void {
    const template = this.templatesSubject.value.find(t => t.name === templateName);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if template is applicable to element type
    if (elementType && template.applicableElementTypes.length > 0) {
      const isApplicable = template.applicableElementTypes.some(type => 
        elementType.toLowerCase().includes(type.toLowerCase())
      );
      if (!isApplicable) {
        throw new Error(`Template "${templateName}" is not applicable to element type "${elementType}"`);
      }
    }

    const properties: CustomProperty[] = template.properties.map(prop => ({
      ...prop,
      id: this.generatePropertyId(),
      value: this.getDefaultValueForType(prop.type)
    }));

    this.setElementProperties(elementId, properties, elementType);
  }

  getApplicableTemplates(elementType: string): PropertyTemplate[] {
    return this.templatesSubject.value.filter(template => 
      template.applicableElementTypes.length === 0 || 
      template.applicableElementTypes.some(type => 
        elementType.toLowerCase().includes(type.toLowerCase())
      )
    );
  }

  // ============= VALIDATION =============

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

    // Type-specific validation
    if (property.type === 'number' && property.value !== null && property.value !== undefined) {
      if (isNaN(Number(property.value))) {
        errors.push('Number property must have a valid numeric value');
      }
    }

    if (property.type === 'select' && (!property.options || property.options.length === 0)) {
      errors.push('Select property must have options');
    }

    // Custom validation rules
    if (property.validationRules) {
      for (const rule of property.validationRules) {
        const ruleError = this.validateRule(property.value, rule);
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateRule(value: any, rule: ValidationRule): string | null {
    switch (rule.type) {
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return rule.message || `Value must be at least ${rule.value}`;
        }
        if (typeof value === 'string' && value.length < rule.value) {
          return rule.message || `Must have at least ${rule.value} characters`;
        }
        break;
      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return rule.message || `Value must be at most ${rule.value}`;
        }
        if (typeof value === 'string' && value.length > rule.value) {
          return rule.message || `Must have at most ${rule.value} characters`;
        }
        break;
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return rule.message || 'Value does not match required pattern';
        }
        break;
      case 'required':
        if (value === null || value === undefined || value === '') {
          return rule.message || 'This field is required';
        }
        break;
    }
    return null;
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

  // ============= UTILITY METHODS =============

  hasElementProperties(elementId: string): boolean {
    return this.getElementProperties(elementId).length > 0;
  }

  getElementPropertiesCount(elementId: string): number {
    return this.getElementProperties(elementId).length;
  }

  searchProperties(searchTerm: string): ElementCustomProperties[] {
    const allProperties = this.propertiesSubject.value;
    const searchLower = searchTerm.toLowerCase();
    
    return allProperties.filter(ep => 
      ep.elementId.toLowerCase().includes(searchLower) ||
      ep.properties.some(prop => 
        prop.title.toLowerCase().includes(searchLower) ||
        prop.description?.toLowerCase().includes(searchLower) ||
        String(prop.value).toLowerCase().includes(searchLower)
      )
    );
  }

  getPropertiesByType(propertyType: string): { elementId: string; property: CustomProperty }[] {
    const allProperties = this.propertiesSubject.value;
    const result: { elementId: string; property: CustomProperty }[] = [];
    
    allProperties.forEach(ep => {
      ep.properties.forEach(prop => {
        if (prop.type === propertyType) {
          result.push({ elementId: ep.elementId, property: prop });
        }
      });
    });
    
    return result;
  }

  getStatistics(): {
    totalElements: number;
    totalProperties: number;
    propertiesByType: { [type: string]: number };
    elementsWithRequiredProperties: number;
  } {
    const allProperties = this.propertiesSubject.value;
    const stats = {
      totalElements: allProperties.length,
      totalProperties: 0,
      propertiesByType: {} as { [type: string]: number },
      elementsWithRequiredProperties: 0
    };

    allProperties.forEach(ep => {
      stats.totalProperties += ep.properties.length;
      
      const hasRequired = ep.properties.some(prop => prop.required);
      if (hasRequired) {
        stats.elementsWithRequiredProperties++;
      }

      ep.properties.forEach(prop => {
        stats.propertiesByType[prop.type] = (stats.propertiesByType[prop.type] || 0) + 1;
      });
    });

    return stats;
  }

  // ============= IMPORT/EXPORT =============

  exportProperties(elementId?: string): string {
    if (elementId) {
      const elementProps = this.propertiesSubject.value.find(ep => ep.elementId === elementId);
      return JSON.stringify(elementProps, null, 2);
    } else {
      return JSON.stringify({
        properties: this.propertiesSubject.value,
        templates: this.templatesSubject.value,
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
      
      if (data.properties && Array.isArray(data.properties)) {
        // Full import
        if (replaceExisting) {
          this.propertiesSubject.next(data.properties);
        } else {
          const existing = this.propertiesSubject.value;
          const merged = [...existing];
          
          data.properties.forEach((newEp: ElementCustomProperties) => {
            const existingIndex = merged.findIndex(ep => ep.elementId === newEp.elementId);
            if (existingIndex >= 0) {
              merged[existingIndex] = newEp;
            } else {
              merged.push(newEp);
            }
          });
          
          this.propertiesSubject.next(merged);
        }
        
        if (data.templates && Array.isArray(data.templates)) {
          this.templatesSubject.next(data.templates);
          this.saveTemplates();
        }
      } else if (data.elementId && data.properties) {
        // Single element import
        this.setElementProperties(data.elementId, data.properties, data.elementType);
      } else {
        return false;
      }
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Error importing properties:', error);
      return false;
    }
  }

  clearAllProperties(): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Only administrators can clear all properties');
    }

    this.propertiesSubject.next([]);
    this.saveToStorage();
  }

  // ============= PRIVATE METHODS =============

  private generatePropertyId(): string {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          this.propertiesSubject.next(data);
        }
      } catch (error) {
        console.error('Error loading custom properties from storage:', error);
        this.propertiesSubject.next([]);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = this.propertiesSubject.value;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving custom properties to storage:', error);
      }
    }
  }

  private loadTemplates(): void {
    const defaultTemplates = this.getDefaultTemplates();
    this.templatesSubject.next(defaultTemplates);
  }

  private saveTemplates(): void {
    // Could be saved to localStorage or backend
    // For now, templates are generated on load
  }

  private getDefaultTemplates(): PropertyTemplate[] {
    return [
      {
        name: 'Task Properties',
        description: 'Standard properties for task elements',
        applicableElementTypes: ['task', 'usertask', 'servicetask', 'scripttask'],
        properties: [
          { title: 'Priority', type: 'select', required: false, description: 'Task priority level', options: ['Low', 'Medium', 'High', 'Critical'], category: 'General' },
          { title: 'Assignee', type: 'text', required: false, description: 'Person responsible for this task', category: 'Assignment' },
          { title: 'Due Date', type: 'date', required: false, description: 'Task deadline', category: 'Timing' },
          { title: 'Estimated Hours', type: 'number', required: false, description: 'Estimated time to complete', category: 'Planning' }
        ]
      },
      {
        name: 'Event Properties',
        description: 'Standard properties for event elements',
        applicableElementTypes: ['event', 'startevent', 'endevent', 'intermediateevent'],
        properties: [
          { title: 'Event Type', type: 'select', required: true, description: 'Type of event', options: ['System', 'User', 'Timer', 'Message'], category: 'Configuration' },
          { title: 'Description', type: 'textarea', required: false, description: 'Detailed event description', category: 'Documentation' },
          { title: 'Active', type: 'boolean', required: false, description: 'Whether event is active', category: 'Status' }
        ]
      },
      {
        name: 'Gateway Properties',
        description: 'Standard properties for gateway elements',
        applicableElementTypes: ['gateway', 'exclusivegateway', 'parallelgateway', 'inclusivegateway'],
        properties: [
          { title: 'Condition', type: 'textarea', required: false, description: 'Gateway condition logic', category: 'Logic' },
          { title: 'Default Path', type: 'text', required: false, description: 'Default execution path', category: 'Routing' }
        ]
      }
    ];
  }
}