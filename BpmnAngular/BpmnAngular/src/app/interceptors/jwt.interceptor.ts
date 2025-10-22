// ΔΙΟΡΘΩΜΕΝΟ JWT Interceptor με σωστό token key management

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

  // Get token from localStorage directly (using consistent key)
  const token = getTokenFromStorage();
  
  if (!token) {
    console.log('No token found for request to:', req.url);
    // Let the request proceed - the backend will handle unauthorized requests
    return next(req);
  }

  // Έλεγχος αν το token είναι έγκυρο πριν το προσθέσουμε
  if (isTokenExpired(token)) {
    console.log('Token is expired, clearing storage and redirecting');
    clearTokenFromStorage();
    router.navigate(['/login'], { 
      queryParams: { 
        message: 'Your session has expired. Please log in again.' 
      } 
    });
    return throwError(() => new Error('Token expired'));
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
        
        // Show user-friendly message
        const errorMessage = getErrorMessage(error);
        
        clearTokenFromStorage();
        router.navigate(['/login'], {
          queryParams: { 
            message: errorMessage,
            returnUrl: router.url 
          }
        });
      } else if (error.status === 403) {
        console.log('JWT Interceptor - 403 error, insufficient permissions');
        router.navigate(['/unauthorized']);
      }
      
      return throwError(() => error);
    })
  );
};

// =================== HELPER FUNCTIONS ===================

/**
 * Get token from storage using CONSISTENT key
 */
function getTokenFromStorage(): string | null {
  if (typeof window !== 'undefined') {
    // Try both keys for consistency with AuthenticationService
    return localStorage.getItem('access_token') || localStorage.getItem('token') || 
           sessionStorage.getItem('access_token') || sessionStorage.getItem('token');
  }
  return null;
}

/**
 * Clear token from storage (όλα τα possible keys)
 */
function clearTokenFromStorage(): void {
  if (typeof window !== 'undefined') {
    // Clear all possible token keys
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('currentUser');
    
    // Clear old keys for backwards compatibility
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    const isExpired = payload.exp <= now;
    
    if (isExpired) {
      console.log('Token is expired. Expiry:', new Date(payload.exp * 1000), 'Now:', new Date());
    }
    
    return isExpired;
  } catch (e) {
    console.error('Error parsing token:', e);
    return true;
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: HttpErrorResponse): string {
  if (error.error?.message) {
    return error.error.message;
  }
  
  switch (error.status) {
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return 'The requested resource was not found.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log detailed error information for debugging
 */
function logErrorDetails(error: HttpErrorResponse): void {
  console.error('JWT Interceptor Error Details:', {
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    message: error.message,
    error: error.error,
    timestamp: new Date().toISOString()
  });
}