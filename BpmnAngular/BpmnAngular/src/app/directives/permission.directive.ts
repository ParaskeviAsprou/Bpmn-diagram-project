import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RbacService } from '../services/rbac.service';
import { AuthenticationService } from '../services/authentication.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class PermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @Input() set appHasPermission(permission: string) {
    this.requiredPermission = permission;
    this.updateView();
  }

  private requiredPermission: string = '';

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (this.hasPermission()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private hasPermission(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    // Define permission mappings
    const permissionMap: { [key: string]: string[] } = {
      'manage-roles': ['ROLE_ADMIN'],
      'manage-users': ['ROLE_ADMIN'],
      'create-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'edit-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'view-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER', 'ROLE_VIEWER'],
      'assign-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'manage-groups': ['ROLE_ADMIN']
    };

    const allowedRoles = permissionMap[this.requiredPermission] || [];
    return this.authService.hasAnyRole(allowedRoles);
  }
}