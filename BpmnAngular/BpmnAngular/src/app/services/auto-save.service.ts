import { Injectable } from '@angular/core';
import { BehaviorSubject, debounceTime, filter } from 'rxjs';

export interface AutosaveData {
  bpmnXml: string;
  properties: any;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AutosaveService {
  private saveSubject = new BehaviorSubject<AutosaveData | null>(null);
  private isEnabled = true;
  private saveInterval = 5000; // 5 seconds

  constructor() {
    // Set up autosave with debouncing
    this.saveSubject.pipe(
      filter(data => data !== null && this.isEnabled),
      debounceTime(this.saveInterval)
    ).subscribe(data => {
      if (data) {
        this.performSave(data);
      }
    });
  }

  enableAutosave(): void {
    this.isEnabled = true;
  }

  disableAutosave(): void {
    this.isEnabled = false;
  }

  requestSave(data: AutosaveData): void {
    if (this.isEnabled) {
      this.saveSubject.next(data);
    }
  }

  forceSave(data: AutosaveData): void {
    this.performSave(data);
  }

  private performSave(data: AutosaveData): void {
    try {
      const saveKey = `bpmn_autosave_${Date.now()}`;
      localStorage.setItem(saveKey, JSON.stringify(data));
      
      // Keep only the last 5 autosaves
      this.cleanupOldSaves();
      
      console.log('Autosaved successfully');
    } catch (error) {
      console.error('Autosave failed:', error);
    }
  }

  private cleanupOldSaves(): void {
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('bpmn_autosave_'))
      .sort()
      .reverse();

    if (keys.length > 5) {
      keys.slice(5).forEach(key => localStorage.removeItem(key));
    }
  }

  getLastAutosave(): AutosaveData | null {
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('bpmn_autosave_'))
      .sort()
      .reverse();

    if (keys.length > 0) {
      const data = localStorage.getItem(keys[0]);
      return data ? JSON.parse(data) : null;
    }

    return null;
  }
}