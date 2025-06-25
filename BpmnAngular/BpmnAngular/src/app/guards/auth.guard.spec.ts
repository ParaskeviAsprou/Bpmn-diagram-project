import { TestBed } from '@angular/core/testing';
import { AuthGuard } from './auth.guard';
import { Router } from '@angular/router';
import { LocalStorageService } from '../services/local-storage.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let storageServiceSpy: jasmine.SpyObj<LocalStorageService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    storageServiceSpy = jasmine.createSpyObj('LocalStorageService', ['get']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: LocalStorageService, useValue: storageServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow activation when token is present', () => {
    storageServiceSpy.get.and.returnValue('valid-jwt-token');
    expect(guard.canActivate()).toBeTrue();
  });

  it('should prevent activation and redirect to login when token is missing', () => {
    storageServiceSpy.get.and.returnValue(null);
    expect(guard.canActivate()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
