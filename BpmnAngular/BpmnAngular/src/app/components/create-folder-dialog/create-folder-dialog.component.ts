import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface CreateFolderDialogData {
  parentFolderId: number | null;
  parentFolderName: string;
}

export interface CreateFolderDialogResult {
  name: string;
  description: string;
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
    MatIconModule
  ],
  templateUrl: './create-folder-dialog.component.html',
  styleUrl: './create-folder-dialog.component.css'
})
export class CreateFolderDialogComponent implements OnInit {
  folderForm: FormGroup;
  isCreating = false;

  constructor(
    private fb: FormBuilder,
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
  }

  ngOnInit(): void {
    // Focus on the name field when dialog opens
    setTimeout(() => {
      const nameInput = document.querySelector('input[formControlName="name"]') as HTMLElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.folderForm.valid && !this.isCreating) {
      this.isCreating = true;
      
      const result: CreateFolderDialogResult = {
        name: this.folderForm.value.name.trim(),
        description: this.folderForm.value.description?.trim() || ''
      };

      setTimeout(() => {
        this.dialogRef.close(result);
      }, 300);
    } else {

      this.folderForm.markAllAsTouched();
    }
  }

  
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
      return 'Folder name contains invalid characters';
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
      if (event.target === document.querySelector('textarea[formControlName="description"]')) {
        if (event.ctrlKey) {
          this.onSubmit();
        }
        return;
      }
      this.onSubmit();
    }
  }
}