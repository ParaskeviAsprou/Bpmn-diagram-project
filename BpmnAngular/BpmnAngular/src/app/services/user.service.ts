
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role } from './role.service';
import { User } from './authentication.service';

export interface RoleTreeNode {
  role: Role;
  children: RoleTreeNode[];
}
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:8080/api/v1/users';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.API_URL);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`);
  }

  updateUserRoles(userId: number, roleNames: string[]): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/${userId}/roles`, roleNames);
  }

  assignRoleToUser(userId: number, roleName: string): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/assign-role`, null, {
      params: { userId: userId.toString(), roleName }
    });
  }

  removeRoleFromUser(userId: number, roleName: string): Observable<User> {
    return this.http.delete<User>(`${this.API_URL}/${userId}/roles/${roleName}`);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${userId}`);
  }
}
