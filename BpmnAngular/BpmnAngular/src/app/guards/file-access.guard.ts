import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { PermissionService } from '../services/permission.service';
import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class FileAccessGuard implements CanActivate {
  constructor(
    private authService: AuthenticationService,
    private permissionService: PermissionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    const fileId = route.params['id'];
    if (!fileId) {
      return of(false);
    }

    return this.permissionService.canViewFile(+fileId).pipe(
      map(canView => {
        if (!canView) {
          this.router.navigate(['/access-denied']);
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.router.navigate(['/access-denied']);
        return of(false);
      })
    );
  }
}