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
  private readonly TOKEN_KEY = 'token'; // Changed from 'auth-key' to 'token'
  private readonly USER_KEY = 'currentUser';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();
  private http: HttpClient;

  constructor(private injector: Injector,
    private router: Router
  ) {
    this.http = this.injector.get(HttpClient);
    this.checkTokenValidity();
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

  // Authentication Methods
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
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.USER_KEY);
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

  // Session Management
  private setSession(authResult: LoginResponse | AuthenticationResponse): void {
    if (typeof window !== 'undefined') {
      console.log('Setting session with new token');

      localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(authResult.user));

      this.tokenSubject.next(authResult.access_token);
      this.currentUserSubject.next(authResult.user);
    }
  }

  private clearSession(): void {
    console.log('Clearing session');

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      // Also clear from sessionStorage if it exists there
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    }

    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Check localStorage first, then sessionStorage
      return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  // Fixed isLoggedIn method
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const isValid = payload.exp > now;
      
      if (!isValid) {
        console.log('Token is expired');
        this.clearSession();
      }
      
      return isValid;
    } catch (e) {
      console.error('Error parsing token:', e);
      this.clearSession();
      return false;
    }
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

  // User and Role Methods
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

    // Check from user object first
    if (user && user.roles) {
      const hasRoleFromUser = user.roles.some(role =>
        role.name === roleName || role.name === `ROLE_${roleName.toUpperCase()}`
      );
      if (hasRoleFromUser) return true;
    }

    // Fallback to token roles
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

  // Permission Methods
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

  // HTTP Headers
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Utility Methods
  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    return user?.roles?.map(role => role.name) || [];
  }

  getUserRoleNames(): string[] {
    return this.getUserRoles().map(role =>
      role.startsWith('ROLE_') ? role.substring(5) : role
    );
  }

  // Error Handling
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    console.error('Authentication error details:', error);

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
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
  }
}