import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FolderService } from '../../services/folder.service';
import { AuthenticationService } from '../../services/authentication.service';

export interface CreateFolderDialogData {
  parentFolderId: number | null;
  parentFolderName: string;
}

@Component({
  selector: 'app-create-folder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-folder-dialog.component.html',
  styleUrl: './create-folder-dialog.component.css'
})
export class CreateFolderDialogComponent implements OnInit {
  folderForm: FormGroup;
  isCreating = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private folderService: FolderService,
    private authService: AuthenticationService,
    public dialogRef: MatDialogRef<CreateFolderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateFolderDialogData
  ) {
    this.folderForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9\s\-_().]+$/) // Allow alphanumeric, spaces, and common symbols
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]]
    });

    console.log('CreateFolderDialog initialized with data:', this.data);
  }

  ngOnInit(): void {
    // Focus on the name field when dialog opens
    setTimeout(() => {
      const nameInput = document.querySelector('input[formControlName="name"]') as HTMLElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);

    console.log('Dialog ready - Parent folder:', this.data.parentFolderName);
  }

  onCancel(): void {
    console.log('Dialog cancelled by user');
    this.dialogRef.close(false);
  }

  onSubmit(): void {
    if (this.folderForm.valid && !this.isCreating) {
      this.isCreating = true;
      this.errorMessage = '';
      
      const formData = this.folderForm.value;
      const createdBy = this.authService.getCurrentUser()?.username || 'Unknown User';

      console.log('Submitting folder creation:', {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        parentFolderId: this.data.parentFolderId,
        createdBy: createdBy
      });

      // Create the folder directly in the dialog
      this.folderService.createFolder(
        formData.name.trim(),
        formData.description?.trim() || '',
        //this.data.parentFolderId,
        createdBy
      ).subscribe({
        next: (folder) => {
          console.log('✅ Folder created successfully in dialog:', folder);
          // Return true to indicate successful creation
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('❌ Error creating folder in dialog:', error);
          this.errorMessage = error.message || 'Failed to create folder';
          this.isCreating = false;
          // Don't close the dialog, let user see the error and try again
        }
      });
    } else {
      console.warn('Form is invalid or already creating');
      this.folderForm.markAllAsTouched();
    }
  }

  // =================== FORM HELPERS ===================

  get nameControl() {
    return this.folderForm.get('name');
  }

  get descriptionControl() {
    return this.folderForm.get('description');
  }

  getNameErrorMessage(): string {
    const control = this.nameControl;
    if (control?.hasError('required')) {
      return 'Folder name is required';
    }
    if (control?.hasError('minlength')) {
      return 'Folder name must be at least 1 character long';
    }
    if (control?.hasError('maxlength')) {
      return 'Folder name cannot exceed 100 characters';
    }
    if (control?.hasError('pattern')) {
      return 'Folder name contains invalid characters. Use letters, numbers, spaces, and basic symbols only.';
    }
    return '';
  }

  getDescriptionErrorMessage(): string {
    const control = this.descriptionControl;
    if (control?.hasError('maxlength')) {
      return 'Description cannot exceed 500 characters';
    }
    return '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      
      // If we're in the description textarea and Ctrl+Enter, submit
      if (event.target === document.querySelector('textarea[formControlName="description"]')) {
        if (event.ctrlKey) {
          this.onSubmit();
        }
        return;
      }
      
      // Otherwise, submit on Enter
      this.onSubmit();
    }
    
    // ESC key to cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }
  }

  // =================== UI STATE HELPERS ===================

  get canSubmit(): boolean {
    return this.folderForm.valid && !this.isCreating;
  }

  get submitButtonText(): string {
    if (this.isCreating) {
      return 'Creating...';
    }
    return 'Create Folder';
  }

  get dialogTitle(): string {
    if (this.data.parentFolderId) {
      return `Create Folder in "${this.data.parentFolderName}"`;
    }
    return 'Create New Folder';
  }

  clearError(): void {
    this.errorMessage = '';
  }
}