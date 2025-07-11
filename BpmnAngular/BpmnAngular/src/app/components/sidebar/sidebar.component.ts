import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../services/authentication.service';


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
  imports: [CommonModule],
  template: `
    <aside class="app-sidebar" [class.collapsed]="isCollapsed">
      <nav class="sidebar-nav">
        <ul class="nav-list">
          <li *ngFor="let item of menuItems" class="nav-item">
            <div *ngIf="hasAccess(item)" class="nav-link-container">
              <!-- Single menu item -->
              <a *ngIf="!item.children" 
                 class="nav-link" 
                 [class.active]="isActive(item.route!)"
                 (click)="navigate(item.route!)">
                <i [class]="item.icon"></i>
                <span class="nav-text">{{item.label}}</span>
              </a>
              
              <!-- Menu with children -->
              <div *ngIf="item.children" class="nav-group">
                <button class="nav-link nav-toggle" 
                        [class.expanded]="isExpanded(item.label)"
                        (click)="toggleGroup(item.label)">
                  <i [class]="item.icon"></i>
                  <span class="nav-text">{{item.label}}</span>
                  <i class="icon-chevron-right expand-icon" 
                     [class.rotated]="isExpanded(item.label)"></i>
                </button>
                <ul class="nav-submenu" [class.expanded]="isExpanded(item.label)">
                  <li *ngFor="let child of item.children" class="nav-subitem">
                    <a *ngIf="hasAccess(child)" 
                       class="nav-sublink" 
                       [class.active]="isActive(child.route!)"
                       (click)="navigate(child.route!)">
                      <i [class]="child.icon"></i>
                      <span class="nav-text">{{child.label}}</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </aside>
  `,
  styles: [`
    .app-sidebar {
      position: fixed;
      left: 0;
      top: 60px;
      width: 250px;
      height: calc(100vh - 60px);
      background: #2c3e50;
      color: white;
      overflow-y: auto;
      transition: all 0.3s ease;
      z-index: 999;
    }

    .app-sidebar.collapsed {
      width: 60px;
    }

    .sidebar-nav {
      padding: 20px 0;
    }

    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-item {
      margin-bottom: 2px;
    }

    .nav-link-container {
      width: 100%;
    }

    .nav-link, .nav-toggle {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 20px;
      color: #bdc3c7;
      text-decoration: none;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .nav-link:hover, .nav-toggle:hover {
      background: #34495e;
      color: white;
    }

    .nav-link.active {
      background: #3498db;
      color: white;
    }

    .nav-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-sidebar.collapsed .nav-text {
      display: none;
    }

    .expand-icon {
      margin-left: auto;
      transition: transform 0.3s ease;
    }

    .expand-icon.rotated {
      transform: rotate(90deg);
    }

    .app-sidebar.collapsed .expand-icon {
      display: none;
    }

    .nav-submenu {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      background: #1a252f;
    }

    .nav-submenu.expanded {
      max-height: 300px;
    }

    .nav-subitem {
      border-bottom: 1px solid #34495e;
    }

    .nav-sublink {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 10px 20px 10px 50px;
      color: #95a5a6;
      text-decoration: none;
      transition: all 0.3s ease;
      font-size: 13px;
    }

    .nav-sublink:hover {
      background: #34495e;
      color: white;
    }

    .nav-sublink.active {
      background: #2980b9;
      color: white;
    }

    .app-sidebar.collapsed .nav-submenu {
      display: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .app-sidebar {
        transform: translateX(-100%);
      }
      
      .app-sidebar.mobile-open {
        transform: translateX(0);
      }
    }
  `]
})
export class SidebarComponent {
  @Input() currentUser: User | null = null;
  
  isCollapsed = false;
  expandedGroups: Set<string> = new Set();
  
  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'icon-dashboard',
      route: '/dashboard'
    },
    {
      label: 'Diagrams',
      icon: 'icon-diagrams',
      children: [
        {
          label: 'All Diagrams',
          icon: 'icon-list',
          route: '/diagrams'
        },
        {
          label: 'Create New',
          icon: 'icon-plus',
          route: '/diagrams/create',
          roles: ['ROLE_MODELER', 'ROLE_ADMIN']
        },
        {
          label: 'My Diagrams',
          icon: 'icon-user',
          route: '/diagrams/my'
        }
      ]
    },
    {
      label: 'Administration',
      icon: 'icon-admin',
      roles: ['ROLE_ADMIN'],
      children: [
        {
          label: 'User Management',
          icon: 'icon-users',
          route: '/admin?tab=users',
          roles: ['ROLE_ADMIN']
        },
        {
          label: 'Role Management',
          icon: 'icon-roles',
          route: '/admin?tab=roles',
          roles: ['ROLE_ADMIN']
        },
        {
          label: 'Group Management',
          icon: 'icon-groups',
          route: '/admin?tab=groups',
          roles: ['ROLE_ADMIN']
        },
        {
          label: 'Diagram Access',
          icon: 'icon-lock',
          route: '/admin?tab=diagrams',
          roles: ['ROLE_ADMIN']
        }
      ]
    },
    {
      label: 'Profile',
      icon: 'icon-user',
      route: '/profile'
    }
  ];

  constructor(private router: Router) {}

  hasAccess(item: MenuItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    
    if (!this.currentUser) {
      return false;
    }
    
    return item.roles.some(role => 
      this.currentUser?.roles?.some(userRole => userRole.name === role)
    );
  }

  isActive(route: string): boolean {
    return this.router.url.includes(route.split('?')[0]);
  }

  isExpanded(groupLabel: string): boolean {
    return this.expandedGroups.has(groupLabel);
  }

  toggleGroup(groupLabel: string): void {
    if (this.expandedGroups.has(groupLabel)) {
      this.expandedGroups.delete(groupLabel);
    } else {
      this.expandedGroups.add(groupLabel);
    }
  }

  navigate(route: string): void {
    const [path, queryString] = route.split('?');
    const queryParams: any = {};
    
    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        queryParams[key] = value;
      });
    }
    
    this.router.navigate([path], { queryParams });
  }
}