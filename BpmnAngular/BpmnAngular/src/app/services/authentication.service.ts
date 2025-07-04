// ΔΙΟΡΘΩΜΕΝΟ Authentication Service με σωστό token management

import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  roles: Role[];
  enabled: boolean;
  tokenExpiry?: Date;
}

export interface Role {
  id: number;
  name: string;
  displayName: string;
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
  // ΣΗΜΑΝΤΙΚΟ: Χρησιμοποιούμε το ίδιο key παντού
  private readonly TOKEN_KEY = 'token'; // Όχι 'auth_token'
  private readonly USER_KEY = 'currentUser';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();
  
  // Lazy loading του HttpClient για να αποφύγουμε circular dependency
  private _http: HttpClient | null = null;

  // Token refresh timer
  private tokenRefreshTimer?: any;
  private readonly TOKEN_REFRESH_THRESHOLD = 2 * 60 * 1000; // 2 λεπτά πριν τη λήξη

  constructor(
    private injector: Injector,
    private router: Router
  ) {
    this.checkTokenValidity();
    this.startTokenMonitoring();
  }

  // Lazy getter για HttpClient
  private get http(): HttpClient {
    if (!this._http) {
      this._http = this.injector.get(HttpClient);
    }
    return this._http;
  }

  private getUserFromStorage(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  private checkTokenValidity(): void {
    const token = this.getToken();
    if (token && this.isTokenExpired(token)) {
      console.log('Token expired on service initialization, logging out');
      this.logout();
    }
  }

  // =================== TOKEN MONITORING ===================

  private startTokenMonitoring(): void {
    // Έλεγχος κάθε λεπτό
    setInterval(() => {
      this.checkAndRefreshToken();
    }, 60000);
  }

  private checkAndRefreshToken(): void {
    const token = this.getToken();
    if (!token) return;

    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    
    // Αν λήγει σε λιγότερο από 2 λεπτά, προσπάθησε refresh
    if (timeUntilExpiry > 0 && timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD) {
      console.log('Token expires soon, attempting refresh...');
      this.attemptTokenRefresh();
    }
    // Αν έχει ήδη λήξει, logout
    else if (timeUntilExpiry <= 0) {
      console.log('Token has expired, logging out');
      this.logout();
    }
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

  private attemptTokenRefresh(): void {
    // Για τώρα, αφού δεν έχεις refresh token, απλά εμφάνισε warning
    console.warn('Token refresh not implemented, user will need to login again');
    // Μπορείς να προσθέσεις notification εδώ
  }

  // =================== AUTHENTICATION METHODS ===================

  login(credentials: LoginRequest): Observable<LoginResponse> {
    console.log('Attempting login for user:', credentials.username);

    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          console.log('Login response received:', response);
          this.setSession(response);
        }),
        catchError(this.handleError)
      );
  }

  register(userData: RegisterRequest): Observable<AuthenticationResponse> {
    return this.http.post<AuthenticationResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        tap(response => {
          console.log('Registration response received:', response);
          this.setSession(response);
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    const token = this.getToken();

    // Call backend logout if token exists
    if (token) {
      this.http.post(`${this.API_URL}/logout`, {}, {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${token}`
        })
      }).subscribe({
        next: () => {
          console.log('Backend logout successful');
        },
        error: (error) => console.warn('Backend logout failed:', error)
      });
    }

    this.clearSession();
    this.router.navigate(['/login']);
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

      // Calculate token expiry
      const expiresIn = typeof authResult.expires_in === 'number' ? authResult.expires_in : 3600; // default 1 hour
      const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
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
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
      // ΣΗΜΑΝΤΙΚΟ: Καθαριζουμε και τα παλιά keys αν υπάρχουν
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    }

    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  // =================== VALIDATION METHODS ===================

  // ΔΙΟΡΘΩΜΕΝΗ μέθοδος - χρησιμοποιεί σωστό token key
  isAuthenticated(): boolean {
    const token = this.getToken(); // Χρησιμοποιεί το σωστό key
    if (!token) {
      return false;
    }

    return this.isTokenValid(token);
  }

  // ΔΙΟΡΘΩΜΕΝΗ μέθοδος - ελέγχει σωστά τη λήξη
  private isTokenValid(token: string): boolean {
    try {
      const user = this.getCurrentUser();
      if (!user || !user.tokenExpiry) {
        // Fallback: έλεγχος από το payload του token
        return !this.isTokenExpired(token);
      }
      
      const now = Date.now();
      const expiry = user.tokenExpiry.getTime();
      
      return expiry > now;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  // Fixed isLoggedIn method - alias για isAuthenticated
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const expiry = this.getTokenExpiration(token);
      const isExpired = expiry ? expiry <= Date.now() : true;
      if (isExpired) {
        console.log('Token is expired');
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

  // =================== UTILITY METHODS FOR SAVE OPERATIONS ===================

  /**
   * Εδώ είναι η κλειδί μέθοδος για τις save operations
   * Ελέγχει αν το token είναι έγκυρο και αν όχι, κάνει logout
   */
  ensureValidToken(): Observable<boolean> {
    return new Observable(observer => {
      if (!this.isAuthenticated()) {
        console.warn('Token is invalid or expired');
        observer.error(new Error('Token is invalid or expired'));
        return;
      }

      const token = this.getToken();
      if (!token) {
        observer.error(new Error('No token found'));
        return;
      }

      const timeUntilExpiry = this.getTimeUntilExpiry(token);
      
      // Αν λήγει σε λιγότερο από 1 λεπτό, πρόβλημα
      if (timeUntilExpiry < 60000) {
        console.warn('Token expires too soon for save operation');
        observer.error(new Error('Token expires too soon'));
        return;
      }

      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Έλεγχος αν το session είναι έγκυρο
   */
  validateSession(): Observable<boolean> {
    const token = this.getToken();
    
    if (!token || !this.isTokenValid(token)) {
      return new Observable(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    // Validate with backend
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

  // =================== USER AND ROLE METHODS (unchanged) ===================

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

  hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    const tokenRoles = this.getUserRolesFromToken();

    if (user && user.roles) {
      const hasRoleFromUser = user.roles.some(role =>
        role.name === roleName || role.name === `ROLE_${roleName.toUpperCase()}`
      );
      if (hasRoleFromUser) return true;
    }

    return tokenRoles.some(role =>
      role === roleName ||
      role === `ROLE_${roleName.toUpperCase()}` ||
      (role.startsWith('ROLE_') && role.substring(5) === roleName.toUpperCase())
    );
  }

  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some(role => this.hasRole(role));
  }

  hasAllRoles(roleNames: string[]): boolean {
    return roleNames.every(role => this.hasRole(role));
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

  // =================== ERROR HANDLING ===================

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