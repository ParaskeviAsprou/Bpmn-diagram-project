import { Component } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDialogModule} from '@angular/material/dialog';
@Component({
  selector: 'app-un-save-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDialogModule],
  templateUrl: './un-save-dialog.component.html',
  styleUrl: './un-save-dialog.component.css'
})
export class UnSaveDialogComponent {

}
