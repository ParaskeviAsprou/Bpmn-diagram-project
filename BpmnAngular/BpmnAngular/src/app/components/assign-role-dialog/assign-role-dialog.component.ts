import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { User, Role } from '../../services/rbac.service';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatChip } from '@angular/material/chips';
import { MatChipsModule } from '@angular/material/chips';
import { MatListItemIcon } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { MatOption, MatSelect } from '@angular/material/select';
@Component({
  selector: 'app-assign-role-dialog',
  standalone: true,
  imports: [MatDialogActions,MatError,MatChip,
    MatDialogContent,MatIcon,MatFormField,MatSelect,
    MatOption,MatLabel,ReactiveFormsModule,MatChipsModule,MatListItemIcon,AssignRoleDialogComponent],
  templateUrl: './assign-role-dialog.component.html',
  styleUrl: './assign-role-dialog.component.css'
})
export class AssignRoleDialogComponent {
  assignForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AssignRoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User; availableRoles: Role[] }
  ) {
    this.assignForm = this.fb.group({
      roleName: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.assignForm.valid) {
      this.dialogRef.close(this.assignForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
