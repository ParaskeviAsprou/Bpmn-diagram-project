import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { BpmnModelerComponent } from './components/bpmn-modeler/bpmn-modeler.component';
import { SettingsComponent } from './components/settings/settings.component';
import { FileListComponent } from './components/file-list/file-list.component';
import { BpmnDiagramViewerComponent } from './components/bpmn-diagram-viewer/bpmn-diagram-viewer.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';

export const routes: Routes = [

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'Dashboard',
      breadcrumb: 'Dashboard'
    }
  },
  {
    path: 'modeler',
    component: BpmnModelerComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'BPMN Modeler',
      breadcrumb: 'Modeler',
      requiredRoles: ['ROLE_ADMIN', 'ROLE_MODELER', 'ROLE_VIEWER']
    }
  },
  {
    path: 'files',
    component: FileListComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'File Management',
      breadcrumb: 'Files'
    }
  },
  {
    path: 'viewer/:id',
    component: BpmnDiagramViewerComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'Diagram Viewer',
      breadcrumb: 'Viewer'
    }
  },
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'Administration', 
      breadcrumb: 'Admin',
      requiredRoles: ['ROLE_ADMIN']
    }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard],
    data: { 
      title: 'Settings',
      breadcrumb: 'Settings'
    }
  },

  // Legacy route redirects for backward compatibility
  { path: 'list', redirectTo: '/files', pathMatch: 'full' },
  { path: 'my-diagrams', redirectTo: '/files', pathMatch: 'full' },

  // Catch-all route - redirect to login
  { path: '**', redirectTo: '/login' }
];