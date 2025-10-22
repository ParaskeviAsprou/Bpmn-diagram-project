import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthenticationService, RegisterRequest } from '../../services/authentication.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    RouterLink, 
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  constructor(
    private authenticationService: AuthenticationService,
    private router: Router
  ) { }

  msg: string | undefined;
  isLoading: boolean = false;

  signupForm: FormGroup = new FormGroup({
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    address: new FormControl(''),
    mobileno: new FormControl(''),
    age: new FormControl('')
  })

  public onSubmit() {
    if (!this.signupForm.valid) {
      this.msg = 'Please fill in all required fields correctly.';
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.msg = '';

    const formValue = this.signupForm.value;

    const request: RegisterRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      username: formValue.username,
      email: formValue.email,
      password: formValue.password,
      address: formValue.address,
      mobileno: formValue.mobileno,
      age: formValue.age,
      roleNames: ['ROLE_VIEWER'] 
    };

    console.log('Registration request:', request);

    this.authenticationService.register(request).subscribe({
      next: (res) => {
        console.log('Registration successful:', res);
        this.msg = 'Registration successful! Redirecting to dashboard...';
        this.isLoading = false;
        
        
        // Redirect after a short delay to show success message
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error("Registration error:", err);
        this.isLoading = false;
        
        if (err.message) {
          this.msg = err.message;
        } else {
          this.msg = 'Registration failed. Please try again.';
        }
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper method to get field errors
  getFieldError(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }
}