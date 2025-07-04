
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  
  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('Dashboard: User not authenticated, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Dashboard: User authenticated, proceeding...');
  }

  navigateToModeler(): void {
    console.log('Dashboard: Navigating to modeler...');
    if (!this.authService.isAuthenticated()) {
      console.error('Dashboard: User not authenticated for modeler access');
      this.router.navigate(['/login']);
      return;
    }
    if (!this.authService.canEdit()) {
      console.warn('Dashboard: User does not have edit permissions');
  
      this.navigateToFileList();
      return;
    }

    this.router.navigateByUrl('/modeler');
  }

  navigateToFileList(): void {
    console.log('Dashboard: Navigating to file list...');
    if (!this.authService.isAuthenticated()) {
      console.error('Dashboard: User not authenticated for file list access');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.authService.canView()) {
      console.error('Dashboard: User does not have view permissions');
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/app/list']);
  }

  navigateToSettings(): void {
    console.log('Dashboard: Navigating to settings...');
    

    if (!this.authService.isAuthenticated()) {
      console.error('Dashboard: User not authenticated for settings access');
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigateByUrl('/app/settings');
  }

  // =================== GETTER METHODS ===================

  get currentUserName(): string {
    const user = this.authService.getCurrentUser();
    if (user && user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    } else if (user && user.firstname) {
      return user.firstname;
    } else if (user && user.username) {
      return user.username;
    }
    return 'User';
  }

  get currentUserRole(): string {
    if (this.authService.hasRole('ROLE_ADMIN')) return 'Administrator';
    if (this.authService.hasRole('ROLE_MODELER')) return 'Modeler';
    if (this.authService.hasRole('ROLE_VIEWER')) return 'Viewer';
    return 'Unknown';
  }

  get canCreateDiagrams(): boolean {
    return this.authService.canEdit();
  }

  get canViewFiles(): boolean {
    return this.authService.canView();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}