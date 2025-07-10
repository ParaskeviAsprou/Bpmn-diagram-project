import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RbacService } from '../services/rbac.service';
import { PermissionService } from '../services/permission.service';

@Directive({
  selector: '[appHasRole]'
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appHasRole(roles: string | string[]) {
    this.checkPermission(Array.isArray(roles) ? roles : [roles]);
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private rbacService: RbacService
  ) {}

  ngOnInit() {
    // Subscribe to permission changes if needed
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkPermission(roles: string[]) {
    const hasPermission = roles.some(role => this.rbacService.hasRole(role));
    
    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

@Directive({
  selector: '[appCanEditFile]'
})
export class CanEditFileDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appCanEditFile(fileId: number) {
    if (fileId) {
      this.checkFilePermission(fileId);
    }
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkFilePermission(fileId: number) {
    this.permissionService.canEditFile(fileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(canEdit => {
        if (canEdit && !this.hasView) {
          this.viewContainer.createEmbeddedView(this.templateRef);
          this.hasView = true;
        } else if (!canEdit && this.hasView) {
          this.viewContainer.clear();
          this.hasView = false;
        }
      });
  }
}

@Directive({
  selector: '[appCanAssignFile]'
})
export class CanAssignFileDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private hasView = false;

  @Input() set appCanAssignFile(fileId: number) {
    if (fileId) {
      this.checkAssignPermission(fileId);
    }
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAssignPermission(fileId: number) {
    this.permissionService.canAssignFile(fileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(canAssign => {
        if (canAssign && !this.hasView) {
          this.viewContainer.createEmbeddedView(this.templateRef);
          this.hasView = true;
        } else if (!canAssign && this.hasView) {
          this.viewContainer.clear();
          this.hasView = false;
        }
      });
  }
}