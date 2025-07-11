
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { Role } from '../../services/rbac.service';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-create-hierarchy-dialog',
  standalone: true,
  imports: [MatFormField,MatLabel,MatSelect,MatOption,MatError,MatIcon,MatDialogActions,MatHint,MatDialogContent,ReactiveFormsModule],
  templateUrl: './create-hierarchy-dialog.component.html',
  styleUrl: './create-hierarchy-dialog.component.css'
})
export class CreateHierarchyDialogComponent implements OnInit {
  hierarchyForm: FormGroup;
  availableChildRoles: Role[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateHierarchyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { roles: Role[] }
  ) {
    this.hierarchyForm = this.fb.group({
      parentRoleId: ['', Validators.required],
      childRoleId: ['', Validators.required],
      hierarchyLevel: [1, [Validators.required, Validators.min(1), Validators.max(10)]]
    });
  }

  ngOnInit() {
    // Initially show all roles as potential children
    this.availableChildRoles = [...this.data.roles];

    // Update available child roles when parent is selected
    this.hierarchyForm.get('parentRoleId')?.valueChanges.subscribe(parentId => {
      this.updateAvailableChildRoles(parentId);
    });
  }

  updateAvailableChildRoles(parentId: number) {
    // Exclude the selected parent role from child options
    this.availableChildRoles = this.data.roles.filter(role => role.id !== parentId);
    
    // Reset child selection if it's no longer valid
    const currentChildId = this.hierarchyForm.get('childRoleId')?.value;
    if (currentChildId === parentId) {
      this.hierarchyForm.get('childRoleId')?.setValue('');
    }
  }

  onSubmit() {
    if (this.hierarchyForm.valid) {
      this.dialogRef.close(this.hierarchyForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}