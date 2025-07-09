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
import { RoleManagementComponent } from './components/role-managment/role-managment.component';
import { UserManagementComponent } from './components/user-management/user-management.component';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },


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
      },
      {
        path: '',
        redirectTo: '/my-diagrams',
        pathMatch: 'full'
      },
      {
        path: 'diagrams',
        canActivate: [RbacGuard],
        data: { roles: RoleGuard.anyUser() },
        children: [
          {
            path: '',
            redirectTo: '/my-diagrams',
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
      },
    ]
  },
  {
    path: 'my-diagrams',
    component: MyDiagramsComponent,
    canActivate: [RbacGuard],
    data: {
      roles: RoleGuard.anyUser(),
      title: 'My Diagrams',
      breadcrumb: 'My Diagrams'
    }
  },
  { path: '**', redirectTo: 'login' }
];