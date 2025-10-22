import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthenticationService, User } from '../../services/authentication.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  roles?: string[];
  permissions?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() currentUser: User | null = null;

  isCollapsed = false;
  expandedGroups: Set<string> = new Set();

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'icon-dashboard', route: '/dashboard' },
    {
      label: 'Diagrams',
      icon: 'icon-diagrams',
      children: [
        { label: 'All Diagrams', icon: 'icon-list', route: '/files' },
        { label: 'Create New', icon: 'icon-plus', route: '/modeler?new=true', roles: ['ROLE_MODELER', 'ROLE_ADMIN'] },
        { label: 'My Diagrams', icon: 'icon-user', route: '/files?filter=my' }
      ]
    },
    {
      label: 'Administration',
      icon: 'icon-admin',
      roles: ['ROLE_ADMIN'],
      children: [
        { label: 'User Management', icon: 'icon-users', route: '/admin?tab=users' },
        { label: 'Role Management', icon: 'icon-roles', route: '/admin?tab=roles' },
        { label: 'Group Management', icon: 'icon-groups', route: '/admin?tab=groups' },
        { label: 'Diagram Access', icon: 'icon-lock', route: '/admin?tab=diagrams' }
      ]
    },
    { label: 'Profile', icon: 'icon-user', route: '/settings?tab=profile' }
  ];

  constructor(private router: Router, private authService: AuthenticationService) {}

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  hasAccess(item: MenuItem): boolean {
    if (!item.roles?.length) return true;
    if (!this.currentUser) return false;
    return item.roles.some(role =>
      this.currentUser?.roles?.some(userRole => userRole.name === role)
    );
  }

  isActive(route: string): boolean {
    return this.router.url.includes(route.split('?')[0]);
  }

  isExpanded(label: string): boolean {
    return this.expandedGroups.has(label);
  }

  toggleGroup(label: string): void {
    if (this.expandedGroups.has(label)) {
      this.expandedGroups.delete(label);
    } else {
      this.expandedGroups.add(label);
    }
  }

  navigate(route: string): void {
    const [path, queryString] = route.split('?');
    const queryParams: any = {};
    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => (queryParams[key] = value));
    }
    this.router.navigate([path], { queryParams });
  }

  logout(): void {
    // Καθαρίζει το session (αν υπάρχει service auth)
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout successful');
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if backend logout fails, navigate to login
        this.router.navigate(['/login']);
      }
    });
  }
}
