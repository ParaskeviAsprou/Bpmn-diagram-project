// ΔΙΟΡΘΩΜΕΝΟ Authentication Service - χωρίς αυτόματο logout

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  roles: Role[];
  tokenExpiry?: Date;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  expires_in: number;
}
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
  expires_in: number;
}

export interface AuthenticationResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
  expires_in?: number;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  address?: string;
  mobileno?: string;
  age?: string;
  roleNames?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly API_URL = 'http://localhost:8080/api/v1/auth';
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'currentUser';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();

  private _http: HttpClient | null = null;

  // ΑΦΑΙΡΕΘΗΚΕ το αυτόματο token monitoring που έκανε logout
  private readonly TOKEN_REFRESH_THRESHOLD = 2 * 60 * 1000;

  constructor(
    private injector: Injector,
    private router: Router
  ) {
    // ΔΕΝ κάνουμε πια αυτόματο έλεγχο που μπορεί να κάνει logout
    console.log('AuthenticationService initialized');
    
    // Initialize user from storage if available
    this.initializeUserFromStorage();
  }

  private get http(): HttpClient {
    if (!this._http) {
      this._http = this.injector.get(HttpClient);
    }
    return this._http;
  }

  private getUserFromStorage(): User | null {
    if (typeof window !== 'undefined') {
      // Try both possible keys for user data
      const userData = localStorage.getItem(this.USER_KEY) || localStorage.getItem('currentUser');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('User loaded from storage:', user);
          return user;
        } catch (error) {
          console.error('Error parsing user data from storage:', error);
          return null;
        }
      }
    }
    return null;
  }

  private initializeUserFromStorage(): void {
    const user = this.getUserFromStorage();
    const token = this.getToken();
    
    if (user && token) {
      console.log('Initializing user from storage:', user);
      this.currentUserSubject.next(user);
      this.tokenSubject.next(token);
    } else {
      console.log('No user or token found in storage');
    }
  }

  // =================== AUTHENTICATION METHODS ===================

  // login(credentials: LoginRequest): Observable<LoginResponse> {
  //   console.log('Attempting login for user:', credentials.username);

  //   return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
  //     .pipe(
  //       tap(response => {
  //         console.log('Login response received:', response);
  //         this.setSession(response);
  //       }),
  //       catchError(this.handleError)
  //     );
  // }

  // register(userData: RegisterRequest): Observable<AuthenticationResponse> {
  //   return this.http.post<AuthenticationResponse>(`${this.API_URL}/register`, userData)
  //     .pipe(
  //       tap(response => {
  //         console.log('Registration response received:', response);
  //         this.setSession(response);
  //       }),
  //       catchError(this.handleError)
  //     );
  // }

  // logout(): void {
  //   const token = this.getToken();

  //   if (token) {
  //     this.http.post(`${this.API_URL}/logout`, {}, {
  //       headers: new HttpHeaders({
  //         'Authorization': `Bearer ${token}`
  //       })
  //     }).subscribe({
  //       next: () => {
  //         console.log('Backend logout successful');
  //       },
  //       error: (error) => console.warn('Backend logout failed:', error)
  //     });
  //   }

  //   this.clearSession();
  //   this.router.navigate(['/login']);
  // }
  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {
      username,
      password
    }).pipe(
      tap(response => {
        if (response.access_token) {
          // Store token with consistent key
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('token', response.access_token); // Also store with 'token' key for interceptor
          localStorage.setItem('token_type', response.token_type);
          
          // Store user data in localStorage for persistence
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          
          // Update subjects
          this.tokenSubject.next(response.access_token);
          this.currentUserSubject.next(response.user);
          
          console.log('Login successful, user stored:', response.user);
        }
      })
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.API_URL}/logout`, {}).pipe(
      tap(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      }),
      catchError((error) => {
        // Even if backend logout fails, clear local session
        console.warn('Backend logout failed, clearing local session:', error);
        this.clearSession();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  // Simple logout method that doesn't require backend communication
  logoutLocal(): void {
    console.log('logoutLocal() called - clearing session');
    this.clearSession();
    console.log('Session cleared, navigating to login');
    this.router.navigate(['/login']);
    console.log('Navigation to login completed');
  }
  validateToken(): Observable<{ valid: boolean }> {
    return this.http.get<{ valid: boolean }>(`${this.API_URL}/validate`);
  }
  private loadCurrentUser(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Load user from backend or decode JWT
      this.validateToken().subscribe({
        next: (result) => {
          if (!result.valid) {
            this.logout().subscribe();
          }
        },
        error: () => {
          this.logout().subscribe();
        }
      });
    }
  }

  refreshToken(): Observable<AuthenticationResponse> {
    console.log('Refresh token not implemented yet - logging out');
    this.logout();
    return throwError(() => new Error('Refresh token not implemented'));
  }

  // =================== SESSION MANAGEMENT ===================

  private setSession(authResult: LoginResponse | AuthenticationResponse): void {
    if (typeof window !== 'undefined') {
      console.log('Setting session with new token');

      const expiresIn = typeof authResult.expires_in === 'number' ? authResult.expires_in : 3600;
      const tokenExpiry = new Date(Date.now() + (expiresIn * 1000)); // ΔΙΟΡΘΩΣΗ: 1000 αντί για 36000
      const userWithExpiry = {
        ...authResult.user,
        tokenExpiry: tokenExpiry
      };

      localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(userWithExpiry));

      this.tokenSubject.next(authResult.access_token);
      this.currentUserSubject.next(userWithExpiry);

      console.log('Token expires at:', tokenExpiry);
    }
  }

  private clearSession(): void {
    console.log('Clearing session');

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem('access_token');
      localStorage.removeItem('token'); // Clear both token keys
      localStorage.removeItem('token_type');
      localStorage.removeItem('currentUser'); // Clear user data
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('token_type');
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Verify all tokens are cleared
      console.log('Session cleared. Remaining tokens:', {
        access_token: localStorage.getItem('access_token'),
        token: localStorage.getItem('token'),
        currentUser: localStorage.getItem('currentUser'),
        auth_token: localStorage.getItem('auth_token')
      });
    }

    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    // Try both keys for backward compatibility
    return localStorage.getItem('access_token') || localStorage.getItem('token');
  }
  // getToken(): string | null {
  //   if (typeof window !== 'undefined') {
  //     return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
  //   }
  //   return null;
  // }

  // =================== VALIDATION METHODS ===================
  isAuthenticated(): boolean {
    const token = this.getToken();
    const isAuth = !!token;
    console.log('isAuthenticated() check:', { token: token ? 'exists' : 'null', isAuth });
    return isAuth;
  }


  // isAuthenticated(): boolean {
  //   const token = this.getToken();
  //   if (!token) {
  //     return false;
  //   }

  //   // ΑΠΛΟΠΟΙΗΜΕΝΟΣ έλεγχος - δεν κάνει αυτόματο logout
  //   try {
  //     const user = this.getCurrentUser();
  //     if (user && user.tokenExpiry) {
  //       const now = Date.now();
  //       const expiry = new Date(user.tokenExpiry).getTime();
  //       return expiry > now;
  //     }

  //     // Fallback: έλεγχος από το payload του token
  //     return !this.isTokenExpired(token);
  //   } catch (error) {
  //     console.warn('Error checking token validity:', error);
  //     return false; // ΔΕΝ κάνουμε logout, απλά επιστρέφουμε false
  //   }
  // }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const expiry = this.getTokenExpiration(token);
      const isExpired = expiry ? expiry <= Date.now() : true;
      if (isExpired) {
        console.log('Token is expired but not logging out automatically');
      }
      return isExpired;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  private getTokenExpiration(token: string): number | null {
    try {
      const payload = this.getTokenPayload(token);
      return payload.exp ? payload.exp * 1000 : null;
    } catch (error) {
      return null;
    }
  }

  private getTokenPayload(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      return null;
    }
  }

  // =================== UTILITY METHODS ===================

  ensureValidToken(): Observable<boolean> {
    return new Observable(observer => {
      if (!this.isAuthenticated()) {
        console.warn('Token is invalid or expired');
        observer.next(false);
        observer.complete();
        return;
      }

      const token = this.getToken();
      if (!token) {
        observer.next(false);
        observer.complete();
        return;
      }

      const timeUntilExpiry = this.getTimeUntilExpiry(token);

      if (timeUntilExpiry < 60000) {
        console.warn('Token expires soon');
        observer.next(false);
        observer.complete();
        return;
      }

      observer.next(true);
      observer.complete();
    });
  }

  private getTimeUntilExpiry(token: string): number {
    try {
      const payload = this.getTokenPayload(token);
      if (!payload.exp) return 0;

      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();

      return expiryTime - currentTime;
    } catch (error) {
      return 0;
    }
  }

  validateSession(): Observable<boolean> {
    const token = this.getToken();

    if (!token || !this.isAuthenticated()) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    return this.http.get<{ valid: boolean }>(`${this.API_URL}/validate`)
      .pipe(
        map(response => response.valid),
        catchError(() => {
          return new Observable<boolean>(observer => {
            observer.next(false);
            observer.complete();
          });
        })
      );
  }

  // =================== USER AND ROLE METHODS ===================

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserRolesFromToken(): string[] {
    const token = this.getToken();
    if (!token) return [];

    try {
      const payload = this.getTokenPayload(token);
      return payload.roles || [];
    } catch (error) {
      return [];
    }
  }

  // hasRole(roleName: string): boolean {
  //   const user = this.getCurrentUser();
  //   const tokenRoles = this.getUserRolesFromToken();

  //   if (user && user.roles) {
  //     const hasRoleFromUser = user.roles.some(role =>
  //       role.name === roleName || role.name === `ROLE_${roleName.toUpperCase()}`
  //     );
  //     if (hasRoleFromUser) return true;
  //   }

  //   return tokenRoles.some(role =>
  //     role === roleName ||
  //     role === `ROLE_${roleName.toUpperCase()}` ||
  //     (role.startsWith('ROLE_') && role.substring(5) === roleName.toUpperCase())
  //   );
  // }
  hasRole(roleName: string): boolean {
    const user = this.currentUserSubject.value;
    const hasRole = user?.roles?.some(role => role.name === roleName) || false;
    
    // Debug logging to track role changes
    console.log(`Checking role ${roleName}:`, {
      user: user?.firstname,
      roles: user?.roles?.map(r => r.name),
      hasRole
    });
    
    return hasRole;
  }

  // hasAnyRole(roleNames: string[]): boolean {
  //   return roleNames.some(role => this.hasRole(role));
  // }

  hasAllRoles(roleNames: string[]): boolean {
    return roleNames.every(role => this.hasRole(role));
  }
 hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some(role => this.hasRole(role));
  }
  
  canEdit(): boolean {
    return this.hasAnyRole(['MODELER', 'ADMIN', 'ROLE_MODELER', 'ROLE_ADMIN']);
  }

  canView(): boolean {
    return this.hasAnyRole(['VIEWER', 'MODELER', 'ADMIN', 'ROLE_VIEWER', 'ROLE_MODELER', 'ROLE_ADMIN']);
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('ROLE_ADMIN');
  }

  isModeler(): boolean {
    return this.hasRole('MODELER') || this.hasRole('ROLE_MODELER');
  }

  isViewer(): boolean {
    return this.hasRole('VIEWER') || this.hasRole('ROLE_VIEWER');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    return user?.roles?.map(role => role.name) || [];
  }

  getUserRoleNames(): string[] {
    return this.getUserRoles().map(role =>
      role.startsWith('ROLE_') ? role.substring(5) : role
    );
  }


  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred';

    console.error('Authentication error details:', error);

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      if (error.status === 401) {
        errorMessage = 'Invalid credentials';
      } else if (error.status === 403) {
        errorMessage = 'Access denied';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  };
}