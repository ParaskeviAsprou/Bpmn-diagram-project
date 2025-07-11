import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { modelerGuard } from './guards/modeler.guard';

describe('modelerGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => modelerGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
