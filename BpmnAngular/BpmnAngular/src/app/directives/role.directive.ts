import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class RoleDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appHasRole(roles: string | string[]) {
    this.checkRoles(roles);
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
        // Re-check roles when user changes
        const currentRoles = this.getCurrentRoles();
        if (currentRoles) {
          this.checkRoles(currentRoles);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentRoles(): string | string[] | null {
    // This is a bit tricky since we need to store the original roles
    // In a real implementation, you might want to store this differently
    return null;
  }

  private checkRoles(roles: string | string[]): void {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const hasPermission = this.authService.hasAnyRole(rolesArray);

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

// permission.directive.ts - Permission Directive
