import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/authentication.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(
        private authenticationService: AuthenticationService,
        private router: Router
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Get token from storage
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        console.log('JWT Interceptor - Processing request to:', request.url);
        console.log('JWT Interceptor - Auth token present:', !!token);

        // Add authorization header with jwt token if available
        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('JWT Interceptor - Added Bearer token to request');
        } else {
            console.log('JWT Interceptor - No token available');
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                console.log('JWT Interceptor - HTTP Error occurred:', error.status, error.message);
                console.log('JWT Interceptor - Error details:', error);

                if (error.status === 401) {
                    console.log('JWT Interceptor - 401 error, clearing token and redirecting');
                    // Clear token and redirect to login
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                    this.authenticationService.logout();
                    this.router.navigate(['/login']);
                }
                return throwError(() => error);
            })
        );
    }
}