// src/app/guards/rbac.guard.ts
import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';
import { DiagramService } from '../services/diagram-assgnment.service';

export interface RoleRequirement {
  roles?: string[];
  anyRole?: boolean; 
  permissions?: string[];
  requireAdmin?: boolean;
  requireModeler?: boolean;
  requireViewer?: boolean;
  checkDiagramAccess?: boolean;
  requiredPermission?: 'VIEW' | 'EDIT' | 'ADMIN';
}

@Injectable({
  providedIn: 'root'
})
export class RbacGuard implements CanActivate, CanActivateChild {

  constructor(
    private authService: AuthenticationService,
    private diagramAssignmentService: DiagramService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAccess(route, state);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAccess(route, state);
  }

  private checkAccess(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return false;
    }

    // Get role requirements from route data
    const roleReq: RoleRequirement = route.data['roles'] || {};
    
    // Special case: Admin override
    if (this.hasRole(currentUser, 'ROLE_ADMIN') && !roleReq.requireAdmin === false) {
      return true;
    }

    // Check specific role requirements
    if (roleReq.requireAdmin && !this.hasRole(currentUser, 'ROLE_ADMIN')) {
      this.handleAccessDenied();
      return false;
    }

    if (roleReq.requireModeler && !this.hasAnyRole(currentUser, ['ROLE_MODELER', 'ROLE_ADMIN'])) {
      this.handleAccessDenied();
      return false;
    }

    if (roleReq.requireViewer && !this.hasAnyRole(currentUser, ['ROLE_VIEWER', 'ROLE_MODELER', 'ROLE_ADMIN'])) {
      this.handleAccessDenied();
      return false;
    }

    // Check role list requirements
    if (roleReq.roles && roleReq.roles.length > 0) {
      const hasRequiredRoles = roleReq.anyRole 
        ? this.hasAnyRole(currentUser, roleReq.roles)
        : this.hasAllRoles(currentUser, roleReq.roles);
      
      if (!hasRequiredRoles) {
        this.handleAccessDenied();
        return false;
      }
    }

    // Check diagram-specific access
    const diagramId = route.params['id'] || route.params['diagramId'];
    if (diagramId && route.data['checkDiagramAccess']) {
      return this.checkDiagramAccess(diagramId, route.data['requiredPermission'] || 'VIEW');
    }

    return true;
  }

  private checkDiagramAccess(diagramId: string, requiredPermission: string): Observable<boolean> {
    return this.diagramAssignmentService.checkDiagramAccess(parseInt(diagramId)).pipe(
      map(accessInfo => {
        switch (requiredPermission) {
          case 'VIEW':
            return accessInfo.canView;
          case 'EDIT':
            return accessInfo.canEdit;
          case 'ADMIN':
            return accessInfo.canAssign;
          default:
            return accessInfo.canView;
        }
      }),
      catchError(error => {
        console.error('Error checking diagram access:', error);
        this.handleAccessDenied();
        return of(false);
      })
    );
  }

  private hasRole(user: any, role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.some((r: any) => r.name === role);
  }

  private hasAnyRole(user: any, roles: string[]): boolean {
    return roles.some(role => this.hasRole(user, role));
  }

  private hasAllRoles(user: any, roles: string[]): boolean {
    return roles.every(role => this.hasRole(user, role));
  }

  private handleAccessDenied(): void {
    // You can customize this based on your app's design
    this.router.navigate(['/access-denied']);
    
    // Or show a dialog/notification
    // this.snackBar.open('You do not have permission to access this resource', 'Close', {
    //   duration: 5000,
    //   panelClass: 'error-snackbar'
    // });
  }
}

// Helper functions for route configuration
export const RoleGuard = {
  // Admin only access
  adminOnly(): RoleRequirement {
    return { requireAdmin: true };
  },

  // Modeler and Admin access
  modelerAndAdmin(): RoleRequirement {
    return { roles: ['ROLE_MODELER', 'ROLE_ADMIN'], anyRole: true };
  },

  // Any authenticated user
  anyUser(): RoleRequirement {
    return { requireViewer: true };
  },

  // Specific roles
  roles(roles: string[], anyRole = true): RoleRequirement {
    return { roles, anyRole };
  },

  // Diagram access requirements
  diagramAccess(permission: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW'): RoleRequirement {
    return { 
      checkDiagramAccess: true, 
      requiredPermission: permission,
      requireViewer: true 
    };
  },

  // Combined requirements
  adminOrDiagramOwner(permission: 'VIEW' | 'EDIT' | 'ADMIN' = 'VIEW'): RoleRequirement {
    return {
      checkDiagramAccess: true,
      requiredPermission: permission,
      requireViewer: true
    };
  }
};