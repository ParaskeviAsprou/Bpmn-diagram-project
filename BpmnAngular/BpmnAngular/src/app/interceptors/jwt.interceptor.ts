import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Skip authentication for auth endpoints
  if (req.url.includes('/api/v1/auth')) {
    return next(req);
  }

  // Get token from localStorage directly (no service injection)
  const token = getTokenFromStorage();
  
  if (!token) {
    console.log('No token found for request to:', req.url);
    // Let the request proceed - the backend will handle unauthorized requests
    return next(req);
  }

  // Add authorization header
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log('JWT Interceptor - Added Bearer token to request:', req.url);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('JWT Interceptor - HTTP Error occurred:', error.status, error.message);

      if (error.status === 401) {
        console.log('JWT Interceptor - 401 error, clearing token and redirecting');
        // Clear token directly without service injection
        clearTokenFromStorage();
        router.navigate(['/login']);
      }
      
      return throwError(() => error);
    })
  );
};

// Helper functions to avoid service injection
function getTokenFromStorage(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }
  return null;
}

function clearTokenFromStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
  }
}