import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() { }
  showError(message: string): void {
    console.error(`Error: ${message}`);
  }
  showSuccess(message: string): void {
    console.log(`Success: ${message}`);
  }
}
