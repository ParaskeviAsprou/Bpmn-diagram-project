import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class PermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appHasPermission(permission: string) {
    this.checkPermission(permission);
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    // Subscribe to user changes to re-check permissions
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Re-check permission when user changes
        // You would need to store the original permission
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkPermission(permission: string): void {
    const hasPermission = this.hasPermissionToPerformAction(permission);

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private hasPermissionToPerformAction(permission: string): boolean {
    // Map permissions to roles
    const permissionMap: { [key: string]: string[] } = {
      'view-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER', 'ROLE_VIEWER'],
      'edit-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'create-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'assign-diagrams': ['ROLE_ADMIN', 'ROLE_MODELER'],
      'manage-users': ['ROLE_ADMIN'],
      'delete-diagrams': ['ROLE_ADMIN']
    };

    const allowedRoles = permissionMap[permission] || [];
    return this.authService.hasAnyRole(allowedRoles);
  }
}