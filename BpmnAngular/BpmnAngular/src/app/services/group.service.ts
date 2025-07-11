
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
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private readonly API_URL = 'http://localhost:8080/api/v1/groups';

  constructor(private http: HttpClient) {}

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.API_URL);
  }

  getGroupsWithUserCount(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/with-user-count`);
  }

  createGroup(name: string, description: string): Observable<Group> {
    return this.http.post<Group>(this.API_URL, { name, description });
  }

  updateGroup(id: number, name: string, description: string): Observable<Group> {
    return this.http.put<Group>(`${this.API_URL}/${id}`, { name, description });
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }

  addUserToGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.post<Group>(`${this.API_URL}/${groupId}/users/${userId}`, {});
  }

  removeUserFromGroup(groupId: number, userId: number): Observable<Group> {
    return this.http.delete<Group>(`${this.API_URL}/${groupId}/users/${userId}`);
  }

  addUsersToGroup(groupId: number, userIds: number[]): Observable<Group> {
    return this.http.post<Group>(`${this.API_URL}/${groupId}/users`, userIds);
  }

  searchGroups(query: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.API_URL}/search`, { params: { q: query } });
  }
}