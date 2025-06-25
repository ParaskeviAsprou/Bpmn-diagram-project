import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from '../components/settings/settings.component';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = 'http://localhost:8080/api/settings'; // Backend URL

  constructor(private http: HttpClient) { }

  private getHttpOptions() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  // Current user settings
  getUserSettings(): Observable<UserService> {
    return this.http.get<UserService>(`${this.apiUrl}/user`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError<UserService>('getUserSettings', this.getDefaultSettings()))
      );
  }

  updateProfile(profile: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, profile, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('updateProfile')));
  }

  updatePreferences(preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/preferences`, preferences, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('updatePreferences')));
  }

  updateSecurity(security: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security`, security, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('updateSecurity')));
  }

  changePassword(passwordData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/password`, passwordData, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('changePassword')));
  }

  // Admin operations for other users
  getUserSettingsById(userId: number): Observable<UserService> {
    return this.http.get<UserService>(`${this.apiUrl}/user/${userId}`, this.getHttpOptions())
      .pipe(
        catchError(this.handleError<UserService>('getUserSettingsById', this.getDefaultSettings()))
      );
  }

  updateProfileById(userId: number, profile: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${userId}/profile`, profile, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('updateProfileById')));
  }

  updatePreferencesById(userId: number, preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${userId}/preferences`, preferences, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('updatePreferencesById')));
  }

  updateSecurityById(userId: number, security: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/user/${userId}/security`, security, this.getHttpOptions())
      .pipe(catchError(this.handleError<any>('updateSecurityById')));
  }

  // Get all users (for admin user selection)
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`, this.getHttpOptions())
      .pipe(catchError(this.handleError<any[]>('getAllUsers', [])));
  }

  // Get users by role (for admin to see modelers/viewers)
  getUsersByRole(role: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/role/${role}`, this.getHttpOptions())
      .pipe(catchError(this.handleError<any[]>('getUsersByRole', [])));
  }

  private getDefaultSettings(): UserService {
    return {
      profile: {
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        phone: '',
        profilePicture: ''
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        notifications: {
          email: true,
          inApp: true,
          push: true
        }
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: 30,
        loginNotifications: false
      },
      settings: {
        activeTab: 'profile'
      }
    };
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }
}