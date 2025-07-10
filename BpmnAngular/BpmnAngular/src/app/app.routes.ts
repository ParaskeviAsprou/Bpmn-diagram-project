import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { LayoutComponent } from './components/layout/layout.component';
import { BpmnModelerComponent } from './components/bpmn-modeler/bpmn-modeler.component';
import { SettingsComponent } from './components/settings/settings.component';
import { FileListComponent } from './components/file-list/file-list.component';
import { MyDiagramsComponent } from './components/my-diagrams/my-diagrams.component';
import { RbacGuard, RoleGuard } from './guards/rbac.guard';
import { GroupManagementComponent } from './components/group-management/group-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { RoleManagementComponent } from './components/role-managment/role-managment.component';

export const routes: Routes = [
  // Public routes
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Main application routes with layout
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // Default redirect to dashboard
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      
      // Core application routes
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: {
          title: 'Dashboard',
          breadcrumb: 'Dashboard'
        }
      },
      {
        path: 'modeler',
        component: BpmnModelerComponent,
        data: {
          title: 'BPMN Modeler',
          breadcrumb: 'Modeler'
        }
      },
      {
        path: 'files',
        component: FileListComponent,
        data: {
          title: 'File Management',
          breadcrumb: 'Files'
        }
      },
      {
        path: 'settings',
        component: SettingsComponent,
        data: {
          title: 'Settings',
          breadcrumb: 'Settings'
        }
      },

      // Diagrams section
      {
        path: 'diagrams',
        canActivate: [RbacGuard],
        data: { roles: RoleGuard.anyUser() },
        children: [
          {
            path: '',
            redirectTo: 'my',
            pathMatch: 'full'
          },
          {
            path: 'my',
            component: MyDiagramsComponent,
            data: {
              title: 'My Diagrams',
              breadcrumb: 'My Diagrams'
            }
          }
        ]
      },

      // Admin section
      {
        path: 'admin',
        canActivate: [RbacGuard],
        data: { roles: RoleGuard.adminOnly() },
        children: [
          {
            path: '',
            redirectTo: 'users',
            pathMatch: 'full'
          },
          {
            path: 'users',
            component: UserManagementComponent,
            data: {
              title: 'User Management',
              breadcrumb: 'Users'
            }
          },
          {
            path: 'roles',
            component: RoleManagementComponent,
            data: {
              title: 'Role Management',
              breadcrumb: 'Roles & Hierarchy'
            }
          },
          {
            path: 'groups',
            component: GroupManagementComponent,
            data: {
              title: 'Group Management',
              breadcrumb: 'Groups'
            }
          }
        ]
      }
    ]
  },

  // Legacy routes for backward compatibility (redirect to app layout)
  { path: 'dashboard', redirectTo: '/app/dashboard', pathMatch: 'full' },
  { path: 'modeler', redirectTo: '/app/modeler', pathMatch: 'full' },
  { path: 'list', redirectTo: '/app/files', pathMatch: 'full' },
  { path: 'files', redirectTo: '/app/files', pathMatch: 'full' },
  { path: 'settings', redirectTo: '/app/settings', pathMatch: 'full' },
  { path: 'my-diagrams', redirectTo: '/app/diagrams/my', pathMatch: 'full' },

  // Catch-all route
  { path: '**', redirectTo: '/login' }
];