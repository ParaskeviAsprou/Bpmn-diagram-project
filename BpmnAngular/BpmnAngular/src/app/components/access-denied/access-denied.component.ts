import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';
import { UserService } from '../../services/user.service';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatChip } from '@angular/material/chips';
import { BrowserModule } from '@angular/platform-browser';
import { MatLine } from '@angular/material/core';
import { MatList, MatListItem } from '@angular/material/list';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [
    MatIcon,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatChip,
    BrowserModule,
    MatList,
    MatListItem],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.css'
})
export class AccessDeniedComponent implements OnInit {
  currentUser: any;

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  getUserDisplayName(): string {
    return this.currentUser ? this.userService.getUserDisplayName(this.currentUser) : 'Unknown User';
  }

  getRoleColor(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'warn';
    if (roleName.includes('MODELER')) return 'accent';
    return 'primary';
  }

  canCreateDiagrams(): boolean {
    return this.currentUser && this.userService.hasAnyRole(this.currentUser, ['ROLE_MODELER', 'ROLE_ADMIN']);
  }

  goBack(): void {
    window.history.back();
  }

  goToMyDiagrams(): void {
    this.router.navigate(['/my-diagrams']);
  }

  createNewDiagram(): void {
    if (this.canCreateDiagrams()) {
      this.router.navigate(['/editor/new']);
    }
  }

  contactAdmin(): void {
    // This could open a contact form, email client, or help system
    // For now, we'll show an alert with contact information
    alert('Please contact your system administrator for access to additional resources.\n\nEmail: admin@yourcompany.com\nPhone: (555) 123-4567');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}