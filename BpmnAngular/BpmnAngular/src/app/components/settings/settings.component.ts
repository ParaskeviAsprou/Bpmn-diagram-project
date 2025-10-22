import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { AuthenticationService, User } from '../../services/authentication.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

export interface UserService {
  profile: {
    firstName: string; 
    lastName: string;
    email: string;
    address: string;
    phone: string;
    profilePicture: string;
  };
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
    dateFormat: string;
    notifications: {
      email: boolean;
      inApp: boolean;
      push: boolean;
    };
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    loginNotifications: boolean;
  };
  settings: {
    activeTab: string;
  };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  activeTab = 'profile';
  profileForm!: FormGroup;
  preferencesForm!: FormGroup;
  securityForm!: FormGroup;
  passwordForm!: FormGroup;

  loading = false;
  saving = false;
  
  // Target user data (when admin is editing another user)
  targetUserId: number | null = null;
  targetUser: User | null = null;
  isEditingOtherUser = false;

  languages = [
    { code: 'en', name: 'English' },
    { code: 'gr', name: 'Greek' },
  ];

  timezones = [
    { value: 'UTC', name: 'UTC' },
    { value: 'Europe/Athens', name: 'Europe/Athens' },
    { value: 'America/New_York', name: 'America/New_York' }
  ];

  dateFormats = [
    { value: 'MM/DD/YYYY', name: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', name: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', name: 'YYYY-MM-DD' }
  ];

  // Permission flags
  canView: boolean = false;
  canEdit: boolean = false;
  canDelete: boolean = false;
  canCreate: boolean = false;
  isViewerOnly: boolean = false;
  isAdmin: boolean = false;
  isModeler: boolean = false;
  currentUser: User | null = null;

  constructor(
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private notificationService: NotificationService,
    private authenticationService: AuthenticationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForms();
  }
  
  ngOnInit(): void {
    console.log('Settings component initializing...');
    
    // Check for userId parameter for admin editing other users
    this.route.params.subscribe(params => {
      if (params['userId']) {
        this.targetUserId = +params['userId'];
        this.isEditingOtherUser = true;
        console.log('Editing user ID:', this.targetUserId);
      }
    });

    if (!this.checkAccess()) {
      return;
    }
    this.loadUserSettings();
  }

  checkAccess(): boolean {
    console.log('Checking access...');
    
    // Check if user is logged in
    if (!this.authenticationService.isLoggedIn()) {
      console.error('User is not logged in');
      this.notificationService.showError('Please log in to access settings');
      this.router.navigate(['/login']);
      return false;
    }

    this.currentUser = this.authenticationService.getCurrentUser();
    console.log('Current user:', this.currentUser);
    
    // Set permission flags
    this.isAdmin = this.authenticationService.isAdmin();
    this.isModeler = this.authenticationService.isModeler();
    this.canView = this.authenticationService.canView() || this.isAdmin;
    this.canEdit = this.authenticationService.canEdit() || this.isAdmin;
    
    this.isViewerOnly = this.authenticationService.isViewer() &&
      !this.authenticationService.isModeler() &&
      !this.isAdmin;

    console.log('Permission flags:', {
      isAdmin: this.isAdmin,
      isModeler: this.isModeler,
      canView: this.canView,
      canEdit: this.canEdit,
      isViewerOnly: this.isViewerOnly
    });

    // If editing another user, only admins can do this
    if (this.isEditingOtherUser && !this.isAdmin) {
      this.notificationService.showError('You do not have permission to edit other users');
      this.router.navigate(['/settings']);
      return false;
    }

    // Allow access if user has at least view permissions or is admin
    if (!this.canView && !this.isAdmin) {
      this.notificationService.showError('You do not have permission to access settings');
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }

  initializeForms(): void {
    // Initialize forms without disabled state first
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: [''],
      phone: [''],
      profilePicture: ['']
    });

    this.preferencesForm = this.fb.group({
      theme: ['light'],
      language: ['en'],
      timezone: ['UTC'],
      dateFormat: ['MM/DD/YYYY'],
      notifications: this.fb.group({
        email: [true],
        inApp: [true],
        push: [true]
      })
    });

    this.securityForm = this.fb.group({
      twoFactorAuth: [false],
      sessionTimeout: [30, [Validators.min(1), Validators.max(480)]],
      loginNotifications: [false]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator.bind(this) });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    return newPassword && confirmPassword && newPassword.value === confirmPassword.value 
      ? null : { passwordMismatch: true };
  }

  loadUserSettings(): void {
    this.loading = true;
    console.log('Loading user settings...');
    
    // If editing another user, load their settings
    if (this.isEditingOtherUser && this.targetUserId) {
      console.log('Loading settings for user ID:', this.targetUserId);
      this.settingsService.getUserSettingsById(this.targetUserId).subscribe({
        next: (settings: UserService) => {
          console.log('User settings loaded:', settings);
          this.populateForms(settings);
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Settings load error:', error);
          if (error.status === 401) {
            this.notificationService.showError('Session expired. Please log in again.');
            this.authenticationService.logout();
          } else {
            this.notificationService.showError('Failed to load user settings');
          }
          this.loading = false;
        }
      });
    } else {
      // Load current user's settings
      console.log('Loading current user settings');
      this.settingsService.getUserSettings().subscribe({
        next: (settings: UserService) => {
          console.log('Current user settings loaded:', settings);
          this.populateForms(settings);
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Settings load error:', error);
          if (error.status === 401) {
            this.notificationService.showError('Session expired. Please log in again.');
            this.authenticationService.logout();
          } else {
            this.notificationService.showError('Failed to load settings');
          }
          this.loading = false;
        }
      });
    }
  }

  private populateForms(settings: UserService): void {
    console.log('Populating forms with settings:', settings);
    
    this.profileForm.patchValue(settings.profile);
    this.preferencesForm.patchValue(settings.preferences);
    this.securityForm.patchValue(settings.security);
    
    // Set form states based on permissions AFTER populating
    this.updateFormStates();
  }

  private updateFormStates(): void {
    const shouldDisable = this.isFormDisabled;
    console.log('Updating form states, should disable:', shouldDisable);
    
    if (shouldDisable) {
      // Use programmatic disabling instead of [disabled] attribute
      this.profileForm.disable();
      this.preferencesForm.disable();
      this.securityForm.disable();
      this.passwordForm.disable();
    } else {
      this.profileForm.enable();
      this.preferencesForm.enable();
      this.securityForm.enable();
      this.passwordForm.enable();
    }

    // Special handling for viewers - they can only view certain fields
    if (this.isViewerOnly && !this.isEditingOtherUser) {
      // Viewers can see all data but cannot edit
      this.profileForm.disable();
      this.preferencesForm.disable();
      this.securityForm.disable();
      this.passwordForm.disable();
    }
  }

  onSaveProfile(): void {
    if (!this.canEditCurrentContext()) {
      this.notificationService.showError('You do not have permission to edit these settings');
      return;
    }

    if (this.profileForm.valid) {
      this.saving = true;
      
      if (this.isEditingOtherUser && this.targetUserId) {
        this.settingsService.updateProfileById(this.targetUserId, this.profileForm.value).subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('User profile updated successfully');
            this.saving = false;
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update user profile');
            this.saving = false;
          }
        });
      } else {
        this.settingsService.updateProfile(this.profileForm.value).subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('Profile updated successfully');
            this.saving = false;
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update profile');
            this.saving = false;
          }
        });
      }
    }
  }

  onSavePreferences(): void {
    if (!this.canEditCurrentContext()) {
      this.notificationService.showError('You do not have permission to edit these settings');
      return;
    }

    if (this.preferencesForm.valid) {
      this.saving = true;
      
      if (this.isEditingOtherUser && this.targetUserId) {
        this.settingsService.updatePreferencesById(this.targetUserId, this.preferencesForm.value).subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('User preferences updated successfully');
            this.saving = false;
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update user preferences');
            this.saving = false;
          }
        });
      } else {
        this.settingsService.updatePreferences(this.preferencesForm.value).subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('Preferences updated successfully');
            this.saving = false;
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update preferences');
            this.saving = false;
          }
        });
      }
    }
  }

  onSaveSecurity(): void {
    if (!this.canEditCurrentContext()) {
      this.notificationService.showError('You do not have permission to edit security settings');
      return;
    }

    if (this.securityForm.valid) {
      this.saving = true;
      
      if (this.isEditingOtherUser && this.targetUserId) {
        this.settingsService.updateSecurityById(this.targetUserId, this.securityForm.value).subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('User security settings updated successfully');
            this.saving = false;
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update user security settings');
            this.saving = false;
          }
        });
      } else {
        this.settingsService.updateSecurity(this.securityForm.value).subscribe({
          next: (response: any) => {
            this.notificationService.showSuccess('Security settings updated successfully');
            this.saving = false;
          },
          error: (error: any) => {
            this.notificationService.showError('Failed to update security settings');
            this.saving = false;
          }
        });
      }
    }
  }

  onChangePassword(): void {
    if (!this.canEditCurrentContext()) {
      this.notificationService.showError('You do not have permission to change password');
      return;
    }

    // Password changes are only allowed for own account, not when editing others
    if (this.isEditingOtherUser) {
      this.notificationService.showError('Cannot change password for other users');
      return;
    }

    if (this.passwordForm.valid) {
      this.saving = true;
      this.settingsService.changePassword(this.passwordForm.value).subscribe({
        next: (response: any) => {
          this.notificationService.showSuccess('Password changed successfully');
          this.passwordForm.reset();
          this.saving = false;
        },
        error: (error: any) => {
          this.notificationService.showError('Failed to change password');
          this.saving = false;
        }
      });
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  hasRole(role: string): boolean {
    return this.authenticationService.hasRole(role);
  }
  private canEditCurrentContext(): boolean {
    if (this.isEditingOtherUser) {
      return this.isAdmin;
    } else {
      return (this.canEdit || this.isAdmin) && !this.isViewerOnly;
    }
  }

  get isFormDisabled(): boolean {
    return !this.canEditCurrentContext();
  }

  get displayUserName(): string {
    if (this.isEditingOtherUser && this.targetUser) {
      return `${this.targetUser.firstname} ${this.targetUser.lastname}`;
    }
    return 'My Settings';
  }

  get showPasswordTab(): boolean {
    return !this.isEditingOtherUser;
  }
}