import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthenticationService } from '../services/authentication.service';
import { RbacService } from '../services/rbac.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthenticationService,
    private rbacService: RbacService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (!this.rbacService.isAdmin()) {
      this.router.navigate(['/access-denied']);
      return false;
    }

    return true;
  }
}