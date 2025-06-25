import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../services/authentication.service';
import { LoginRequest } from '../../services/authentication.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(
    private authenticationService: AuthenticationService
  ) { }

  router = inject(Router);
  request: LoginRequest = { username: '', password: '' }
  loginError: string = '';
  isLoading: boolean = false;

  userForm: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', [Validators.required, Validators.minLength(4)]),
    rememberMe: new FormControl(false)
  });

  login() {
    if (this.userForm.invalid) {
      this.loginError = 'Please fill in all required fields';
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.loginError = '';
    
    const formValue = this.userForm.value;
    this.request.username = formValue.username;
    this.request.password = formValue.password;

    console.log('Attempting login with username:', this.request.username);

    this.authenticationService.login(this.request).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        console.log('Access token received:', response.access_token);
        console.log('User info:', response.user);
        console.log('User roles:', response.user?.roles);

        this.router.navigate(['/dashboard']);
        this.isLoading = false;
      }, 
      error: (error) => {
        console.error('Login error:', error);
        this.loginError = error.message || 'Login failed. Please check your credentials and try again.';
        this.isLoading = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }
  loginAsAdmin() {
    this.userForm.patchValue({
      username: 'admin',
      password: 'admin123'
    });
    this.login();
  }

  loginAsModeler() {
    this.userForm.patchValue({
      username: 'modeler',
      password: 'modeler123'
    });
    this.login();
  }

  loginAsViewer() {
    this.userForm.patchValue({
      username: 'viewer',
      password: 'viewer123'
    });
    this.login();
  }
}