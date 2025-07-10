import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { fileAccessGuard } from './guards/file-access.guard';

describe('fileAccessGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => fileAccessGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
