import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(route, state);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.checkAuth(childRoute, state);
  }

  private checkAuth(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return false;
        }

        // Check for required roles
        const requiredRoles = route.data['roles'] as string[];
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role => this.authService.hasRole(role));
          if (!hasRequiredRole) {
            this.router.navigate(['/unauthorized']);
            return false;
          }
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user || !this.authService.isAdmin()) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class ModelerGuard implements CanActivate {
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user || !this.authService.canEdit()) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class ViewerGuard implements CanActivate {
  constructor(
    private authService: AuthenticationService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user || !this.authService.canView()) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
        return true;
      })
    );
  }
}