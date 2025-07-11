// 
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { Group } from '../../services/rbac.service';
import { User } from '../../services/authentication.service';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-group-management',
  standalone: true,
  imports: [ BrowserModule,CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './group-management.component.html',
  styleUrls: ['./group-management.component.css'],

})
export class GroupManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  groups: Group[] = [];
  users: User[] = [];
  filteredAvailableUsers: User[] = [];
  groupMembers: User[] = [];
  
  loading = false;
  showCreateGroupModal = false;
  showEditGroupModal = false;
  showMembersModal = false;
  
  editingGroup: Group | null = null;
  selectedGroup: Group | null = null;
  userSearchTerm = '';
  
  groupFormData = {
    name: '',
    description: ''
  };

  constructor(
    private groupService: GroupService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    
    forkJoin({
      groups: this.groupService.getGroupsWithUserCount(),
      users: this.userService.getAllUsers()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.groups = data.groups.map(item => item.group);
        this.users = data.users;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading = false;
      }
    });
  }

  getUserCount(group: Group): number {
    // This would come from the backend API in a real implementation
    return Math.floor(Math.random() * 10) + 1;
  }

  editGroup(group: Group): void {
    this.editingGroup = group;
    this.groupFormData = {
      name: group.name,
      description: group.description || ''
    };
    this.showEditGroupModal = true;
  }

  deleteGroup(group: Group): void {
    if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      this.groupService.deleteGroup(group.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
          },
          error: (error) => {
            console.error('Error deleting group:', error);
            alert('Error deleting group: ' + error.message);
          }
        });
    }
  }

  manageMembers(group: Group): void {
    this.selectedGroup = group;
    this.loadGroupMembers(group.id);
    this.filterUsers();
    this.showMembersModal = true;
  }

  saveGroup(): void {
    if (this.editingGroup) {
      this.groupService.updateGroup(
        this.editingGroup.id,
        this.groupFormData.name,
        this.groupFormData.description
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadData();
          this.closeModals();
        },
        error: (error) => {
          console.error('Error updating group:', error);
          alert('Error updating group: ' + error.message);
        }
      });
    } else {
      this.groupService.createGroup(
        this.groupFormData.name,
        this.groupFormData.description
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadData();
          this.closeModals();
        },
        error: (error) => {
          console.error('Error creating group:', error);
          alert('Error creating group: ' + error.message);
        }
      });
    }
  }

  loadGroupMembers(groupId: number): void {
    // This would load actual group members from the API
    // For now, we'll mock some members
    this.groupMembers = this.users.slice(0, 3);
  }

  filterUsers(): void {
    this.filteredAvailableUsers = this.users.filter(user => {
      const matchesSearch = !this.userSearchTerm || 
        user.firstName.toLowerCase().includes(this.userSearchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.userSearchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }

  isUserInGroup(user: User): boolean {
    return this.groupMembers.some(member => member.id === user.id);
  }

  addUserToGroup(user: User): void {
    if (this.selectedGroup && !this.isUserInGroup(user)) {
      this.groupService.addUserToGroup(this.selectedGroup.id, user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.groupMembers.push(user);
          },
          error: (error) => {
            console.error('Error adding user to group:', error);
            alert('Error adding user to group: ' + error.message);
          }
        });
    }
  }

  removeUserFromGroup(user: User): void {
    if (this.selectedGroup) {
      this.groupService.removeUserFromGroup(this.selectedGroup.id, user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.groupMembers = this.groupMembers.filter(member => member.id !== user.id);
          },
          error: (error) => {
            console.error('Error removing user from group:', error);
            alert('Error removing user from group: ' + error.message);
          }
        });
    }
  }

  getUserInitials(user: User): string {
    return (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '');
  }

  getRoleBadgeClass(roleName: string): string {
    if (roleName.includes('ADMIN')) return 'admin';
    if (roleName.includes('MODELER')) return 'modeler';
    if (roleName.includes('VIEWER')) return 'viewer';
    return 'default';
  }

  closeModals(): void {
    this.showCreateGroupModal = false;
    this.showEditGroupModal = false;
    this.showMembersModal = false;
    this.editingGroup = null;
    this.selectedGroup = null;
    this.groupFormData = {
      name: '',
      description: ''
    };
    this.userSearchTerm = '';
  }
}
