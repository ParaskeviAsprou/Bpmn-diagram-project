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
}

export interface ElementCustomProperties {
  elementId: string;
  properties: CustomProperty[];
}

@Injectable({
  providedIn: 'root'
})
export class CustomePropertyService {
  private readonly STORAGE_KEY = 'bpmn_custom_properties';
  private propertiesSubject = new BehaviorSubject<ElementCustomProperties[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  constructor(private authService: AuthenticationService) {
    this.loadFromStorage();
  }

  initialize(): void {
    this.loadFromStorage();
  }

  canManageProperties(): boolean {
    return this.authService.canEdit() || this.authService.isAdmin();
  }

  getElementProperties(elementId: string): CustomProperty[] {
    const allProperties = this.propertiesSubject.value;
    const elementProps = allProperties.find(ep => ep.elementId === elementId);
    return elementProps ? elementProps.properties : [];
  }

  setElementProperties(elementId: string, properties: CustomProperty[]): void {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const allProperties = this.propertiesSubject.value;
    const existingIndex = allProperties.findIndex(ep => ep.elementId === elementId);

    if (existingIndex >= 0) {
      allProperties[existingIndex] = { elementId, properties };
    } else {
      allProperties.push({ elementId, properties });
    }

    this.propertiesSubject.next([...allProperties]);
    this.saveToStorage();
  }

  addPropertyToElement(elementId: string, property: Omit<CustomProperty, 'id'>): CustomProperty {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    const newProperty: CustomProperty = {
      ...property,
      id: this.generatePropertyId()
    };

    const existingProperties = this.getElementProperties(elementId);
    const updatedProperties = [...existingProperties, newProperty];
    
    this.setElementProperties(elementId, updatedProperties);
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
      this.setElementProperties(elementId, properties);
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
    this.setElementProperties(elementId, filteredProperties);
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

  hasElementProperties(elementId: string): boolean {
    return this.getElementProperties(elementId).length > 0;
  }

  getElementPropertiesCount(elementId: string): number {
    return this.getElementProperties(elementId).length;
  }

  exportProperties(elementId?: string): string {
    if (elementId) {
      const properties = this.getElementProperties(elementId);
      return JSON.stringify({ elementId, properties }, null, 2);
    } else {
      return JSON.stringify(this.propertiesSubject.value, null, 2);
    }
  }

  importProperties(jsonData: string): boolean {
    if (!this.canManageProperties()) {
      throw new Error('Insufficient permissions to manage custom properties');
    }

    try {
      const data = JSON.parse(jsonData);
      
      if (Array.isArray(data)) {
        this.propertiesSubject.next(data);
      } else if (data.elementId && data.properties) {
        this.setElementProperties(data.elementId, data.properties);
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

  private generatePropertyId(): string {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  getDefaultTemplates(): { [name: string]: Omit<CustomProperty, 'id'>[] } {
    return {
      'Task Properties': [
        { title: 'Priority', type: 'select', value: 'Medium', required: false, description: 'Task priority level', options: ['Low', 'Medium', 'High', 'Critical'] },
        { title: 'Assignee', type: 'text', value: '', required: false, description: 'Person responsible for this task' },
        { title: 'Due Date', type: 'date', value: null, required: false, description: 'Task deadline' },
        { title: 'Estimated Hours', type: 'number', value: 0, required: false, description: 'Estimated time to complete' }
      ],
      'Event Properties': [
        { title: 'Event Type', type: 'select', value: 'System', required: true, description: 'Type of event', options: ['System', 'User', 'Timer', 'Message'] },
        { title: 'Description', type: 'textarea', value: '', required: false, description: 'Detailed event description' },
        { title: 'Active', type: 'boolean', value: true, required: false, description: 'Whether event is active' }
      ],
      'Gateway Properties': [
        { title: 'Condition', type: 'textarea', value: '', required: false, description: 'Gateway condition logic' },
        { title: 'Default Path', type: 'text', value: '', required: false, description: 'Default execution path' }
      ]
    };
  }
}