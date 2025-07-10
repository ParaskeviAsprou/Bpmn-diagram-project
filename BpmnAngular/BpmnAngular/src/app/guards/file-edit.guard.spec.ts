import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { fileEditGuard } from './guards/file-edit.guard';

describe('fileEditGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => fileEditGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
