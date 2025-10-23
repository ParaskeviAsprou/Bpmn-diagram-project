import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FolderService } from '../../services/folder.service';
import { AuthenticationService } from '../../services/authentication.service';

export interface CreateFolderDialogData {
  title?: string;
  message?: string;
  folderName?: string;
  description?: string;
}

export interface CreateFolderDialogResult {
  success: boolean;
  folder?: any;
  error?: string;
}

@Component({
  selector: 'app-create-folder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './create-folder-dialog.component.html',
  styleUrl: './create-folder-dialog.component.css'
})
export class CreateFolderDialogComponent implements OnInit {
  folderName: string = '';
  description: string = '';
  isCreating: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<CreateFolderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateFolderDialogData,
    private folderService: FolderService,
    private authService: AuthenticationService,
    private snackBar: MatSnackBar
  ) {
    // Initialize with provided data
    this.folderName = data.folderName || '';
    this.description = data.description || '';
  }

  ngOnInit(): void {
    // Focus on the folder name input
    setTimeout(() => {
      const nameInput = document.querySelector('#folderName') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  onCreateFolder(): void {
    if (!this.folderName.trim()) {
      this.showNotification('Folder name is required', 'error');
      return;
    }

    if (this.folderName.trim().length < 2) {
      this.showNotification('Folder name must be at least 2 characters long', 'error');
      return;
    }

    this.isCreating = true;
    const currentUser = this.authService.getCurrentUser();
    const createdBy = currentUser?.username || 'anonymous';

    this.folderService.createFolder(
      this.folderName.trim(),
      this.description.trim(),
      createdBy
    ).subscribe({
      next: (folder) => {
        this.showNotification('Folder created successfully', 'success');
        this.dialogRef.close({ 
          success: true, 
          folder: folder 
        });
      },
      error: (error) => {
        console.error('Error creating folder:', error);
        this.showNotification('Error creating folder: ' + error.message, 'error');
        this.isCreating = false;
      }
    });
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // Validation methods
  isFolderNameValid(): boolean {
    return this.folderName.trim().length >= 2;
  }

  getFolderNameError(): string {
    if (!this.folderName.trim()) {
      return 'Folder name is required';
    }
    if (this.folderName.trim().length < 2) {
      return 'Folder name must be at least 2 characters long';
    }
    return '';
  }

  canCreate(): boolean {
    return this.isFolderNameValid() && !this.isCreating;
  }
}