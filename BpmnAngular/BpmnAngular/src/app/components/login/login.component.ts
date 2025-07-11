// 
// login.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

import { NotificationService } from '../../services/notification.service';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>BPMN Manager</h1>
          <p>Sign in to manage your business processes</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <!-- Username/Email Field -->
          <div class="form-group">
            <label for="username">Username or Email</label>
            <input 
              type="text" 
              id="username"
              formControlName="username"
              class="form-control"
              [class.error]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
              placeholder="Enter your username or email">
            <div class="error-message" *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched">
              <span *ngIf="loginForm.get('username')?.errors?.['required']">Username or email is required</span>
            </div>
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password">Password</label>
            <div class="password-input">
              <input 
                [type]="showPassword ? 'text' : 'password'" 
                id="password"
                formControlName="password"
                class="form-control"
                [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                placeholder="Enter your password">
              <button 
                type="button" 
                class="password-toggle" 
                (click)="togglePassword()">
                <i [class]="showPassword ? 'icon-eye-off' : 'icon-eye'"></i>
              </button>
            </div>
            <div class="error-message" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
              <span *ngIf="loginForm.get('password')?.errors?.['required']">Password is required</span>
              <span *ngIf="loginForm.get('password')?.errors?.['minlength']">Password must be at least 6 characters</span>
            </div>
          </div>

          <!-- Remember Me -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="rememberMe">
              <span class="checkmark"></span>
              Remember me
            </label>
            <a href="#" class="forgot-password">Forgot password?</a>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="btn btn-primary btn-full"
            [disabled]="loginForm.invalid || loading">
            <span *ngIf="loading" class="loading-spinner"></span>
            {{loading ? 'Signing in...' : 'Sign In'}}
          </button>

          <!-- Error Message -->
          <div class="error-message global-error" *ngIf="errorMessage">
            <i class="icon-alert"></i>
            {{errorMessage}}
          </div>
        </form>

        <!-- Register Link -->
        <div class="login-footer">
          <p>Don't have an account? <a routerLink="/register" class="register-link">Sign up here</a></p>
        </div>

        <!-- Demo Accounts -->
        <div class="demo-accounts">
          <h4>Demo Accounts:</h4>
          <div class="demo-buttons">
            <button class="btn btn-outline btn-sm" (click)="loginAsDemo('admin')">
              Login as Admin
            </button>
            <button class="btn btn-outline btn-sm" (click)="loginAsDemo('modeler')">
              Login as Modeler
            </button>
            <button class="btn btn-outline btn-sm" (click)="loginAsDemo('viewer')">
              Login as Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .login-header h1 {
      color: #2c3e50;
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }

    .login-header p {
      color: #7f8c8d;
      margin: 0;
      font-size: 14px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #2c3e50;
      font-weight: 500;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e1e8ed;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s ease;
      outline: none;
    }

    .form-control:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control.error {
      border-color: #e74c3c;
    }

    .password-input {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #7f8c8d;
      padding: 4px;
    }

    .checkbox-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 14px;
      color: #2c3e50;
    }

    .checkbox-label input[type="checkbox"] {
      display: none;
    }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid #e1e8ed;
      border-radius: 4px;
      margin-right: 8px;
      position: relative;
      transition: all 0.3s ease;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkmark {
      background: #667eea;
      border-color: #667eea;
    }

    .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 1px;
      width: 6px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .forgot-password {
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
    }

    .forgot-password:hover {
      text-decoration: underline;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #667eea;
      color: #667eea;
    }

    .btn-outline:hover {
      background: #667eea;
      color: white;
    }

    .btn-full {
      width: 100%;
    }

    .btn-sm {
      padding: 8px 16px;
      font-size: 12px;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-message {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .global-error {
      background: #fdf2f2;
      border: 1px solid #e74c3c;
      border-radius: 6px;
      padding: 12px;
      margin-top: 15px;
      font-size: 14px;
    }

    .login-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e1e8ed;
    }

    .login-footer p {
      margin: 0;
      color: #7f8c8d;
      font-size: 14px;
    }

    .register-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .register-link:hover {
      text-decoration: underline;
    }

    .demo-accounts {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e1e8ed;
      text-align: center;
    }

    .demo-accounts h4 {
      margin: 0 0 15px 0;
      color: #7f8c8d;
      font-size: 14px;
      font-weight: 500;
    }

    .demo-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  loginForm: FormGroup;
  loading = false;
  showPassword = false;
  errorMessage = '';
  returnUrl = '/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      const { username, password } = this.loginForm.value;
      
      this.authService.login(username, password)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading = false;
            this.notificationService.showSuccess('Successfully logged in!');
            this.router.navigate([this.returnUrl]);
          },
          error: (error) => {
            this.loading = false;
            this.errorMessage = error.message || 'Login failed. Please check your credentials.';
            this.notificationService.showError(this.errorMessage);
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  loginAsDemo(type: 'admin' | 'modeler' | 'viewer'): void {
    const credentials = {
      admin: { username: 'admin', password: 'admin123' },
      modeler: { username: 'modeler', password: 'modeler123' },
      viewer: { username: 'viewer', password: 'viewer123' }
    };
    
    this.loginForm.patchValue(credentials[type]);
    this.onSubmit();
  }
}