import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    console.log('AuthGuard: Checking access for route:', state.url);
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('AuthGuard: User not authenticated, redirecting to login');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }

    // Check if user token is valid
    return this.authService.ensureValidToken().pipe(
      map((isValid: boolean) => {
        if (!isValid) {
          console.log('AuthGuard: Token invalid, redirecting to login');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
          return false;
        }

        // Check role-based access if required
        const requiredRoles = route.data?.['requiredRoles'] as string[] | undefined;
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
          
          if (!hasRequiredRole) {
            console.log('AuthGuard: User lacks required roles:', requiredRoles);
            
            // Check if user has any role at all
            const currentUser = this.authService.getCurrentUser();
            if (currentUser && currentUser.roles && currentUser.roles.length > 0) {
              // User has roles but not the required ones - redirect to dashboard
              this.router.navigate(['/dashboard']);
            } else {
              // User has no roles - redirect to login
              this.router.navigate(['/login']);
            }
            return false;
          }
        }

        console.log('AuthGuard: Access granted for route:', state.url);
        return true;
      }),
      catchError((error) => {
        console.error('AuthGuard: Error validating token:', error);
        this.router.navigate(['/login'], { 
          queryParams: { returnUrl: state.url } 
        });
        return of(false);
      })
    );
  }
}