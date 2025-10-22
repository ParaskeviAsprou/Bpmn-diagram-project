import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthenticationService } from '../../services/authentication.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.css']
})
export class LogoutComponent implements OnInit {

  constructor(
    private authService: AuthenticationService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Component initialization
  }

  logout(): void {
    console.log('Logout button clicked');
    
    // Show notification
    this.notificationService.showSuccess('Successfully logged out!');
    
    // Use the simple logout method that doesn't require backend communication
    console.log('Calling authService.logoutLocal()');
    this.authService.logoutLocal();
    console.log('Logout completed');
  }
}
