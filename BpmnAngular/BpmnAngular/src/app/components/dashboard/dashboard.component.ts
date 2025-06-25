// dashboard.component.ts
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule,RouterModule],
  templateUrl:  './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  constructor(private router: Router) {}
  
  navigateToModeler(): void {
    this.router.navigateByUrl('/modeler');
  }
  navigateToFileList(): void {
    this.router.navigateByUrl('/app/list');
  }
   navigateToSettings(): void {
    this.router.navigateByUrl('/app/settings');
  }
}