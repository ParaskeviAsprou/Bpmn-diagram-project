import { CanActivate, CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})
export class ModelerGuard implements CanActivate {
  constructor(private authService: AuthenticationService, private router: Router) {}

  canActivate(): boolean {
    if (!this.authService.hasAnyRole(['ROLE_ADMIN', 'ROLE_MODELER'])) {
      this.router.navigate(['/unauthorized']);
      return false;
    }
    return true;
  }
}