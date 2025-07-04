import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { LayoutComponent } from './components/layout/layout.component';
import { BpmnModelerComponent } from './components/bpmn-modeler/bpmn-modeler.component';
import { SettingsComponent } from './components/settings/settings.component';
import { FileListComponent } from './components/file-list/file-list.component';

export const routes: Routes = [
  // Public routes (no authentication required)
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // ΔΙΟΡΘΩΣΗ: Standalone protected routes (με AuthGuard)
  { 
    path: 'dashboard', 
    component: DashboardComponent, 
  },
  { 
    path: 'modeler', 
    component: BpmnModelerComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'list', 
    component: FileListComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'settings', 
    component: SettingsComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'files', 
    component: FileListComponent, 
    canActivate: [AuthGuard]
  },

  {
    path: 'app', 
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, 
      { 
        path: 'modeler', 
        component: BpmnModelerComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'list', 
        component: FileListComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'settings', 
        component: SettingsComponent,
        canActivate: [AuthGuard]
      },

      { 
        path: 'files', 
        component: FileListComponent,
        canActivate: [AuthGuard]
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];