import { TestBed } from '@angular/core/testing';
import { RoleManagementService } from './role-management.service';
;

describe('RoleManagementService', () => {
  let service: RoleManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
