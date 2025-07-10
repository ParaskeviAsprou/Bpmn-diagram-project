
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface Group {
  id: number;
  name: string;
  description: string;
  createdBy: string;
  uploadTime: string;
  isActive: boolean;
  users: any[];
}

export interface GroupInfo {
  group: Group;
  userCount: number;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
}

export interface UpdateGroupRequest {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
   private apiUrl = 'http://localhost:8080/api/v1/file';

  constructor(private http: HttpClient) {}

  // Group CRUD operations
  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}`);
  }

  getGroupsWithUserCount(): Observable<GroupInfo[]> {
    return this.http.get<GroupInfo[]>(`${this.apiUrl}/with-user-count`);
  }

  createGroup(request: CreateGroupRequest): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}`, request);
  }

  updateGroup(groupId: number, request: UpdateGroupRequest): Observable<Group> {
    return this.http.put<Group>(`${this.apiUrl}/${groupId}`, request);
  }

  deleteGroup(groupId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/delete/${groupId}`);
  }

  // User management within groups
  addUserToGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/${groupId}/users/${userId}`, {});
  }

  removeUserFromGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.delete<Group>(`${this.apiUrl}/${groupId}/users/${userId}`);
  }

  addUsersToGroup(groupId: number, userIds: number[]): Observable<Group> {
    return this.http.post<Group>(`${this.apiUrl}/${groupId}/users`, userIds);
  }

  // Search and filter
  searchGroups(query: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/search`, { params: { q: query } });
  }

  getMyGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/my-groups`);
  }
}