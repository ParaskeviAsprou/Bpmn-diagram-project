// save-options-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
//import { FileManagementService } from '../../services/file-managemnet.service';


export interface SaveOptionsDialogData {
  currentFileName: string;
  hasUnsavedChanges: boolean;
  isNewFile?: boolean;
  fileContent?: string;
  currentFileId?: number;
}

export interface SaveOption {
  type: 'overwrite' | 'new-version' | 'new-file';
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-save-options-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatRadioModule
  ],
  templateUrl: './save-options-dialog.component.html',
  styleUrls: ['./save-options-dialog.component.css']
})
export class SaveOptionsDialogComponent implements OnInit {
  saveForm: FormGroup;
  saveOptions: SaveOption[] = [];
  suggestedFileName = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SaveOptionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SaveOptionsDialogData,
    //rivate fileService: FileManagementService
  ) {
    this.saveForm = this.fb.group({
      saveType: ['', Validators.required],
      fileName: [''],
      versionNotes: ['']
    });
  }

  ngOnInit(): void {
    this.initializeSaveOptions();
    this.setupFormValidation();
    this.generateSuggestedFileName();
  }

  private initializeSaveOptions(): void {
    if (this.data.isNewFile) {
      this.saveOptions = [
        {
          type: 'new-file',
          label: 'Save as New File',
          description: 'Create a new file with your changes',
          icon: 'note_add'
        }
      ];
      this.saveForm.patchValue({ saveType: 'new-file' });
    } else {
      this.saveOptions = [
        {
          type: 'overwrite',
          label: 'Overwrite Current File',
          description: 'Replace the current file with your changes. Previous version will be lost.',
          icon: 'save'
        },
        {
          type: 'new-version',
          label: 'Save as New Version',
          description: 'Keep the original file and create a new version with your changes.',
          icon: 'content_copy'
        },
        {
          type: 'new-file',
          label: 'Save as New File',
          description: 'Create a completely new file with your changes.',
          icon: 'note_add'
        }
      ];
    }
  }

  private setupFormValidation(): void {
    this.saveForm.get('saveType')?.valueChanges.subscribe(saveType => {
      const fileNameControl = this.saveForm.get('fileName');
      
      if (saveType === 'new-file') {
        fileNameControl?.setValidators([
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9\s\-_\.]+$/)
        ]);
        fileNameControl?.setValue(this.suggestedFileName);
      } else {
        fileNameControl?.clearValidators();
        fileNameControl?.setValue('');
      }
      
      fileNameControl?.updateValueAndValidity();
    });
  }

  private generateSuggestedFileName(): void {
    if (this.data.currentFileName) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const baseName = this.data.currentFileName.replace(/\.(bpmn|xml)$/, '');
      this.suggestedFileName = `${baseName}_copy_${timestamp}.bpmn`;
    } else {
      this.suggestedFileName = `new_diagram_${Date.now()}.bpmn`;
    }
  }

  getOptionIconClass(optionType: string): string {
    const baseClass = 'option-icon';
    switch (optionType) {
      case 'overwrite':
        return `${baseClass} overwrite`;
      case 'new-version':
        return `${baseClass} version`;
      case 'new-file':
        return `${baseClass} new-file`;
      default:
        return baseClass;
    }
  }

  getVersionNotesLength(): number {
    return this.saveForm.get('versionNotes')?.value?.length || 0;
  }

  getNewFileName(): string {
    const fileName = this.saveForm.get('fileName')?.value;
    return fileName || this.suggestedFileName;
  }

  getSaveButtonIcon(): string {
    const saveType = this.saveForm.get('saveType')?.value;
    switch (saveType) {
      case 'overwrite':
        return 'save';
      case 'new-version':
        return 'content_copy';
      case 'new-file':
        return 'note_add';
      default:
        return 'save';
    }
  }

  getSaveButtonText(): string {
    const saveType = this.saveForm.get('saveType')?.value;
    switch (saveType) {
      case 'overwrite':
        return 'Overwrite File';
      case 'new-version':
        return 'Save Version';
      case 'new-file':
        return 'Save New File';
      default:
        return 'Save';
    }
  }

  onSave(): void {
    // if (this.saveForm.valid) {
    //   const result: SaveOptionsResult = {
    //     saveType: this.saveForm.get('saveType')?.value,
    //     fileName: this.saveForm.get('fileName')?.value || undefined,
    //     versionNotes: this.saveForm.get('versionNotes')?.value || undefined
    //   };
      
    //   this.dialogRef.close(result);
    // }
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}