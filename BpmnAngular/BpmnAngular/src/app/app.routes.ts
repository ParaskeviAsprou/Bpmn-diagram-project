import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { RegisterComponent } from './components/register/register.component';
import { LayoutComponent } from './components/layout/layout.component';
import { BpmnModelerComponent } from './components/bpmn-modeler/bpmn-modeler.component';
import { ListFilesComponent } from './components/list-files/list-files.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    
    // Standalone routes (outside of layout)
    { path: 'dashboard', component: DashboardComponent, },
    { path: 'modeler', component: BpmnModelerComponent,  },
    { path: 'list', component: ListFilesComponent, },
    { path: 'settings', component: SettingsComponent,  },

    
    // Layout-wrapped routes
    {
        path: 'app', 
        component: LayoutComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Default child route
            { path: 'modeler', component: BpmnModelerComponent },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'list', component: ListFilesComponent },
            { path: 'settings', component: SettingsComponent }
        ]
    },
    
    // Wildcard route - MUST be last
    { path: '**', redirectTo: 'login' }
];
